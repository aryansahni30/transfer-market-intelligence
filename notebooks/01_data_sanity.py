"""
Milestone 1 — Data sanity check and fee sparsity analysis.

Run as a script or open in Jupyter as a percent-format notebook.
"""

# %% [markdown]
# # 01 — Data Sanity & Join Validation
#
# Goals:
# 1. Load all raw CSVs and validate row counts / column schema
# 2. Validate key joins (transfers ↔ players, appearances ↔ games)
# 3. Quantify fee sparsity in transfers.csv
# 4. Log summary stats to MLflow

# %%
import os
import sys
from pathlib import Path

import mlflow
import numpy as np
import pandas as pd

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

DATA_RAW = ROOT / "data" / "raw"
DATA_PROC = ROOT / "data" / "processed"
DATA_PROC.mkdir(exist_ok=True)

mlflow.set_tracking_uri(str(ROOT / "mlruns"))
mlflow.set_experiment("01_data_sanity")

# %% [markdown]
# ## 1. Load Raw Data

# %%
print("Loading CSVs...")
appearances = pd.read_csv(DATA_RAW / "appearances.csv", low_memory=False)
players = pd.read_csv(DATA_RAW / "players.csv", low_memory=False)
player_valuations = pd.read_csv(DATA_RAW / "player_valuations.csv", low_memory=False)
games = pd.read_csv(DATA_RAW / "games.csv", low_memory=False)
game_events = pd.read_csv(DATA_RAW / "game_events.csv", low_memory=False)
clubs = pd.read_csv(DATA_RAW / "clubs.csv", low_memory=False)
competitions = pd.read_csv(DATA_RAW / "competitions.csv", low_memory=False)
transfers = pd.read_csv(DATA_RAW / "transfers.csv", low_memory=False)

tables = {
    "appearances": appearances,
    "players": players,
    "player_valuations": player_valuations,
    "games": games,
    "game_events": game_events,
    "clubs": clubs,
    "competitions": competitions,
    "transfers": transfers,
}

print("\n=== Row counts ===")
for name, df in tables.items():
    print(f"  {name:25s} {len(df):>10,} rows  {df.shape[1]} cols")

# %% [markdown]
# ## 2. Schema Inspection

# %%
print("\n=== Column schemas ===")
for name, df in tables.items():
    print(f"\n--- {name} ---")
    print(df.dtypes.to_string())

# %% [markdown]
# ## 3. Fee Sparsity — Critical Check

# %%
print("\n=== Transfer fee sparsity ===")
print(transfers.columns.tolist())

# Detect fee column
fee_col = None
for candidate in ["transfer_fee", "fee", "transfer_fee_in_eur", "fee_eur"]:
    if candidate in transfers.columns:
        fee_col = candidate
        break

if fee_col is None:
    # Try to find any column with 'fee' in the name
    fee_cols = [c for c in transfers.columns if "fee" in c.lower()]
    fee_col = fee_cols[0] if fee_cols else None
    print(f"Fee columns found: {fee_cols}")

if fee_col:
    transfers["_fee_numeric"] = pd.to_numeric(transfers[fee_col], errors="coerce")
    total = len(transfers)
    with_fee = transfers["_fee_numeric"].notna().sum()
    nonzero_fee = (transfers["_fee_numeric"] > 0).sum()
    sparsity = with_fee / total

    print(f"\nFee column: '{fee_col}'")
    print(f"Total transfers:     {total:,}")
    print(f"With any fee value:  {with_fee:,}  ({sparsity:.1%})")
    print(f"With non-zero fee:   {nonzero_fee:,}  ({nonzero_fee/total:.1%})")
    print(f"\nFee distribution (non-zero):")
    print(transfers[transfers["_fee_numeric"] > 0]["_fee_numeric"].describe())

    if sparsity < 0.30:
        print(f"\n⚠️  WARNING: Only {sparsity:.1%} of transfers have a fee.")
        print("   Will use market_value_in_eur as auxiliary target for unlabeled rows.")
    else:
        print(f"\n✓  Fee coverage {sparsity:.1%} — sufficient for training.")
else:
    print("ERROR: No fee column found in transfers.csv!")
    print("Available columns:", transfers.columns.tolist())

# %% [markdown]
# ## 4. Join Validation

# %%
print("\n=== Join validation ===")

# transfers ↔ players
transfer_player_ids = set(transfers["player_id"].dropna().unique())
player_ids = set(players["player_id"].dropna().unique())
matched = transfer_player_ids & player_ids
print(f"transfers.player_id in players: {len(matched):,} / {len(transfer_player_ids):,}  ({len(matched)/len(transfer_player_ids):.1%})")

# appearances ↔ games
app_game_ids = set(appearances["game_id"].dropna().unique())
game_ids = set(games["game_id"].dropna().unique())
matched_games = app_game_ids & game_ids
print(f"appearances.game_id in games:   {len(matched_games):,} / {len(app_game_ids):,}  ({len(matched_games)/len(app_game_ids):.1%})")

# appearances ↔ players
app_player_ids = set(appearances["player_id"].dropna().unique())
matched_players = app_player_ids & player_ids
print(f"appearances.player_id in players: {len(matched_players):,} / {len(app_player_ids):,}  ({len(matched_players)/len(app_player_ids):.1%})")

# player_valuations ↔ players
val_player_ids = set(player_valuations["player_id"].dropna().unique())
matched_val = val_player_ids & player_ids
print(f"player_valuations.player_id in players: {len(matched_val):,} / {len(val_player_ids):,}  ({len(matched_val)/len(val_player_ids):.1%})")

# %% [markdown]
# ## 5. Date range checks

# %%
print("\n=== Date ranges ===")
for name, col in [
    ("appearances", "date"),
    ("transfers", "transfer_date"),
    ("player_valuations", "date"),
    ("games", "date"),
]:
    df = tables[name]
    if col in df.columns:
        dates = pd.to_datetime(df[col], errors="coerce")
        print(f"{name}.{col}: {dates.min().date()} → {dates.max().date()}  ({dates.notna().sum():,} valid)")

# %% [markdown]
# ## 6. game_events schema — confirm structure (not NLP)

# %%
print("\n=== game_events type distribution ===")
print(game_events["type"].value_counts())
print("\nSample columns:", game_events.columns.tolist())
print(game_events.head(3).to_string())

# %% [markdown]
# ## 7. Log summary to MLflow

# %%
with mlflow.start_run(run_name="data_sanity"):
    for name, df in tables.items():
        mlflow.log_metric(f"{name}_rows", len(df))
        mlflow.log_metric(f"{name}_cols", df.shape[1])

    if fee_col:
        mlflow.log_metric("transfer_fee_sparsity", round(sparsity, 4))
        mlflow.log_metric("transfer_fee_nonzero_count", int(nonzero_fee))

    mlflow.log_metric("join_transfers_players_pct", round(len(matched) / len(transfer_player_ids), 4))

print("\n✓ MLflow run logged.")
print("Data sanity check complete.")
