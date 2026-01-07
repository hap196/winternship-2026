from __future__ import annotations

from typing import Literal
import numpy as np
from scipy.stats import mannwhitneyu
from statsmodels.stats.multitest import multipletests

def register_stats_tools(mcp):

    @mcp.tool()
    def gene_to_programs(gene: str, program_genes: dict[str, list[str]]) -> list[str]:
        """
        Lookup of gene in programs
        """
        g = gene.upper()
        hits = []
        for program, genes in program_genes.items():
            if any(g == str(x).upper() for x in genes):
                hits.append(program)
        return hits

    @mcp.tool()
    def jaccard_topk(target_program: str, program_genes: dict[str, list[str]], top_k: int = 20) -> list[dict]:
        """Jaccard similarity by overlap of gene sets"""

        if target_program not in program_genes:
            return [{"error": f"Unknown target_program: {target_program}"}]

        a = {str(x).upper() for x in program_genes[target_program]}
        
        rows = []
        for other, genes in program_genes.items():
            if other == target_program:
                continue
            
            b = {str(x).upper() for x in genes}
            inter = len(a & b)
            union = len(a | b)
            
            rows.append({"program": other, "jaccard": (inter / union) if union else 0.0})

        rows.sort(key=lambda r: r["jaccard"], reverse=True)
        return rows[:top_k]

    @mcp.tool()
    def correlation_matrix(
        program_names: list[str],
        activity_by_program: list[list[float]],
    ) -> dict:
        """
        activity_by_program: shape [P][N] (P programs, N cells/samples)
        Returns a P x P correlation matrix.
        """
        X = np.asarray(activity_by_program, dtype=float)
        corr = np.corrcoef(X)
        return {"programs": program_names, "corr": corr.tolist()}

    @mcp.tool()
    def wilcoxon_rank_programs(
        program_names: list[str],
        group_a_values: list[list[float]],
        group_b_values: list[list[float]],
        alternative: Literal["two-sided", "greater", "less"] = "two-sided",
        fdr_method: Literal["fdr_bh"] = "fdr_bh",
        top_k: int = 30,
    ) -> dict:
        """
        Rank programs enriched in group A vs group B using Mann–Whitney U
        (common implementation of Wilcoxon rank-sum).

        Inputs:
          - program_names: [P]
          - group_a_values: [P][Na]
          - group_b_values: [P][Nb]
        """
        P = len(program_names)
        if len(group_a_values) != P or len(group_b_values) != P:
            return {"error": "Shape mismatch: program_names, group_a_values, group_b_values must share P"}

        pvals = []
        rows = []
        for i, pname in enumerate(program_names):
            a = np.asarray(group_a_values[i], dtype=float)
            b = np.asarray(group_b_values[i], dtype=float)

            if a.size < 3 or b.size < 3:
                stat, p = 0.0, 1.0
                med_diff = float(np.nan)
            else:
                stat, p = mannwhitneyu(a, b, alternative=alternative)
                med_diff = float(np.median(a) - np.median(b))

            pvals.append(p)
            rows.append({
                "program": pname,
                "u_stat": float(stat),
                "p_value": float(p),
                "median_diff": med_diff,
                "n_a": int(a.size),
                "n_b": int(b.size),
            })

        _, qvals, _, _ = multipletests(pvals, method=fdr_method)
        for r, q in zip(rows, qvals):
            r["q_value"] = float(q)

        rows.sort(key=lambda r: r["q_value"])
        return {"results": rows[:top_k]}
