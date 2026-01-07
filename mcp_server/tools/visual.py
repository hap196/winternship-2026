from __future__ import annotations

import numpy as np
import plotly.express as px

def register_viz_tools(mcp):

    @mcp.tool()
    def boxplot(groups: dict[str, list[float]], title: str = "Program activity", show_points: bool = True) -> dict:
        """
        groups: {"control":[...], "active":[...], ...}
        Returns Plotly JSON spec for frontend
        """

        rows = []
        for g, vals in groups.items():
            for v in vals:
                rows.append({"group": g, "value": float(v)})

        fig = px.box(
            rows,
            x="group",
            y="value",
            points="outliers" if show_points else False,
            title=title,
        )
        return {"type": "plotly", "spec": fig.to_plotly_json()}

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
