"""
Task 1 — Value Arbitrage Engine.

Stacking ensemble: RF + XGB + LGB base learners → Ridge meta-learner.
Walk-forward cross-validation aligned to transfer windows.
SHAP explainability via shap_utils.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import mlflow
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

logger = logging.getLogger(__name__)

# Transfer windows: summer (Jul 1 – Sep 1) and winter (Jan 1 – Feb 1)
# Walk-forward folds split on these boundaries.
TRANSFER_WINDOW_MONTHS = {7, 1}  # July = summer open, January = winter open

POSITION_GROUPS = ["GK", "Defender", "Midfielder", "Forward"]


# --- data structures ---

@dataclass
class FoldResult:
    fold: int
    train_seasons: list[int]
    test_season: int
    mae: float
    rmse: float
    r2: float
    oof_predictions: np.ndarray
    oof_actuals: np.ndarray


@dataclass
class ArbitrageResult:
    player_id: Any
    predicted_fair_value: float
    actual_fee: float | None
    market_value_at_transfer: float | None
    arbitrage_residual: float | None  # actual_fee - predicted_fair_value
    position_group: str
    age: float
    league_tier: int
    season: int


# --- walk-forward CV ---

def get_transfer_window_splits(
    df: pd.DataFrame,
    date_col: str = "transfer_date",
    min_train_seasons: int = 2,
) -> list[tuple[pd.Index, pd.Index]]:
    """
    Generate walk-forward (expanding window) train/test splits
    aligned to transfer windows (summer + winter).

    Each test set = one transfer season (summer window of year N).
    Train set = all data before that window.
    """
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    df["season"] = df[date_col].apply(
        lambda d: d.year if d.month >= 7 else d.year - 1
    )

    seasons = sorted(df["season"].unique())
    splits = []

    for i, test_season in enumerate(seasons):
        if i < min_train_seasons:
            continue
        train_seasons = seasons[:i]
        train_idx = df[df["season"].isin(train_seasons)].index
        test_idx = df[df["season"] == test_season].index
        if len(train_idx) == 0 or len(test_idx) == 0:
            continue
        splits.append((train_idx, test_idx))

    return splits


# --- base learners ---

def _make_base_learners(random_state: int = 42) -> dict[str, Any]:
    return {
        "rf": RandomForestRegressor(
            n_estimators=300,
            max_depth=12,
            min_samples_leaf=5,
            n_jobs=-1,
            random_state=random_state,
        ),
        "xgb": XGBRegressor(
            n_estimators=400,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=random_state,
            verbosity=0,
        ),
        "lgb": LGBMRegressor(
            n_estimators=400,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=random_state,
            verbose=-1,
        ),
    }


# --- stacking ensemble ---

class ArbitrageModel:
    """
    Stacking ensemble for fair-value estimation.

    Trains one model per position group (GK / Defender / Midfielder / Forward).
    """

    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self._models: dict[str, dict[str, Any]] = {}
        self._scalers: dict[str, StandardScaler] = {}
        self._meta: dict[str, Ridge] = {}
        self._feature_cols: list[str] = []

    def fit(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        position_groups: pd.Series,
        mlflow_run: bool = True,
    ) -> "ArbitrageModel":
        """
        Fit per-position-group stacking ensembles.

        Uses out-of-fold predictions for meta-learner training to prevent leakage.
        """
        self._feature_cols = list(X.columns)

        for pos in POSITION_GROUPS:
            mask = position_groups == pos
            if mask.sum() < 50:
                logger.warning("Position group %s has only %d samples — skipping.", pos, mask.sum())
                continue

            X_pos = X[mask].values
            y_pos = y[mask].values

            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_pos)
            self._scalers[pos] = scaler

            base = _make_base_learners(self.random_state)
            oof = np.zeros((len(X_pos), len(base)))

            # Simple 5-fold OOF for meta features
            from sklearn.model_selection import KFold
            kf = KFold(n_splits=5, shuffle=True, random_state=self.random_state)

            for fold_i, (tr_idx, val_idx) in enumerate(kf.split(X_scaled)):
                for j, (name, model) in enumerate(base.items()):
                    model.fit(X_scaled[tr_idx], y_pos[tr_idx])
                    oof[val_idx, j] = model.predict(X_scaled[val_idx])

            # Retrain base learners on full data
            for name, model in base.items():
                model.fit(X_scaled, y_pos)

            meta = Ridge(alpha=1.0)
            meta.fit(oof, y_pos)

            self._models[pos] = base
            self._meta[pos] = meta

            if mlflow_run:
                mlflow.log_metric(f"{pos}_train_samples", int(mask.sum()))

        return self

    def predict(self, X: pd.DataFrame, position_groups: pd.Series) -> np.ndarray:
        """Predict fair value for each player by their position group."""
        preds = np.full(len(X), np.nan)

        for pos in POSITION_GROUPS:
            mask = (position_groups == pos).values
            if not mask.any() or pos not in self._models:
                continue

            X_pos = X[mask].values
            X_scaled = self._scalers[pos].transform(X_pos)

            base_preds = np.column_stack([
                m.predict(X_scaled) for m in self._models[pos].values()
            ])
            preds[mask] = self._meta[pos].predict(base_preds)

        return preds

    def compute_arbitrage(
        self,
        X: pd.DataFrame,
        actual_fees: pd.Series,
        position_groups: pd.Series,
        market_values: pd.Series | None = None,
    ) -> pd.DataFrame:
        """
        Compute residuals: actual_fee - predicted_fair_value.

        Returns a DataFrame with predicted values, actuals, and residuals.
        """
        predicted = self.predict(X, position_groups)

        result = pd.DataFrame({
            "predicted_fair_value": predicted,
            "actual_fee": actual_fees.values,
            "arbitrage_residual": actual_fees.values - predicted,
        }, index=X.index)

        if market_values is not None:
            result["market_value_at_transfer"] = market_values.values

        return result


# --- walk-forward evaluation ---

def evaluate_walk_forward(
    df: pd.DataFrame,
    feature_cols: list[str],
    target_col: str,
    position_col: str,
    date_col: str = "transfer_date",
    min_train_seasons: int = 2,
    experiment_name: str = "arbitrage_walk_forward",
) -> list[FoldResult]:
    """
    Run walk-forward CV and log results to MLflow.

    Returns per-fold metrics and OOF predictions.
    """
    splits = get_transfer_window_splits(df, date_col=date_col, min_train_seasons=min_train_seasons)
    df = df.copy()
    df["season"] = pd.to_datetime(df[date_col]).apply(
        lambda d: d.year if d.month >= 7 else d.year - 1
    )

    mlflow.set_experiment(experiment_name)
    fold_results = []

    for fold_i, (train_idx, test_idx) in enumerate(splits):
        train = df.loc[train_idx]
        test = df.loc[test_idx]

        X_train = train[feature_cols]
        y_train = train[target_col]
        pos_train = train[position_col]

        X_test = test[feature_cols]
        y_test = test[target_col]
        pos_test = test[position_col]

        with mlflow.start_run(run_name=f"fold_{fold_i}"):
            model = ArbitrageModel()
            model.fit(X_train, y_train, pos_train, mlflow_run=True)

            preds = model.predict(X_test, pos_test)
            valid_mask = ~np.isnan(preds) & ~np.isnan(y_test.values)

            mae = mean_absolute_error(y_test.values[valid_mask], preds[valid_mask])
            rmse = float(np.sqrt(mean_squared_error(y_test.values[valid_mask], preds[valid_mask])))
            r2 = r2_score(y_test.values[valid_mask], preds[valid_mask])

            mlflow.log_metrics({"mae": mae, "rmse": rmse, "r2": r2})
            mlflow.log_param("fold", fold_i)
            mlflow.log_param("train_seasons", sorted(train["season"].unique().tolist()))
            mlflow.log_param("test_season", test["season"].iloc[0])

            logger.info("Fold %d — MAE: %.0f  RMSE: %.0f  R2: %.3f", fold_i, mae, rmse, r2)

        fold_results.append(FoldResult(
            fold=fold_i,
            train_seasons=sorted(train["season"].unique().tolist()),
            test_season=int(test["season"].iloc[0]),
            mae=mae,
            rmse=rmse,
            r2=r2,
            oof_predictions=preds[valid_mask],
            oof_actuals=y_test.values[valid_mask],
        ))

    return fold_results


# --- segment error analysis ---

def segment_error_analysis(
    df: pd.DataFrame,
    preds: np.ndarray,
    actuals: np.ndarray,
) -> pd.DataFrame:
    """
    Compute RMSE / MAE per segment: position group, age bracket, league tier.

    Returns a summary DataFrame.
    """
    result = df[["position_group", "age", "club_league_tier", "season"]].copy()
    result["pred"] = preds
    result["actual"] = actuals
    result["error"] = actuals - preds
    result["abs_error"] = np.abs(result["error"])
    result["sq_error"] = result["error"] ** 2

    result["age_bracket"] = pd.cut(
        result["age"],
        bins=[0, 21, 27, 100],
        labels=["U21", "21-27", "27+"],
    )

    records = []
    for dim in ["position_group", "age_bracket", "club_league_tier"]:
        grouped = result.groupby(dim).agg(
            count=("abs_error", "count"),
            mae=("abs_error", "mean"),
            rmse=("sq_error", lambda s: float(np.sqrt(s.mean()))),
        ).reset_index()
        grouped["segment_dim"] = dim
        grouped = grouped.rename(columns={dim: "segment_value"})
        records.append(grouped)

    return pd.concat(records, ignore_index=True)
