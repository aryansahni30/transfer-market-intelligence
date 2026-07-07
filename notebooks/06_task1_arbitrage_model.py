"""
Milestone 2 — Value Arbitrage Model (Task 1).

Trains a per-position stacking ensemble (RF + XGB + LGB → Ridge) using
walk-forward CV aligned to transfer windows.  Primary training target is
log(market_value_at_snap + 1); arbitrage residual is computed for rows
that have an actual disclosed transfer fee.

Run:
    MLFLOW_ALLOW_FILE_STORE=true venv/bin/python3 notebooks/06_task1_arbitrage_model.py
"""

# %% [markdown]
# # 06 — Value Arbitrage Model

# %%
import os
import sys
from pathlib import Path

import joblib
import mlflow
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

DATA_PROC = ROOT / "data" / "processed"
MODELS_DIR = ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)

mlflow.set_tracking_uri(str(ROOT / "mlruns"))
mlflow.set_experiment("06_arbitrage_model")

# %% [markdown]
# ## 1. Load features

# %%
print("Loading features_master.parquet...")
df = pd.read_parquet(DATA_PROC / "features_master.parquet")
print(f"  {len(df):,} rows  {df.shape[1]} cols")

# %% [markdown]
# ## 2. Feature selection and preprocessing

# %%
DROP_COLS = [
    "player_id", "transfer_date", "date_of_birth",
    "position", "foot", "sub_position",
    "transfer_fee_eur", "market_value_at_transfer",
    "to_club_id", "target_fee", "target_market_value",
]

FEATURE_COLS = [c for c in df.columns if c not in DROP_COLS
                and c not in {"has_actual_fee", "season", "position_group",
                               "market_value_at_snap"}]

print(f"Feature columns ({len(FEATURE_COLS)}):", FEATURE_COLS)

# Primary target: log market value at transfer date
# Market value is available for all rows → more training signal
df = df[df["target_market_value"].notna() & (df["target_market_value"] > 0)].copy()
df["log_target"] = np.log1p(df["target_market_value"])

# Impute missing features with column medians (computed on full set)
medians = df[FEATURE_COLS].median()
df[FEATURE_COLS] = df[FEATURE_COLS].fillna(medians)

print(f"Training rows after target filter: {len(df):,}")
print(f"Rows with actual transfer fee:     {df['has_actual_fee'].sum():,}")

# %% [markdown]
# ## 3. Walk-forward CV splits (transfer-window aligned)

# %%
MIN_TRAIN_SEASONS = 5
TEST_SEASONS = sorted(df["season"].unique())
TEST_SEASONS = [s for s in TEST_SEASONS if s >= df["season"].min() + MIN_TRAIN_SEASONS]

print(f"\nWalk-forward splits  (test seasons: {TEST_SEASONS[:5]}...{TEST_SEASONS[-1]})")

splits = []
for test_season in TEST_SEASONS:
    train_mask = df["season"] < test_season
    test_mask = df["season"] == test_season
    if train_mask.sum() < 500 or test_mask.sum() < 50:
        continue
    splits.append((df.index[train_mask], df.index[test_mask], test_season))

print(f"  {len(splits)} valid splits")

# %% [markdown]
# ## 4. Per-position stacking ensemble

# %%
POSITION_GROUPS = ["GK", "Defender", "Midfielder", "Forward"]


def make_base_learners() -> list[tuple[str, object]]:
    return [
        ("rf",  RandomForestRegressor(n_estimators=200, max_depth=8,
                                       min_samples_leaf=10, n_jobs=-1,
                                       random_state=42)),
        ("xgb", XGBRegressor(n_estimators=400, max_depth=5, learning_rate=0.05,
                              subsample=0.8, colsample_bytree=0.8,
                              tree_method="hist", random_state=42,
                              verbosity=0)),
        ("lgb", LGBMRegressor(n_estimators=400, max_depth=5, learning_rate=0.05,
                               subsample=0.8, colsample_bytree=0.8,
                               random_state=42, verbose=-1)),
    ]


def train_stacking_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    n_meta_folds: int = 5,
) -> dict:
    """
    Train RF + XGB + LGB base learners with OOF meta features,
    then fit Ridge meta-learner.  Returns fitted model dict.
    """
    n = len(X_train)
    base_learners = make_base_learners()
    oof_preds = np.zeros((n, len(base_learners)))

    kf = KFold(n_splits=n_meta_folds, shuffle=True, random_state=42)

    # Collect OOF predictions for meta training
    fitted_bases = []
    for fold_idx, (tr_idx, val_idx) in enumerate(kf.split(X_train)):
        X_tr, y_tr = X_train[tr_idx], y_train[tr_idx]
        X_val = X_train[val_idx]
        for col_idx, (name, est) in enumerate(base_learners):
            import copy
            est_clone = copy.deepcopy(est)
            est_clone.fit(X_tr, y_tr)
            oof_preds[val_idx, col_idx] = est_clone.predict(X_val)

    # Refit base learners on full training data
    fitted_bases = []
    for name, est in base_learners:
        import copy
        est_full = copy.deepcopy(est)
        est_full.fit(X_train, y_train)
        fitted_bases.append((name, est_full))

    # Fit Ridge meta-learner on OOF predictions
    meta = Ridge(alpha=1.0)
    meta.fit(oof_preds, y_train)

    scaler = StandardScaler()
    scaler.fit(X_train)

    return {"bases": fitted_bases, "meta": meta, "scaler": scaler,
            "feature_cols": FEATURE_COLS}


