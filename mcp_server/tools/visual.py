from __future__ import annotations

import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from .data import _load_h5ad

def register_visual_tools(mcp):

    @mcp.tool()
    def boxplot(
        h5ad_id: str,
        program_name: str,
        group_by: str,
        title: str = "",
        show_significance: bool = False,
        p_values: dict = None
    ) -> dict:
        """
        Create boxplot using summary statistics (no raw data transfer).
        Returns Plotly JSON spec for frontend.
        
        Args:
            h5ad_id: Dataset ID for H5AD file
            program_name: Program column (e.g., 'new_program_5_activity_scaled')
            group_by: Metadata column to group by (e.g., 'disease_status')
            title: Chart title (optional)
            show_significance: Add * markers for significant differences
            p_values: Dict of {group_pair: p_value} for significance (optional)
        """
        adata = _load_h5ad(h5ad_id)
        if adata is None:
            return {"error": f"Dataset {h5ad_id} not found"}
        
        if program_name not in adata.obs.columns:
            return {"error": f"Program {program_name} not found"}
        
        if group_by not in adata.obs.columns:
            return {"error": f"Column {group_by} not found"}
        
        if not title:
            title = f"{program_name} by {group_by}"
        
        fig = go.Figure()
        
        for group_val in sorted(adata.obs[group_by].unique()):
            mask = adata.obs[group_by] == group_val
            values = adata.obs.loc[mask, program_name].values
            
            # Compute quartiles (just 5 numbers!)
            q1 = float(np.percentile(values, 25))
            median = float(np.percentile(values, 50))
            q3 = float(np.percentile(values, 75))
            iqr = q3 - q1
            lower_fence = float(np.percentile(values, 0))
            upper_fence = float(np.percentile(values, 100))
            
            fig.add_trace(go.Box(
                y=[str(group_val)],  # Groups on y-axis
                q1=[q1],
                median=[median],
                q3=[q3],
                lowerfence=[lower_fence],
                upperfence=[upper_fence],
                orientation='h',  # Horizontal orientation
                boxmean='sd',
                marker_color='lightblue' if 'Ctrl' in str(group_val) else 'salmon',
                name=str(group_val)
            ))
        
        fig.update_layout(
            title=title,
            yaxis_title=group_by,
            xaxis_title="Activity",
            showlegend=False,
            template="plotly_white",
            height=400
        )
        
        return {"type": "plotly", "spec": fig.to_dict()}

    @mcp.tool()
    def correlation_heatmap(programs: list[str], corr: list[list[float]], title: str = "Program–program correlation") -> dict:
        C = np.asarray(corr, dtype=float)
        fig = px.imshow(C, x=programs, y=programs, aspect="auto", title=title)
        return {"type": "plotly", "spec": fig.to_plotly_json()}

    @mcp.tool()
    def overlap_histogram(programs: list[str], overlap_score: list[float], title: str = "Program gene overlap (sorted)") -> dict:
        """
        Backend computes overlap_score and passes it in.
        """
        order = np.argsort(-np.asarray(overlap_score, dtype=float))
        progs = [programs[i] for i in order]
        vals = [float(overlap_score[i]) for i in order]

        fig = px.bar({"program": progs, "overlap": vals}, x="program", y="overlap", title=title)
        fig.update_layout(xaxis_tickangle=-45)
        return {"type": "plotly", "spec": fig.to_plotly_json()}
