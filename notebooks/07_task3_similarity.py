"""
Milestone 3 — Player Similarity Engine (Task 3).

Builds a FAISS IndexFlatIP (cosine similarity) over player performance
embeddings.  Also computes UMAP 2-D projection for frontend visualization.

Run:
    MLFLOW_ALLOW_FILE_STORE=true venv/bin/python3 notebooks/07_task3_similarity.py
"""

# %% [markdown]
# # 07 — Player Similarity Engine

# %%
import sys
from pathlib import Path

import joblib
import mlflow
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

DATA_PROC = ROOT / "data" / "processed"
MODELS_DIR = ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)

mlflow.set_tracking_uri(str(ROOT / "mlruns"))
mlflow.set_experiment("07_similarity")

# %% [markdown]
# ## 1. Load features

# %%
print("Loading features_master.parquet...")
df = pd.read_parquet(DATA_PROC / "features_master.parquet")
print(f"  {len(df):,} rows")

# Deduplicate: keep most recent transfer per player
df_sorted = df.sort_values("transfer_date")
player_snap = df_sorted.groupby("player_id").last().reset_index()
print(f"  Unique players: {len(player_snap):,}")

# %% [markdown]
# ## 2. Define embedding features

# %%
EMBEDDING_FEATURES = [
    "goals_per_90", "assists_per_90", "cards_per_90",
    "goals_per_90_roll5", "assists_per_90_roll5",
    "minutes_last_5", "starter_rate",
    "performance_trend",
    "injury_sub_flag_last_5", "sub_out_rate",
    "goal_involvement_last_10",
    "age", "age_peak_delta",
    "career_minutes",
]

# Keep only players where we have enough features
valid_cols = [c for c in EMBEDDING_FEATURES if c in player_snap.columns]
print(f"Embedding features ({len(valid_cols)}): {valid_cols}")

# Impute with column medians
medians = player_snap[valid_cols].median()
embed_df = player_snap[["player_id", "position_group"] + valid_cols].copy()
embed_df[valid_cols] = embed_df[valid_cols].fillna(medians)

print(f"  Players with embeddings: {len(embed_df):,}")

# %% [markdown]
# ## 3. Scale and L2-normalize for cosine similarity

# %%
scaler = StandardScaler()
X = scaler.fit_transform(embed_df[valid_cols].values).astype(np.float32)

# L2-normalize so IndexFlatIP gives cosine similarity
norms = np.linalg.norm(X, axis=1, keepdims=True)
norms = np.where(norms == 0, 1.0, norms)
X_normed = (X / norms).astype(np.float32)

print(f"  Embedding matrix: {X_normed.shape}  dtype={X_normed.dtype}")

# %% [markdown]
# ## 4. Build FAISS index

# %%
try:
    import faiss

    dim = X_normed.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(X_normed)
    print(f"FAISS IndexFlatIP built: {index.ntotal:,} vectors  dim={dim}")
    USE_FAISS = True
except ImportError:
    print("FAISS not installed — using sklearn cosine similarity as fallback.")
    USE_FAISS = False
    index = None

# %% [markdown]
# ## 5. Validation: find similar players for a sample

