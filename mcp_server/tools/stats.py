from __future__ import annotations

from typing import Literal, List, Dict, Optional, Any
import numpy as np
import re
from scipy.stats import mannwhitneyu
from statsmodels.stats.multitest import multipletests
from .data import _load_h5ad, _load_json

def _parse_program_number(s: str) -> str:
    """
    Extract a program number by finding digits anywhere in the string.
    Uses the first match; if no digits exist, returns the original string.
    """
    m = re.search(r"(\d+)", str(s))
    return m.group(1) if m else str(s)

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
    def program_top_genes(json_id: str, program: str, top_k: int = 30) -> dict:
        """
        Return top genes (by absolute loading) in a given program from the loadings JSON.
        program can be '5' or 'new_program_5_activity_scaled' etc; we extract digits.
        """
        data = _load_json(json_id)
        if data is None:
            return {"error": f"Dataset {json_id} not found"}

        prog_num = _parse_program_number(program)

        if prog_num not in data:
            return {"error": f"Program {prog_num} not found"}

        prog_data = data[prog_num]
        loadings = prog_data.get("loadings", prog_data)

        items = []
        for g, v in loadings.items():
            try:
                items.append((str(g), float(v)))
            except Exception:
                continue

        items.sort(key=lambda x: abs(x[1]), reverse=True)
        top = [{"gene": g, "loading": v} for g, v in items[:top_k]]

        return {"program_number": prog_num, "top_genes": top}


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
        program_info: Optional[Dict[str, Dict[str, Any]]] = None,
        alternative: Literal["two-sided", "greater", "less"] = "greater",
        alpha: float = 0.05,
        fdr_method: Literal["fdr_bh"] = "fdr_bh",
        fdr_scope: Literal["global", "per_program"] = "global",
        top_k_programs: int = 30,
        top_k_groups: int = 5,
        min_cells_per_group: int = 3,
    ) -> dict:
        """
        For each program, test enrichment of program activity in each group value (one-vs-rest)
        using Mann–Whitney U (Wilcoxon rank-sum).

        group_col can be "cell_type", "disease_status", etc.
        Returns programs ranked by best (smallest) p-value among enriched groups.
        Each program includes enriched groups sorted by p-value.
        Adds ★ via group_value_label when q_value < alpha.
        """
        adata = _load_h5ad(h5ad_id)
        if adata is None:
            return {"error": f"Dataset {h5ad_id} not found"}

        if group_col not in adata.obs.columns:
            return {"error": f"Column {group_col} not found"}

        program_cols = [c for c in adata.obs.columns if c.startswith("new_program_")]
        if not program_cols:
            return {"error": "No program columns found (expected obs columns starting with 'new_program_')"}

        groups = adata.obs[group_col].astype(str)
        group_values = sorted(groups.unique().tolist())

        all_test_rows: List[dict] = []
        programs: List[dict] = []

        for pcol in program_cols:
            prog_num = _parse_program_number(pcol)

            name = ""
            description = ""
            if program_info and prog_num in program_info:
                name = str(program_info[prog_num].get("name", ""))
                description = str(program_info[prog_num].get("description", ""))

            x_all = np.asarray(adata.obs[pcol].values, dtype=float)

            per_rows = []
            for gv in group_values:
                mask_in = (groups == gv).values
                mask_out = ~mask_in

                a = x_all[mask_in]
                b = x_all[mask_out]

                if a.size < min_cells_per_group or b.size < min_cells_per_group:
                    stat, p = 0.0, 1.0
                    med_diff = float("nan")
                else:
                    stat, p = mannwhitneyu(a, b, alternative=alternative)
                    med_diff = float(np.nanmedian(a) - np.nanmedian(b))

                row = {
                    "program_column": pcol,
                    "program_number": prog_num,
                    "group_value": str(gv),
                    "group_value_label": str(gv),  # filled after FDR

                    # stats (kept in payload but prompt/UI will hide them)
                    "u_stat": float(stat),
                    "p_value": float(p),
                    "q_value": 1.0,
                    "significant": False,

                    "median_diff": med_diff,
                    "n_in": int(a.size),
                    "n_out": int(b.size),
                }
                per_rows.append(row)
                all_test_rows.append(row)

            programs.append({
                "program_number": prog_num,
                "program_column": pcol,
                "name": name,
                "description": description,
                "tests": per_rows,
            })

        # Multiple testing correction
        if fdr_scope == "global":
            pvals = [r["p_value"] for r in all_test_rows]
            _, qvals, _, _ = multipletests(pvals, method=fdr_method)
            for r, q in zip(all_test_rows, qvals):
                r["q_value"] = float(q)
                r["significant"] = bool(r["q_value"] < alpha)
                r["group_value_label"] = f'{r["group_value"]}{"★" if r["significant"] else ""}'
        else:
            for prog in programs:
                pvals = [r["p_value"] for r in prog["tests"]]
                _, qvals, _, _ = multipletests(pvals, method=fdr_method)
                for r, q in zip(prog["tests"], qvals):
                    r["q_value"] = float(q)
                    r["significant"] = bool(r["q_value"] < alpha)
                    r["group_value_label"] = f'{r["group_value"]}{"★" if r["significant"] else ""}'

        # Enrichment direction filter
        def is_enriched(r: dict) -> bool:
            if np.isnan(r["median_diff"]):
                return False
            if alternative == "greater":
                return r["median_diff"] > 0
            if alternative == "less":
                return r["median_diff"] < 0
            return True

        results = []
        for prog in programs:
            enriched = [r for r in prog["tests"] if is_enriched(r)]
            enriched.sort(key=lambda r: r["p_value"])  # required sort by p-value

            best_p = enriched[0]["p_value"] if enriched else 1.0
            best_q = enriched[0]["q_value"] if enriched else 1.0

            results.append({
                "program_number": prog["program_number"],
                "program_column": prog["program_column"],
                "name": prog["name"],
                "description": prog["description"],
                "best_p_value": float(best_p),
                "best_q_value": float(best_q),
                "enriched_in": [
                    {
                        "group_value": r["group_value"],
                        "group_value_label": r["group_value_label"],
                        "significant": r["significant"],
                        # keep stats in payload for debugging / future UI
                        "p_value": r["p_value"],
                        "q_value": r["q_value"],
                        "median_diff": r["median_diff"],
                        "n_in": r["n_in"],
                        "n_out": r["n_out"],
                    }
                    for r in enriched[:top_k_groups]
                ],
            })

        results.sort(key=lambda r: r["best_p_value"])

        return {
            "group_col": group_col,
            "alternative": alternative,
            "alpha": alpha,
            "fdr_method": fdr_method,
            "fdr_scope": fdr_scope,
            "results": results[:top_k_programs],
        }
