from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file in project root
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from mcp.server.fastmcp import FastMCP
from .tools.stats import register_stats_tools
from .tools.visual import register_viz_tools
from .tools.annotation import register_annotation_tools


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
register_stats_tools(mcp)
register_viz_tools(mcp)
register_annotation_tools(mcp)

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
