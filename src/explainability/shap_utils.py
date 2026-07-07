"""
SHAP explainability utilities for the arbitrage model.

Generates: waterfall, summary, and force plots.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import shap

logger = logging.getLogger(__name__)


def get_shap_values(
    model: Any,
    X: pd.DataFrame,
    model_type: str = "tree",
) -> shap.Explanation:
    """
    Compute SHAP values for a fitted model.

    model_type: 'tree' for RF/XGB/LGB, 'linear' for Ridge meta-learner.
    """
    if model_type == "tree":
        explainer = shap.TreeExplainer(model)
    elif model_type == "linear":
        explainer = shap.LinearExplainer(model, X)
    else:
        explainer = shap.Explainer(model, X)

    return explainer(X)


def waterfall_plot(
    shap_values: shap.Explanation,
    player_idx: int,
    feature_names: list[str] | None = None,
    max_display: int = 15,
    save_path: str | Path | None = None,
) -> None:
    """
    Waterfall plot for a single player — shows top drivers of prediction.
    """
    import matplotlib.pyplot as plt

    sv = shap_values[player_idx]
    shap.waterfall_plot(sv, max_display=max_display, show=False)

    if save_path:
        plt.savefig(save_path, bbox_inches="tight", dpi=150)
        plt.close()
        logger.info("Waterfall plot saved to %s", save_path)
    else:
        plt.show()


def summary_plot(
    shap_values: shap.Explanation,
    X: pd.DataFrame,
    max_display: int = 20,
    save_path: str | Path | None = None,
) -> None:
    """
    Summary plot — global feature importance across all players.
    """
    import matplotlib.pyplot as plt

    shap.summary_plot(shap_values, X, max_display=max_display, show=False)

    if save_path:
        plt.savefig(save_path, bbox_inches="tight", dpi=150)
        plt.close()
        logger.info("Summary plot saved to %s", save_path)
    else:
        plt.show()


def force_plot_two_players(
    shap_values: shap.Explanation,
    idx_a: int,
    idx_b: int,
    feature_names: list[str],
    save_path: str | Path | None = None,
) -> Any:
    """
    Side-by-side force plot comparing two players.

    Returns the HTML force plot object (can be embedded in web app).
    """
    plot_a = shap.force_plot(
        shap_values.base_values[idx_a],
        shap_values.values[idx_a],
        feature_names=feature_names,
        matplotlib=False,
    )
    plot_b = shap.force_plot(
        shap_values.base_values[idx_b],
        shap_values.values[idx_b],
        feature_names=feature_names,
        matplotlib=False,
    )

    if save_path:
        html_a = shap.plots.force(plot_a, show=False)
        html_b = shap.plots.force(plot_b, show=False)
        Path(save_path).write_text(
            f"<h3>Player A</h3>{html_a}<h3>Player B</h3>{html_b}"
        )

    return plot_a, plot_b


def shap_values_to_dict(
    shap_values: shap.Explanation,
    player_idx: int,
    top_n: int = 10,
) -> list[dict]:
    """
    Serialise SHAP values for a single player to a JSON-friendly list.

    Returns list of {feature, shap_value, feature_value} dicts, sorted by abs impact.
    """
    sv = shap_values[player_idx]
    feature_names = sv.feature_names or [f"f{i}" for i in range(len(sv.values))]

    pairs = sorted(
        zip(feature_names, sv.values, sv.data),
        key=lambda x: abs(x[1]),
        reverse=True,
    )[:top_n]

    return [
        {
            "feature": name,
            "shap_value": float(val),
            "feature_value": float(fval) if fval is not None else None,
        }
        for name, val, fval in pairs
    ]
