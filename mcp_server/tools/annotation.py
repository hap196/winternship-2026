from __future__ import annotations

import os
import json
from typing import Optional
from openai import OpenAI

# Global in-memory cache for annotations
_annotation_cache: dict[str, dict] = {}

def register_annotation_tools(mcp):
    """Initialize program annotation tools"""

    @mcp.tool()
    def annotate_program(
        program_name: str,
        genes: list[str],
        activity_stats: Optional[dict] = None,
        top_cell_types: Optional[list[str]] = None,
        force_refresh: bool = False
    ) -> dict:
        """
        Annotate a gene program with a human-readable name, description, and category.
        Results are cached in memory for fast repeated lookups.

        Args:
            program_name: The original program identifier (e.g., "new_program_42")
            genes: List of gene symbols in the program
            activity_stats: Optional dict with stats like {"mean": 0.5, "std": 0.2, "median": 0.4}
            top_cell_types: Optional list of cell types where this program is highly active
            force_refresh: If True, bypass cache and regenerate annotation (default: False)

        Returns:
            dict with fields: program, name, description, category, confidence, cached
        """

        # Check cache first (unless force_refresh is True)
        if not force_refresh and program_name in _annotation_cache:
            cached_result = _annotation_cache[program_name].copy()
            cached_result["cached"] = True
            return cached_result

        # Check for API key
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return {
                "error": "OPENAI_API_KEY environment variable not set",
                "program": program_name
            }

        if not genes or len(genes) == 0:
            return {
                "error": "No genes provided",
                "program": program_name
            }

        # Build the prompt
        gene_list = ", ".join(genes[:50])  # Limit to first 50 genes for token efficiency
        if len(genes) > 50:
            gene_list += f" ... ({len(genes) - 50} more genes)"

        prompt = f"""You are a computational biology expert analyzing a gene program from single-cell genomics data.

Gene Program: {program_name}
Genes ({len(genes)} total): {gene_list}"""

        if activity_stats:
            prompt += f"\n\nActivity Statistics:\n{json.dumps(activity_stats, indent=2)}"

        if top_cell_types:
            prompt += f"\n\nTop Cell Types (where highly active): {', '.join(top_cell_types)}"

        prompt += """

Please analyze these genes and provide:
1. **name**: A short, descriptive name (2-5 words) that captures what these genes do together
2. **description**: A 1-2 sentence biological description of the program's function
3. **category**: Choose ONE from:
   - "broadly-expressed": Active across many/all cell types
   - "cell-type-specific": Specific to one or few cell types
   - "pathway-specific": Represents a specific biological pathway
   - "tissue-specific": Related to tissue function
   - "response-program": Related to cellular response (immune, stress, etc.)
4. **confidence**: "high", "medium", or "low" based on gene list coherence

Return ONLY a valid JSON object with these exact fields (no markdown, no extra text):
{"name": "...", "description": "...", "category": "...", "confidence": "..."}"""

        try:
            client = OpenAI(api_key=api_key)

            response = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-5.1"),
                messages=[
                    {"role": "system", "content": "You are a computational biology expert. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            # Parse the response
            content = response.choices[0].message.content.strip()

            # Remove markdown code blocks if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            annotation = json.loads(content)

            # Add the original program name
            annotation["program"] = program_name

            # Validate required fields
            required_fields = ["name", "description", "category", "confidence"]
            for field in required_fields:
                if field not in annotation:
                    annotation[field] = "unknown"

            # Cache the result
            _annotation_cache[program_name] = annotation.copy()

            # Mark as not from cache
            annotation["cached"] = False
            return annotation

        except json.JSONDecodeError as e:
            return {
                "error": f"Failed to parse JSON response: {str(e)}",
                "program": program_name,
                "raw_response": content if 'content' in locals() else None
            }
        except Exception as e:
            return {
                "error": f"Failed to annotate program: {str(e)}",
                "program": program_name
            }

    @mcp.tool()
    def annotate_programs_batch(
        programs: list[dict],
        force_refresh: bool = False
    ) -> list[dict]:
        """
        Annotate multiple gene programs at once.

        Args:
            programs: List of dicts, each with keys: program_name, genes,
                     and optionally activity_stats and top_cell_types
            force_refresh: If True, bypass cache for all programs (default: False)

        Returns:
            list of annotation dicts
        """
        results = []
        for prog in programs:
            result = annotate_program(
                program_name=prog.get("program_name"),
                genes=prog.get("genes", []),
                activity_stats=prog.get("activity_stats"),
                top_cell_types=prog.get("top_cell_types"),
                force_refresh=force_refresh
            )
            results.append(result)

        return results

    @mcp.tool()
    def get_annotation_cache_stats() -> dict:
        """
        Get statistics about the annotation cache.

        Returns:
            dict with cache size and list of cached program names
        """
        return {
            "cache_size": len(_annotation_cache),
            "cached_programs": list(_annotation_cache.keys())
        }

    @mcp.tool()
    def get_cached_annotation(program_name: str) -> dict:
        """
        Retrieve a cached annotation without making an API call.

        Args:
            program_name: The program identifier to look up

        Returns:
            dict with cached annotation or error if not found
        """
        if program_name in _annotation_cache:
            result = _annotation_cache[program_name].copy()
            result["cached"] = True
            return result
        else:
            return {
                "error": f"No cached annotation found for {program_name}",
                "program": program_name
            }

    @mcp.tool()
    def clear_annotation_cache(program_name: Optional[str] = None) -> dict:
        """
        Clear the annotation cache.

        Args:
            program_name: If provided, clear only this program. If None, clear all.

        Returns:
            dict with confirmation message
        """
        if program_name:
            if program_name in _annotation_cache:
                del _annotation_cache[program_name]
                return {
                    "message": f"Cleared cache for {program_name}",
                    "cache_size": len(_annotation_cache)
                }
            else:
                return {
                    "error": f"No cached annotation found for {program_name}",
                    "cache_size": len(_annotation_cache)
                }
        else:
            count = len(_annotation_cache)
            _annotation_cache.clear()
            return {
                "message": f"Cleared all {count} cached annotations",
                "cache_size": 0
            }
