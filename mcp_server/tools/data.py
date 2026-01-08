from __future__ import annotations

import json
from pathlib import Path
import anndata as ad

DATA_DIR = Path(__file__).parent.parent.parent / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
DATASETS_DIR = DATA_DIR / "datasets"

# In-memory cache for loaded datasets (prevents re-reading large files)
_h5ad_cache: dict[str, ad.AnnData] = {}
_json_cache: dict[str, dict] = {}


def register_data_tools(mcp):
    """Register dataset discovery and schema introspection tools"""

    @mcp.tool()
    def list_datasets() -> list[dict]:
        """List all available datasets in the uploads folder"""
        datasets = []
        for meta_file in DATASETS_DIR.glob("*.json"):
            with open(meta_file) as f:
                meta = json.load(f)
                datasets.append({
                    "id": meta["id"],
                    "name": meta["fileName"],
                    "size_mb": round(meta["fileSize"] / 1024 / 1024, 1)
                })
        return datasets
    
    @mcp.tool()
    def get_dataset_id_by_name(filename: str) -> dict:
        """
        Look up a dataset ID by filename.
        Users know filenames like 'eoe_program_activity.h5ad',
        but tools need IDs like 'ds_1767761666236_y4v1qm1bx'.
        """
        for meta_file in DATASETS_DIR.glob("*.json"):
            with open(meta_file) as f:
                meta = json.load(f)
                if meta["fileName"] == filename:
                    return {
                        "filename": filename,
                        "dataset_id": meta["id"],
                        "size_mb": round(meta["fileSize"] / 1024 / 1024, 1)
                    }
        
        available = []
        for meta_file in DATASETS_DIR.glob("*.json"):
            with open(meta_file) as f:
                meta = json.load(f)
                available.append(meta["fileName"])
                if filename.lower() in meta["fileName"].lower():
                    return {
                        "filename": meta["fileName"],
                        "dataset_id": meta["id"],
                        "size_mb": round(meta["fileSize"] / 1024 / 1024, 1),
                        "note": f"Matched '{meta['fileName']}' (partial match)"
                    }
        
        return {
            "error": f"No dataset found matching '{filename}'",
            "available_files": available
        }

    @mcp.tool()
    def load_h5ad_summary(dataset_id: str) -> dict:
        """Load H5AD file and return summary of contents"""
        adata = _load_h5ad(dataset_id)
        if adata is None:
            return {"error": f"Dataset {dataset_id} not found"}
        
        obs_cols = list(adata.obs.columns)
        metadata_cols = [c for c in obs_cols if not c.startswith('new_program_')]
        program_cols = [c for c in obs_cols if c.startswith('new_program_')]
        
        return {
            "n_cells": adata.n_obs,
            "n_programs": len(program_cols),
            "metadata_columns": metadata_cols,
            "program_columns": program_cols[:10],
            "cell_types": list(adata.obs['cell_type'].unique()) if 'cell_type' in adata.obs else [],
            "disease_status": list(adata.obs['disease_status'].unique()) if 'disease_status' in adata.obs else []
        }

    @mcp.tool()
    def load_programs_json(dataset_id: str) -> dict:
        """Load programs JSON file and return summary"""
        data = _load_json(dataset_id)
        if data is None:
            return {"error": f"Dataset {dataset_id} not found"}
        
        programs = list(data.keys())
        sample_program = programs[0] if programs else None
        
        return {
            "n_programs": len(programs),
            "programs": programs[:20],
            "sample_program": sample_program
        }

    @mcp.tool()
    def get_h5ad_schema(dataset_id: str) -> dict:
        """Get complete schema of H5AD file with exact column names and values"""
        adata = _load_h5ad(dataset_id)
        if adata is None:
            return {"error": f"Dataset {dataset_id} not found"}
        
        obs_cols = list(adata.obs.columns)
        metadata_cols = [c for c in obs_cols if not c.startswith('new_program_')]
        program_cols = [c for c in obs_cols if c.startswith('new_program_')]
        
        metadata_info = {}
        for col in metadata_cols:
            unique_vals = adata.obs[col].unique()
            if len(unique_vals) < 100:
                metadata_info[col] = {
                    "type": str(adata.obs[col].dtype),
                    "unique_values": list(unique_vals)[:20],
                    "n_unique": len(unique_vals)
                }
            else:
                metadata_info[col] = {
                    "type": str(adata.obs[col].dtype),
                    "n_unique": len(unique_vals)
                }
        
        return {
            "dataset_id": dataset_id,
            "n_cells": adata.n_obs,
            "n_genes": adata.n_vars,
            "metadata_columns": metadata_info,
            "program_columns": program_cols,
            "n_programs": len(program_cols)
        }
    
    @mcp.tool()
    def get_json_schema(dataset_id: str) -> dict:
        """Get schema of programs JSON file"""
        data = _load_json(dataset_id)
        if data is None:
            return {"error": f"Dataset {dataset_id} not found"}
        
        programs = list(data.keys())
        first_prog = programs[0] if programs else None
        example_info = {}
        
        if first_prog:
            prog_data = data[first_prog]
            if isinstance(prog_data, dict) and "program" in prog_data:
                example_info = {
                    "program_index": first_prog,
                    "h5ad_column": f"new_program_{first_prog}_activity_scaled",
                    "n_genes": len(prog_data.get("loadings", {})),
                    "example_genes": list(prog_data.get("loadings", {}).keys())[:10]
                }
        
        return {
            "dataset_id": dataset_id,
            "n_programs": len(programs),
            "program_indices": programs,
            "example": example_info,
            "note": "Programs indexed '0'-'69' map to H5AD columns 'new_program_0_activity_scaled' to 'new_program_69_activity_scaled'"
        }
    
    @mcp.tool()
    def find_paired_datasets() -> dict:
        """Find H5AD and JSON files uploaded together (for reference only)"""
        datasets = []
        for meta_file in DATASETS_DIR.glob("*.json"):
            with open(meta_file) as f:
                meta = json.load(f)
                datasets.append(meta)
        
        h5ad_files = [d for d in datasets if d["fileName"].endswith(".h5ad")]
        json_files = [d for d in datasets if d["fileName"].endswith(".json")]
        
        pairings = []
        for h5ad in h5ad_files:
            h5ad_time = int(h5ad["id"].split("_")[1])
            for json_file in json_files:
                json_time = int(json_file["id"].split("_")[1])
                time_diff = abs(h5ad_time - json_time)
                
                if time_diff < 60000:
                    pairings.append({
                        "h5ad_id": h5ad["id"],
                        "h5ad_name": h5ad["fileName"],
                        "json_id": json_file["id"],
                        "json_name": json_file["fileName"],
                        "time_diff_seconds": time_diff / 1000
                    })
        
        return {
            "pairings": pairings,
            "note": "Use h5ad_id for activity data, json_id for gene loadings"
        }


def _load_h5ad(dataset_id: str) -> ad.AnnData | None:
    """Load and cache an H5AD file"""
    if dataset_id in _h5ad_cache:
        return _h5ad_cache[dataset_id]
    
    for f in UPLOADS_DIR.glob(f"{dataset_id}_*.h5ad"):
        adata = ad.read_h5ad(f)
        _h5ad_cache[dataset_id] = adata
        return adata
    
    return None


def _load_json(dataset_id: str) -> dict | None:
    """Load and cache a JSON file"""
    if dataset_id in _json_cache:
        return _json_cache[dataset_id]
    
    for f in UPLOADS_DIR.glob(f"{dataset_id}_*.json"):
        with open(f) as fp:
            data = json.load(fp)
        _json_cache[dataset_id] = data
        return data
    
    return None
