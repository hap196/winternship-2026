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
      body: JSON.stringify({ messages, model: selectedModel, datasetInfo: datasetInfo}),
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
