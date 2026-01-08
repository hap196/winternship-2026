import os
import json
from typing import Any, Dict, List, Tuple

from openai import OpenAI
from mcp_client import MCPToolClient, run_async

client = OpenAI()

def mcp_tools_to_openai_tools(mcp_tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    OpenAI Chat Completions tool format uses:
      {"type":"function","function":{"name":..., "description":..., "parameters":...}}
    """
    out = []
    for t in mcp_tools:
        out.append({
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t.get("description") or "",
                "parameters": t.get("inputSchema") or {"type": "object", "properties": {}},
            }
        })
    return out

def run_chat_with_tools(messages: List[Dict[str, Any]], mcp_url: str, max_tool_calls: int = 6) -> Tuple[str, List[Dict[str, Any]]]:
    mcp = MCPToolClient(mcp_url)

    #get tool catalog from MCP
    mcp_tools = run_async(mcp.list_tools_async())
    openai_tools = mcp_tools_to_openai_tools(mcp_tools)

    #tool loop
    for _ in range(max_tool_calls):
        resp = client.chat.completions.create(
            model=_get_model(),
            messages=messages,
            tools=openai_tools,
            tool_choice="auto",
        )

        msg = resp.choices[0].message
        tool_calls = [tc.model_dump() for tc in (msg.tool_calls or [])]

        assistant_msg = {"role": msg.role, "content": msg.content}
        if tool_calls:
            assistant_msg["tool_calls"] = tool_calls
        messages.append(assistant_msg)

        #if no tool calls -> done
        if not msg.tool_calls:
            return (msg.content or "", messages)

        #execute tool call
        for tc in msg.tool_calls:
            tool_name = tc.function.name
            tool_args = json.loads(tc.function.arguments or "{}")

            tool_result = run_async(mcp.call_tool_async(tool_name, tool_args))

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "name": tool_name,
                "content": json.dumps(tool_result),
            })

    return ("I hit the max tool-call rounds; try simplifying the request.", messages)

def _get_model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")