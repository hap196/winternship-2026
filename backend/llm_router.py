import os
import json
import logging
import re
import string
from typing import Any, Dict, List, Tuple, Optional
from system_prompts.title import TITLE_SYSTEM_PROMPT
from system_prompts.chat import build_chat_system_prompt

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

def _inject_system_prompt(messages: List[Dict[str, Any]], dataset_info: Optional[str]) -> List[Dict[str, Any]]:
    system_prompt = build_chat_system_prompt(dataset_info)

    if messages and messages[0].get("role") == "system":
        messages[0]["content"] = system_prompt
        return messages

    return [{"role": "system", "content": system_prompt}] + messages


def run_chat_with_tools(
        messages: List[Dict[str, Any]], 
        mcp_url: str, max_tool_calls: int = 12,
        model: Optional[str] = None,
        dataset_info: Optional[str] = None,
        ) -> Tuple[str, List[Dict[str, Any]]]:
    logger.info(f"Starting chat with {len(messages)} messages, max_tool_calls={max_tool_calls}")
    messages = _inject_system_prompt(messages, dataset_info)

    mcp = MCPToolClient(mcp_url)

    #get tool catalog from MCP
    mcp_tools = run_async(mcp.list_tools_async())
    openai_tools = mcp_tools_to_openai_tools(mcp_tools)
    logger.info(f"Loaded {len(mcp_tools)} MCP tools")

    #tool loop
    for round_num in range(max_tool_calls):
        logger.info(f"=== Round {round_num + 1}/{max_tool_calls} ===")
        
        resp = client.chat.completions.create(
            model=model or _get_model(),
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
    return os.getenv("OPENAI_MODEL", "gpt-5.1")


def _title_fallback(first_message: str) -> str:
    first_line = (first_message or "").split("\n")[0].strip()
    if not first_line:
        return "New chat"
    title = first_line[:50]
    return f"{title}..." if len(first_line) > 50 else title

def _sanitize_title(title: str, max_words: int = 3, max_chars: int = 60) -> str:
    t = (title or "").strip()

    # Remove surrounding quotes
    t = t.strip("\"'“”‘’`")

    # Remove punctuation anywhere (keep spaces + alphanumerics)
    t = t.translate(str.maketrans("", "", string.punctuation))

    # Collapse whitespace
    t = re.sub(r"\s+", " ", t).strip()

    # Cap words
    words = t.split(" ")
    t = " ".join(words[:max_words])

    # Cap chars
    if len(t) > max_chars:
        t = t[:max_chars].rstrip()

    return t

def generate_conversation_title(first_message: str, model: Optional[str] = None) -> str:
    """
    Generate a short conversation title for the first user message.
    """
    first_message = (first_message or "").strip()
    fallback = _title_fallback(first_message)

    if not first_message:
        return fallback

    try:
        resp = client.chat.completions.create(
                model=model or _get_model(),
                messages=[
                    {"role": "system", "content": TITLE_SYSTEM_PROMPT},
                    {"role": "user", "content": f'Generate a title for a conversation that starts with: "{first_message}"'},
                ],
                temperature=0.7,
                max_completion_tokens=15,
            )
        raw = (resp.choices[0].message.content or "").strip()

        title = _sanitize_title(raw)

        if not title:
            return fallback

        return title

    except Exception as e:
        logger.exception(f"Title generation failed: {e}")
        return fallback