# %%
def find_similar(
    query_player_id: int,
    k: int = 10,
    cheaper_only: bool = False,
    arb_df: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """Return k most similar players to query_player_id."""
    if query_player_id not in embed_df["player_id"].values:
        return pd.DataFrame()

    q_idx = embed_df.index[embed_df["player_id"] == query_player_id][0]
    q_vec = X_normed[embed_df.index.get_loc(q_idx)].reshape(1, -1)

    if USE_FAISS:
        scores, indices = index.search(q_vec, k + 1)
        scores = scores[0]
        indices = indices[0]
    else:
        from sklearn.metrics.pairwise import cosine_similarity
        sims = cosine_similarity(q_vec, X_normed)[0]
        indices = np.argsort(sims)[::-1][: k + 1]
        scores = sims[indices]

    results = []
    for score, idx in zip(scores, indices):
        pid = int(embed_df.iloc[idx]["player_id"])
        if pid == query_player_id:
            continue
        results.append({"player_id": pid, "similarity": float(score)})

    result_df = pd.DataFrame(results[:k])
    return result_df


# Pick the player with most complete features for demo
sample_id = int(embed_df.dropna().iloc[0]["player_id"])
similar = find_similar(sample_id, k=5)
print(f"\nSample similarity query for player_id={sample_id}:")
print(similar.to_string(index=False))

# %% [markdown]
# ## 6. UMAP 2-D projection

# %%
print("\nComputing UMAP 2-D projection...")
try:
    import umap

    reducer = umap.UMAP(n_components=2, n_neighbors=15, min_dist=0.1,
                        metric="cosine", random_state=42, verbose=False)
    coords_2d = reducer.fit_transform(X_normed)
    embed_df["umap_x"] = coords_2d[:, 0]
    embed_df["umap_y"] = coords_2d[:, 1]
    print(f"  UMAP done. Shape: {coords_2d.shape}")
    USE_UMAP = True
except ImportError:
    print("  umap-learn not installed — skipping UMAP.")
    USE_UMAP = False

# %% [markdown]
# ## 7. Save similarity engine artifacts

# %%
print("\nSaving similarity engine...")

sim_payload = {
    "player_ids": embed_df["player_id"].values,
    "position_groups": embed_df["position_group"].values,
    "feature_cols": valid_cols,
    "scaler": scaler,
    "X_normed": X_normed,
    "use_faiss": USE_FAISS,
}

if USE_UMAP:
    sim_payload["umap_x"] = embed_df["umap_x"].values
    sim_payload["umap_y"] = embed_df["umap_y"].values

sim_path = MODELS_DIR / "similarity_engine.joblib"
joblib.dump(sim_payload, sim_path)
print(f"  Saved to {sim_path}")

if USE_FAISS:
    faiss.write_index(index, str(MODELS_DIR / "faiss.index"))
    print(f"  FAISS index saved to {MODELS_DIR / 'faiss.index'}")

# Save UMAP coords for frontend scatter plot
if USE_UMAP:
    umap_out = embed_df[["player_id", "position_group", "umap_x", "umap_y"]].copy()
    umap_out.to_parquet(DATA_PROC / "umap_coords.parquet", index=False)
    print(f"  UMAP coords saved: {len(umap_out):,} players")

# %% [markdown]
# ## 8. Enrich arbitrage board with player metadata

# %%
print("\nEnriching arbitrage board with player metadata...")
arb_df = pd.read_parquet(DATA_PROC / "arbitrage_board.parquet")

# Join player names from original players CSV
players_raw = pd.read_csv(ROOT / "data" / "raw" / "players.csv", low_memory=False)
players_meta = players_raw[["player_id", "name", "sub_position", "current_club_name",
                             "market_value_in_eur"]].drop_duplicates("player_id")

arb_df = arb_df.merge(players_meta, on="player_id", how="left")

# Join competition info for from/to clubs
transfers_raw = pd.read_csv(ROOT / "data" / "raw" / "transfers.csv", low_memory=False)
transfers_raw["transfer_date"] = pd.to_datetime(transfers_raw["transfer_date"], errors="coerce")
transfers_raw["transfer_fee_eur"] = pd.to_numeric(transfers_raw["transfer_fee"], errors="coerce")
transfers_raw = transfers_raw[transfers_raw["transfer_fee_eur"] > 0]

xfer_meta = transfers_raw[["player_id", "transfer_date", "from_club_name",
                            "to_club_name"]].sort_values(["player_id", "transfer_date"])
# Keep the matching transfer (latest per player per season)
xfer_meta["season"] = xfer_meta["transfer_date"].apply(
    lambda d: d.year if d.month >= 7 else d.year - 1
)
xfer_meta = xfer_meta.drop_duplicates(["player_id", "season"], keep="last")

arb_df = arb_df.merge(xfer_meta[["player_id", "season", "from_club_name", "to_club_name"]],
                      on=["player_id", "season"], how="left")

arb_df.to_parquet(DATA_PROC / "arbitrage_board.parquet", index=False)
print(f"  Arbitrage board enriched: {len(arb_df):,} rows")
print(f"  Columns: {arb_df.columns.tolist()}")

# %% [markdown]
# ## 9. Build players_enriched.parquet for API

# %%
print("\nBuilding players_enriched.parquet for API...")

# Start from players metadata
players_enriched = players_meta.copy()

# Join latest arbitrage prediction per player
latest_arb = (
    arb_df.sort_values("season")
    .groupby("player_id")
    .last()
    .reset_index()
)[["player_id", "predicted_fair_value", "actual_fee", "arbitrage_residual",
   "arbitrage_pct", "position_group", "age", "dest_club_tier", "season"]]

players_enriched = players_enriched.merge(latest_arb, on="player_id", how="left")

# Join UMAP coords if available
if USE_UMAP:
    players_enriched = players_enriched.merge(
        umap_out[["player_id", "umap_x", "umap_y"]], on="player_id", how="left"
    )

players_enriched.to_parquet(DATA_PROC / "players_enriched.parquet", index=False)
print(f"  players_enriched.parquet: {len(players_enriched):,} players")

with mlflow.start_run(run_name="similarity_engine"):
    mlflow.log_metric("n_players", len(embed_df))
    mlflow.log_metric("embedding_dim", X_normed.shape[1])
    mlflow.log_param("use_faiss", USE_FAISS)
    mlflow.log_param("use_umap", USE_UMAP)

print("\nDone — similarity engine built and all processed data saved.")
