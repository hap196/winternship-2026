import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { DEFAULT_MODEL, isValidModel } from "../../constants/models";

const CHART_PROMPT = `
CHART GENERATION:
When the user asks for a chart, graph, visualization, or plot, you MUST output a special JSON block.
Use this exact format (the markers are required):

\`\`\`chart
{
  "type": "bar" | "line" | "pie" | "area" | "composed",
  "title": "Chart Title",
  "data": [
    { "label": "Category A", "value": 100, "count": 5 },
    { "label": "Category B", "value": 200, "count": 10 }
  ],
  "xAxisKey": "label",
  "yAxisLabel": "Primary Axis Label",
  "secondaryYAxisLabel": "Secondary Axis Label",
  "series": [
    { "name": "Revenue", "dataKey": "value", "type": "bar", "color": "#3b82f6", "yAxisId": "left" },
    { "name": "Count", "dataKey": "count", "type": "line", "color": "#ef4444", "yAxisId": "right" }
  ],
  "showLegend": true,
  "showGrid": true
}
\`\`\`
`;

const createSystemPrompt = (csvData: string): string => {
  return `
You are a computational biology assistant specializing in single-cell genomics and gene program analysis.

${csvData ? `The user has uploaded the following data:\n\n${csvData}\n\n` : ''}

**Data Types You Work With:**
- Program activity files (h5ad format with cells × programs)
- Gene program loadings (gene membership in programs)
- Cell-level metadata (disease_status, sex, cell_type, etc.)

**Your Role:**
You help users understand and explore their single-cell genomics data by:
1. Interpreting analysis results and explaining biological significance
2. Guiding users through appropriate analyses for their questions
3. Visualizing results in clear, publication-ready formats
4. Providing biological context and insights

**Available Analysis Tools (via MCP):**
When users ask questions, you have access to specialized tools for:
- Program summarization and naming
- Cell-type specificity classification
- Enrichment analysis (disease status, sex, cell type)
- Gene lookup in programs
- Program similarity analysis (Jaccard similarity, correlation)
- Statistical testing (Wilcoxon rank-sum, etc.)

**Communication Style:**
- Use precise biological terminology when appropriate
- Explain statistical results clearly (p-values, effect sizes, significance)
- Present results in markdown tables and organized formats
- Reference genes, programs, and conditions clearly
- Suggest appropriate analyses based on user questions

${CHART_PROMPT}

**Common Visualizations:**
- Box-and-whisker plots for program activity comparisons (mark significance with *)
- Histograms for gene overlap distributions
- Heatmaps for program-program correlations
- All plots should be properly labeled with clear axes and legends

Note: Program activities are often scaled by program size and may need normalization for certain analyses.
`;
};

export async function POST(req: Request) {
  try {
    const { userMessage, datasetInfo, conversationHistory, model, images } =
      await req.json();

    console.log('Chat API Request:', {
      userMessageLength: userMessage?.length,
      datasetInfoSize: datasetInfo?.length,
      conversationLength: conversationHistory?.length,
      model
    });

    const selectedModel = model && isValidModel(model) ? model : DEFAULT_MODEL;

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured on server" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!userMessage) {
      return new Response(
        JSON.stringify({
          error: "Missing required field: userMessage",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    interface HistoryMessage {
      role: "user" | "assistant";
      content: string;
      images?: string[];
    }

    const messages = [
      {
        role: "system" as const,
        content: createSystemPrompt(datasetInfo || ''),
      },
      ...(conversationHistory || []).map((msg: HistoryMessage) => {
        if (msg.images && msg.images.length > 0) {
          return {
            role: msg.role as "user" | "assistant",
            content: [
              { type: "text", text: msg.content },
              ...msg.images.map((image: string) => ({
                type: "image",
                image: image,
              })),
            ],
          };
        }
        return {
          role: msg.role as "user" | "assistant",
          content: msg.content,
        };
      }),
      images && images.length > 0
        ? {
            role: "user" as const,
            content: [
              { type: "text", text: userMessage },
              ...images.map((image: string) => ({
                type: "image",
                image: image,
              })),
            ],
          }
        : {
            role: "user" as const,
            content: userMessage,
          },
    ];

    const result = await streamText({
      model: openai(selectedModel),
      messages,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Chat API error:", error);

    return new Response(
      JSON.stringify({
        error: err.message || "Failed to get response from AI",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

