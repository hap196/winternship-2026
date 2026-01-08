from __future__ import annotations

from typing import Literal
import numpy as np
from scipy.stats import mannwhitneyu
from statsmodels.stats.multitest import multipletests
from .data import _load_h5ad, _load_json

def register_stats_tools(mcp):

    @mcp.tool()
    def gene_to_programs(json_id: str, gene: str) -> dict:
        """
        Lookup of gene in programs
        """
        data = _load_json(json_id)
        if data is None:
            return {"gene": gene, "found": False, "programs": []}
        
        g = gene.upper()
        hits = []
        for prog_idx, prog_data in data.items():
            if isinstance(prog_data, dict) and "loadings" in prog_data:
                genes_in_prog = [str(x).upper() for x in prog_data["loadings"].keys()]
                if g in genes_in_prog:
                    loading = float(prog_data["loadings"].get(gene, 0) or prog_data["loadings"].get(g, 0))
                    hits.append({
                        "program": prog_idx,
                        "h5ad_column": f"new_program_{prog_idx}_activity_scaled",
                        "loading": loading
                    })
        
        hits.sort(key=lambda x: abs(x["loading"]), reverse=True)
        
        return {
            "gene": gene,
            "found": len(hits) > 0,
            "n_programs": len(hits),
            "programs": hits
        }

    @mcp.tool()
    def jaccard_topk(json_id: str, target_program: str, top_k: int = 20) -> list[dict]:
        """Jaccard similarity by overlap of gene sets"""

        data = _load_json(json_id)
        if data is None:
            return [{"error": f"Dataset {json_id} not found"}]
        
        clean_target = target_program.replace("new_program_", "").replace("_activity_scaled", "")
        
        if clean_target not in data:
            return [{"error": f"Unknown target_program: {clean_target}"}]

        target_data = data[clean_target]
        if isinstance(target_data, dict) and "loadings" in target_data:
            a = {str(x).upper() for x in target_data["loadings"].keys()}
        else:
            a = {str(x).upper() for x in target_data.keys()}
        
        rows = []
        for other, genes_data in data.items():
            if other == clean_target:
                continue
            
            if isinstance(genes_data, dict) and "loadings" in genes_data:
                b = {str(x).upper() for x in genes_data["loadings"].keys()}
            else:
                b = {str(x).upper() for x in genes_data.keys()}
            
            inter = len(a & b)
            union = len(a | b)
            
            rows.append({"program": other, "jaccard": (inter / union) if union else 0.0})

        rows.sort(key=lambda r: r["jaccard"], reverse=True)
        return rows[:top_k]

    @mcp.tool()
    def correlation_matrix(
        h5ad_id: str,
        program_names: list[str] = None,
        top_k: int = 20
    ) -> dict:
        """
        activity_by_program: shape [P][N] (P programs, N cells/samples)
        Returns a P x P correlation matrix.
        """
        adata = _load_h5ad(h5ad_id)
        if adata is None:
            return {"error": f"Dataset {h5ad_id} not found"}
        
        all_program_cols = [c for c in adata.obs.columns if c.startswith('new_program_')]
        
        if program_names is None:
            variances = [(col, adata.obs[col].var()) for col in all_program_cols]
            variances.sort(key=lambda x: x[1], reverse=True)
            program_names = [col for col, _ in variances[:top_k]]
        
        activity_by_program = [adata.obs[prog].values for prog in program_names]
        
        X = np.asarray(activity_by_program, dtype=float)
        corr = np.corrcoef(X)
        return {"programs": program_names, "corr": corr.tolist()}

    @mcp.tool()
    def wilcoxon_rank_programs(
        h5ad_id: str,
        group_col: str,
        group_a: str,
        group_b: str,
        alternative: Literal["two-sided", "greater", "less"] = "greater",
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
        adata = _load_h5ad(h5ad_id)
        if adata is None:
            return {"error": f"Dataset {h5ad_id} not found"}
        
        if group_col not in adata.obs.columns:
            return {"error": f"Column {group_col} not found"}
        
        program_names = [c for c in adata.obs.columns if c.startswith('new_program_')]
        P = len(program_names)
        
        mask_a = adata.obs[group_col] == group_a
        mask_b = adata.obs[group_col] == group_b

        pvals = []
        rows = []
        for i, pname in enumerate(program_names):
            a = np.asarray(adata.obs.loc[mask_a, pname].values, dtype=float)
            b = np.asarray(adata.obs.loc[mask_b, pname].values, dtype=float)

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
