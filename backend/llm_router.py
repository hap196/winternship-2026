import os
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Tuple

from openai import OpenAI
from mcp_client import MCPToolClient, run_async

# Setup logging
logging.basicConfig(
    filename='mcp_debug.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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

def run_chat_with_tools(messages: List[Dict[str, Any]], mcp_url: str, max_tool_calls: int = 12) -> Tuple[str, List[Dict[str, Any]]]:
    logger.info(f"Starting chat with {len(messages)} messages, max_tool_calls={max_tool_calls}")
    
    mcp = MCPToolClient(mcp_url)

    #get tool catalog from MCP
    mcp_tools = run_async(mcp.list_tools_async())
    openai_tools = mcp_tools_to_openai_tools(mcp_tools)
    logger.info(f"Loaded {len(mcp_tools)} MCP tools")

    #tool loop
    for round_num in range(max_tool_calls):
        logger.info(f"=== Round {round_num + 1}/{max_tool_calls} ===")
        
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
            logger.info(f"No tool calls - response complete. Content length: {len(msg.content or '')}")
            return (msg.content or "", messages)

        #execute tool call
        logger.info(f"Calling {len(msg.tool_calls)} tool(s):")
        for tc in msg.tool_calls:
            tool_name = tc.function.name
            tool_args = json.loads(tc.function.arguments or "{}")
            logger.info(f"  Tool: {tool_name}")
            logger.info(f"  Args: {json.dumps(tool_args, indent=2)}")

            tool_result = run_async(mcp.call_tool_async(tool_name, tool_args))
            result_str = str(tool_result)
            logger.info(f"  Result (first 500 chars): {result_str[:500]}")
            if len(result_str) > 500:
                logger.info(f"  ... (result truncated, total length: {len(result_str)})")

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "name": tool_name,
                "content": json.dumps(tool_result),
            })

    logger.warning(f"Hit max tool-call rounds ({max_tool_calls})")
    return ("I hit the max tool-call rounds; try simplifying the request.", messages)

def _get_model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")