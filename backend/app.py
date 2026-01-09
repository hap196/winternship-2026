import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from llm_router import run_chat_with_tools, generate_conversation_title

load_dotenv()

app = Flask(__name__)
CORS(app)

MCP_URL = os.getenv("MCP_URL", "http://localhost:8000/mcp")

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/api/chat")
def chat():
    body = request.get_json(force=True)
    messages = body.get("messages", [])
    model = body.get("model")
    dataset_info = body.get("datasetInfo") or body.get("dataset_info")

    if not messages:
        return jsonify({"error": "messages is required"}), 400

    final_text, updated_messages = run_chat_with_tools(messages, mcp_url=MCP_URL, model=model, dataset_info=dataset_info,)
    return jsonify({
        "assistant": final_text,
        "messages": updated_messages,
    })


@app.post("/api/title")
def title():
    body = request.get_json(force=True)
    first_message = (body.get("firstMessage") or "").strip()
    title = generate_conversation_title(first_message)
    return jsonify({"title": title})