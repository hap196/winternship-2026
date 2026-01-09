import asyncio
from typing import Any, Dict, List

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client 

class MCPToolClient:
    def __init__(self, mcp_url: str):
        self.mcp_url = mcp_url

    async def list_tools_async(self) -> List[Dict[str, Any]]:
        async with streamablehttp_client(self.mcp_url) as (r, w, _):
            async with ClientSession(r, w) as session:
                await session.initialize()
                resp = await session.list_tools()
                # resp.tools is list of tool objects with name/description/inputSchema
                tools = []
                for t in resp.tools:
                    tools.append({
                        "name": t.name,
                        "description": t.description,
                        "inputSchema": t.inputSchema,
                    })
                return tools
            
    async def call_tool_async(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        async with streamablehttp_client(self.mcp_url) as (r, w, _):
            async with ClientSession(r, w) as session:
                await session.initialize()
                result = await session.call_tool(name=name, arguments=arguments)

                text_parts = []
                for item in result.content:
                    if hasattr(item, "text") and item.text:
                        text_parts.append(item.text)

                return {
                    "text": "\n".join(text_parts).strip(),
                    "raw": result.model_dump() if hasattr(result, "model_dump") else str(result),
                }

def run_async(coro):
    """sync Flask routes can call async MCP code"""
    return asyncio.run(coro)