def predict_stacking(model: dict, X: np.ndarray) -> np.ndarray:
    base_preds = np.column_stack([
        est.predict(X) for _, est in model["bases"]
    ])
    return model["meta"].predict(base_preds)


# %% [markdown]
# ## 5. Walk-forward training and evaluation

# %%
fold_metrics: list[dict] = []

with mlflow.start_run(run_name="walk_forward_cv"):
    mlflow.log_param("feature_count", len(FEATURE_COLS))
    mlflow.log_param("n_splits", len(splits))

    for train_idx, test_idx, test_season in splits:
        df_train = df.loc[train_idx]
        df_test = df.loc[test_idx]

        results_per_pos: dict[str, dict] = {}

        # Train and evaluate per position group
        for pos in POSITION_GROUPS:
            tr_pos = df_train[df_train["position_group"] == pos]
            te_pos = df_test[df_test["position_group"] == pos]

            if len(tr_pos) < 100 or len(te_pos) < 10:
                continue

            X_tr = tr_pos[FEATURE_COLS].values
            y_tr = tr_pos["log_target"].values
            X_te = te_pos[FEATURE_COLS].values
            y_te = te_pos["log_target"].values

            model = train_stacking_model(X_tr, y_tr)
            preds = predict_stacking(model, X_te)

            mae = mean_absolute_error(y_te, preds)
            rmse = mean_squared_error(y_te, preds) ** 0.5
            r2 = r2_score(y_te, preds)

            results_per_pos[pos] = {"mae": mae, "rmse": rmse, "r2": r2,
                                     "n_test": len(te_pos)}

        # Aggregate across positions (weighted by test size)
        total_n = sum(v["n_test"] for v in results_per_pos.values())
        if total_n == 0:
            continue

        w_mae  = sum(v["mae"]  * v["n_test"] for v in results_per_pos.values()) / total_n
        w_rmse = sum(v["rmse"] * v["n_test"] for v in results_per_pos.values()) / total_n
        w_r2   = sum(v["r2"]   * v["n_test"] for v in results_per_pos.values()) / total_n

        fold_metrics.append({
            "season": test_season, "mae": w_mae, "rmse": w_rmse, "r2": w_r2,
            "n_test": total_n, **{f"{p}_r2": results_per_pos.get(p, {}).get("r2", np.nan)
                                   for p in POSITION_GROUPS},
        })

        print(f"  Season {test_season}: MAE={w_mae:.3f}  RMSE={w_rmse:.3f}  R²={w_r2:.3f}"
              f"  n={total_n}")
        mlflow.log_metric("mae",  w_mae,  step=test_season)
        mlflow.log_metric("rmse", w_rmse, step=test_season)
        mlflow.log_metric("r2",   w_r2,   step=test_season)

    metrics_df = pd.DataFrame(fold_metrics)
    print(f"\n=== Walk-forward CV Summary ===")
    print(metrics_df[["season", "mae", "rmse", "r2"]].to_string(index=False))
    avg_r2 = metrics_df["r2"].mean()
    print(f"\nMean R²: {avg_r2:.3f}")
    mlflow.log_metric("mean_r2", avg_r2)

# %% [markdown]
# ## 6. Train final models on all data (per position)

# %%
print("\nTraining final per-position models on all data...")

final_models: dict[str, dict] = {}
for pos in POSITION_GROUPS:
    pos_df = df[df["position_group"] == pos]
    if len(pos_df) < 100:
        print(f"  {pos}: skipped (only {len(pos_df)} rows)")
        continue
    X = pos_df[FEATURE_COLS].values
    y = pos_df["log_target"].values
    print(f"  {pos}: {len(pos_df):,} rows → training...")
    final_models[pos] = train_stacking_model(X, y)
    print(f"    done.")

# Save models
model_path = MODELS_DIR / "arbitrage_models.joblib"
joblib.dump({"models": final_models, "medians": medians,
             "feature_cols": FEATURE_COLS}, model_path)
print(f"\n✓ Models saved to {model_path}")

# %% [markdown]
# ## 7. Compute arbitrage board (all transfers with disclosed fees)

# %%
print("\nComputing arbitrage board...")

fee_df = df[df["has_actual_fee"] == 1].copy()
print(f"  Fee rows: {len(fee_df):,}")

preds_log = np.full(len(fee_df), np.nan)
for pos in POSITION_GROUPS:
    if pos not in final_models:
        continue
    mask = fee_df["position_group"] == pos
    if not mask.any():
        continue
    X_pos = fee_df.loc[mask, FEATURE_COLS].values
    preds_log[mask.values] = predict_stacking(final_models[pos], X_pos)

