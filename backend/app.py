import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from llm_router import run_chat_with_tools

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
    if not messages:
        return jsonify({"error": "messages is required"}), 400

    final_text, updated_messages = run_chat_with_tools(messages, mcp_url=MCP_URL)
    return jsonify({
        "assistant": final_text,
        "messages": updated_messages,
    })