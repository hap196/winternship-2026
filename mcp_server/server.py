from __future__ import annotations

from mcp.server.fastmcp import FastMCP
from .tools.stats import initialize_stats_tools
from .tools.visual import initialize_visual_tools


mcp = FastMCP("eoe-tools", stateless_http=True, json_response=True)


@mcp.tool()
def ping() -> dict:
    """Health check"""

    return {"status": "ok"}

@mcp.tool()
def echo(message: str) -> str:
    """Debugging"""

    return f"echo: {message}"

#init tools
initialize_stats_tools(mcp)
initialize_visual_tools(mcp)

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