fee_df["predicted_fair_value"] = np.expm1(preds_log)
fee_df["actual_fee"] = fee_df["transfer_fee_eur"]
fee_df["arbitrage_residual"] = fee_df["predicted_fair_value"] - fee_df["actual_fee"]
fee_df["arbitrage_pct"] = (fee_df["arbitrage_residual"] / fee_df["actual_fee"].clip(lower=1e3)) * 100

# Keep only rows where we got a prediction
arb_df = fee_df[fee_df["predicted_fair_value"].notna()].copy()

print(f"  Arbitrage board rows: {len(arb_df):,}")
print(f"\n  Residual distribution (€):")
print(arb_df["arbitrage_residual"].describe().apply(lambda x: f"{x:,.0f}"))
print(f"\n  Top 5 most undervalued (residual > 0 = cheaper than predicted):")
top_under = arb_df.nlargest(5, "arbitrage_residual")[
    ["player_id", "season", "actual_fee", "predicted_fair_value", "arbitrage_residual", "position_group"]
]
print(top_under.to_string(index=False))

# %% [markdown]
# ## 8. Segment error analysis

# %%
print("\n=== Segment Error Analysis ===")

# Position group breakdown
print("\nBy position group:")
seg_pos = arb_df.groupby("position_group").agg(
    n=("arbitrage_residual", "count"),
    mean_residual=("arbitrage_residual", "mean"),
    mae_residual=("arbitrage_residual", lambda x: np.abs(x).mean()),
).round(0)
print(seg_pos.to_string())

# Age bracket breakdown
arb_df["age_bracket"] = pd.cut(
    arb_df["age"],
    bins=[0, 21, 27, 100],
    labels=["U21", "21-27", "27+"],
)
print("\nBy age bracket:")
seg_age = arb_df.groupby("age_bracket", observed=True).agg(
    n=("arbitrage_residual", "count"),
    mean_residual=("arbitrage_residual", "mean"),
    mae_residual=("arbitrage_residual", lambda x: np.abs(x).mean()),
).round(0)
print(seg_age.to_string())

# Club tier breakdown
arb_df["tier_label"] = arb_df["dest_club_tier"].map(
    {1: "Tier1", 2: "Tier2", 3: "Tier3"}
).fillna("Tier4+")
print("\nBy destination club tier:")
seg_tier = arb_df.groupby("tier_label").agg(
    n=("arbitrage_residual", "count"),
    mean_residual=("arbitrage_residual", "mean"),
    mae_residual=("arbitrage_residual", lambda x: np.abs(x).mean()),
).round(0)
print(seg_tier.to_string())

# %% [markdown]
# ## 9. SHAP explainability (sample)

# %%
print("\nComputing SHAP values (sample of 500 rows)...")
try:
    import shap

    sample_pos = "Forward"
    if sample_pos in final_models:
        model = final_models[sample_pos]
        pos_df = df[df["position_group"] == sample_pos].sample(
            min(500, (df["position_group"] == sample_pos).sum()), random_state=42
        )
        X_sample = pos_df[FEATURE_COLS].values

        # Use XGB base learner for SHAP (natively supported)
        xgb_model = next(est for name, est in model["bases"] if name == "xgb")
        explainer = shap.TreeExplainer(xgb_model)
        shap_vals = explainer.shap_values(X_sample)

        shap_df = pd.DataFrame(
            np.abs(shap_vals).mean(axis=0),
            index=FEATURE_COLS,
            columns=["mean_abs_shap"],
        ).sort_values("mean_abs_shap", ascending=False)

        print(f"\nTop 10 features by mean |SHAP| ({sample_pos}):")
        print(shap_df.head(10).to_string())

        # Save SHAP importance
        shap_df.to_csv(DATA_PROC / f"shap_importance_{sample_pos.lower()}.csv")
        print(f"  SHAP importance saved.")
    else:
        print(f"  {sample_pos} model not trained — skipping SHAP.")
except ImportError:
    print("  shap not installed — skipping SHAP section.")

# %% [markdown]
# ## 10. Save arbitrage board

# %%
arb_out = arb_df[[
    "player_id", "season", "position_group", "age", "dest_club_tier",
    "actual_fee", "predicted_fair_value", "arbitrage_residual", "arbitrage_pct",
    "market_value_at_snap", "target_market_value",
]].copy()

arb_out.to_parquet(DATA_PROC / "arbitrage_board.parquet", index=False)
print(f"\n✓ Arbitrage board saved: {len(arb_out):,} rows")

with mlflow.start_run(run_name="final_models"):
    mlflow.log_metric("arbitrage_board_rows", len(arb_out))
    mlflow.log_metric("mean_r2_cv", metrics_df["r2"].mean() if len(metrics_df) else -1)
    mlflow.log_artifact(str(model_path))

print("Done.")
