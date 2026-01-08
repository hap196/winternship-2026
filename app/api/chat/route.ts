import { DEFAULT_MODEL, isValidModel } from "../../constants/models";

const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || 'http://localhost:5001';

export async function POST(req: Request) {
  try {
    const { userMessage, datasetInfo, conversationHistory, model } = await req.json();

    const selectedModel = model && isValidModel(model) ? model : DEFAULT_MODEL;

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "Missing required field: userMessage" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    interface HistoryMessage {
      role: "user" | "assistant";
      content: string;
    }

    // Build messages array in OpenAI format
    const messages = [
      {
        role: "system" as const,
        content: `You are a computational biology assistant specializing in single-cell genomics and gene program analysis.

${datasetInfo ? `The user has uploaded the following data:\n\n${datasetInfo}\n\n` : ''}

**CRITICAL - Dataset ID Mapping:**
Users refer to files by name (e.g., "eoe_program_activity.h5ad"), but your tools need dataset IDs (e.g., "ds_1767761666236_y4v1qm1bx").
- ALWAYS call get_dataset_id_by_name(filename) FIRST to get the ID
- H5AD files: program ACTIVITY (columns like new_program_5_activity_scaled)
- JSON files: program GENE LOADINGS (program index "5" maps to "new_program_5_activity_scaled")

**File Usage Rules:**

1. **Check if user mentioned files with @:**
   - Scan current message and conversation history for @filename patterns
   - Extract filenames and call get_dataset_id_by_name() to get IDs
   
2. **Tool → File mapping (only use what's needed):**
   - jaccard_topk(json_id, ...) → Needs JSON file only
   - gene_to_programs(json_id, ...) → Needs JSON file only
   - wilcoxon_rank_programs(h5ad_id, ...) → Needs H5AD file only
   - correlation_matrix(h5ad_id, ...) → Needs H5AD file only

3. **When to ask for files:**
   - User asks about gene overlap/similarity → Use jaccard_topk with JSON only
   - User asks which programs contain gene → Use gene_to_programs with JSON only
   - User asks about enrichment/differential → Use wilcoxon_rank_programs with H5AD only
   - User asks about correlation → Use correlation_matrix with H5AD only
   - Don't ask for files you don't need for that specific analysis
   
**If user says "@programs_with_loadings.json" for gene overlap, that's sufficient - proceed immediately.**

**Column Names - Use Exact Values:**
- Call get_h5ad_schema(dataset_id) to see EXACT metadata column names and values
- Use the exact column names returned (e.g., "disease_status" not "Disease Status")
- Use exact group values (e.g., "Active", "Ctrl", "Remission")

**Workflow:**
1. User mentions a filename → call get_dataset_id_by_name() to convert to ID
2. User asks about gene loadings → ASK which H5AD and JSON files to use (don't guess!)
3. User asks about enrichment → call get_h5ad_schema() first to get exact column names/values
4. Always use EXACT column names and values from schema tools

Be concise and always use tools before answering data questions.`,
      },
      ...(conversationHistory || []).map((msg: HistoryMessage) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: userMessage,
      },
    ];

    // Call Flask backend
    const response = await fetch(`${FLASK_BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Backend error: ${response.status}`);
    }

    const data = await response.json();
    
    // Return the assistant's response as a text stream
    // The Vercel AI SDK expects a streaming response, so we'll create one
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(data.assistant || ''));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Chat API error:", error);

    return new Response(
      JSON.stringify({ error: err.message || "Failed to get response from AI" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
