"""
Milestone 3 — Master feature table builder.

Joins all feature groups and writes data/processed/features_master.parquet.
This table feeds the arbitrage model training (notebook 06).
"""

# %% [markdown]
# # 05 — Feature Engineering
#
# Builds the master feature table by:
# 1. Computing per-90 + rolling stats from appearances
# 2. Adding recency signals from game_events
# 3. Joining club-strength features
# 4. Joining player valuations (time-series features)
# 5. Joining player profile (age, position, physical)
# 6. Aligning to transfer events as the prediction anchor

# %%
import sys
from pathlib import Path

import mlflow
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

DATA_RAW = ROOT / "data" / "raw"
DATA_PROC = ROOT / "data" / "processed"
DATA_PROC.mkdir(exist_ok=True)

mlflow.set_tracking_uri(str(ROOT / "mlruns"))
mlflow.set_experiment("05_feature_engineering")

CUTOFF_DATE = pd.Timestamp("2025-01-01")  # filter out future-dated transfers

# %% [markdown]
# ## 1. Load Raw Data

# %%
print("Loading raw data...")
appearances = pd.read_csv(DATA_RAW / "appearances.csv", low_memory=False)
players = pd.read_csv(DATA_RAW / "players.csv", low_memory=False)
player_valuations = pd.read_csv(DATA_RAW / "player_valuations.csv", low_memory=False)
games = pd.read_csv(DATA_RAW / "games.csv", low_memory=False)
game_events = pd.read_csv(DATA_RAW / "game_events.csv", low_memory=False)
clubs = pd.read_csv(DATA_RAW / "clubs.csv", low_memory=False)
competitions = pd.read_csv(DATA_RAW / "competitions.csv", low_memory=False)
transfers = pd.read_csv(DATA_RAW / "transfers.csv", low_memory=False)

# Parse dates
appearances["date"] = pd.to_datetime(appearances["date"], errors="coerce")
game_events["date"] = pd.to_datetime(game_events["date"], errors="coerce")
player_valuations["date"] = pd.to_datetime(player_valuations["date"], errors="coerce")
transfers["transfer_date"] = pd.to_datetime(transfers["transfer_date"], errors="coerce")

print(f"Loaded. Appearances: {len(appearances):,}  Transfers: {len(transfers):,}")

# %% [markdown]
# ## 2. Filter transfers to historical + disclosed fees

# %%
transfers["transfer_fee_eur"] = pd.to_numeric(transfers["transfer_fee"], errors="coerce")
transfers["market_value_at_transfer"] = pd.to_numeric(transfers["market_value_in_eur"], errors="coerce")

# Filter out future-dated
transfers = transfers[transfers["transfer_date"] <= CUTOFF_DATE].copy()

# Season from transfer date (August-July calendar)
transfers["season"] = transfers["transfer_date"].apply(
    lambda d: d.year if d.month >= 7 else d.year - 1
)

# Keep only domestic-competition transfers (exclude loan moves if possible)
# We'll keep all but flag free transfers
transfers["has_actual_fee"] = (transfers["transfer_fee_eur"] > 0).astype(int)

print(f"Transfers after {CUTOFF_DATE.date()} cutoff: {len(transfers):,}")
print(f"With actual fee (>0): {transfers['has_actual_fee'].sum():,}")
print(f"Date range: {transfers['transfer_date'].min().date()} → {transfers['transfer_date'].max().date()}")

# %% [markdown]
# ## 3. Per-player performance snapshot at transfer date
#
# For each transfer, compute rolling performance stats using only
# appearances BEFORE the transfer date (no leakage).

# %%
from src.features.performance import build_per90_features, build_recency_features, build_role_features

print("Building per-90 features from appearances...")
apps_perf = build_per90_features(appearances)
apps_perf = build_role_features(apps_perf)
print(f"  Performance features: {apps_perf.shape}")

print("Building recency features from game_events...")
apps_perf = build_recency_features(apps_perf, game_events)
print(f"  With recency: {apps_perf.shape}")

# %% [markdown]
# ## 4. Event-level features

# %%
from src.features.events import build_event_features

print("Building event features...")
event_feats = build_event_features(game_events, appearances[["player_id", "game_id", "date"]])
print(f"  Event features: {event_feats.shape}")

# Merge event features onto appearances
apps_perf = apps_perf.merge(
    event_feats.drop(columns=["date"], errors="ignore"),
    on=["player_id", "game_id"],
    how="left",
)
print(f"  Merged: {apps_perf.shape}")

# %% [markdown]
# ## 5. Build transfer-anchored feature snapshot
#
# For each transfer row, find the player's most recent appearance
# BEFORE the transfer date and attach those features.

# %%
def get_snapshot_at_date(
    perf_df: pd.DataFrame,
    player_id: int,
    before_date: pd.Timestamp,
    lookback_days: int = 365,
) -> pd.Series | None:
    """
    Return the most recent performance snapshot for a player
    before a given date (within lookback_days window).
    """
    mask = (
        (perf_df["player_id"] == player_id)
        & (perf_df["date"] < before_date)
        & (perf_df["date"] >= before_date - pd.Timedelta(days=lookback_days))
    )
    rows = perf_df[mask]
    if rows.empty:
        return None
    return rows.sort_values("date").iloc[-1]


print("Building transfer-anchored feature snapshots...")
print("  (This may take a few minutes for large datasets)")

# Group perf_df by player for fast lookup
perf_by_player = {
    pid: grp.sort_values("date")
    for pid, grp in apps_perf.groupby("player_id")
}

PERF_COLS = [
    "goals_per_90", "assists_per_90", "cards_per_90",
    "goals_per_90_roll5", "goals_per_90_roll10",
    "assists_per_90_roll5", "assists_per_90_roll10",
    "minutes_last_5", "goals_last_5", "goals_last_10",
    "performance_trend", "career_minutes",
    "days_since_last_goal", "days_since_last_card",
    "days_since_last_injury_sub", "days_at_current_club",
    "starter_rate",
    # event features
    "injury_sub_flag_last_5", "sub_out_rate",
    "days_since_last_goal_event",
    "red_card_count_season", "goal_involvement_last_10",
]

snapshots = []
for _, transfer in transfers.iterrows():
    pid = transfer["player_id"]
    tdate = transfer["transfer_date"]

    if pd.isna(tdate) or pd.isna(pid):
        continue

    row = {"player_id": int(pid), "transfer_date": tdate}

    grp = perf_by_player.get(pid)
    if grp is not None:
        before = grp[grp["date"] < tdate]
        if not before.empty:
            latest = before.iloc[-1]
            for col in PERF_COLS:
                row[col] = latest.get(col, np.nan)

    snapshots.append(row)

snap_df = pd.DataFrame(snapshots)
print(f"  Snapshots: {len(snap_df):,}")

# %% [markdown]
# ## 6. Join player valuations snapshot at transfer date

# %%
print("Joining market value at transfer date...")

val_sorted = player_valuations.sort_values(["player_id", "date"])

def get_val_at_transfer(pid: int, tdate: pd.Timestamp) -> float | None:
    mask = (val_sorted["player_id"] == pid) & (val_sorted["date"] <= tdate)
    rows = val_sorted[mask]
    if rows.empty:
        return None
    return float(rows.iloc[-1]["market_value_in_eur"])

# Vectorised approach: merge_asof per player
val_for_merge = player_valuations[["player_id", "date", "market_value_in_eur"]].copy()
val_for_merge = val_for_merge.sort_values("date")  # merge_asof requires global sort on `on` key

snap_df = snap_df.sort_values("transfer_date")  # global sort on `on` key required
snap_df = pd.merge_asof(
    snap_df,
    val_for_merge.rename(columns={"date": "transfer_date", "market_value_in_eur": "market_value_at_snap"}),
    on="transfer_date",
    by="player_id",
    direction="backward",
)
print(f"  Market value coverage: {snap_df['market_value_at_snap'].notna().mean():.1%}")

# %% [markdown]
# ## 7. Join player profile features

# %%
from src.features.player_profile import build_player_profile

print("Building player profile features...")
# Use most recent transfer date per player as snapshot date for profile
# (simpler approach: use each transfer's date)

profile_cols = [
    "player_id", "age", "age_peak_delta", "position_group",
    "foot_encoded", "height_in_cm", "international_caps",
    "transfer_count", "avg_historical_fee", "contract_years_remaining",
]

# We'll compute profile per transfer row (age changes over time)
players_cp = players.copy()
players_cp["date_of_birth"] = pd.to_datetime(players_cp["date_of_birth"], errors="coerce")

transfers_for_profile = transfers[["player_id", "transfer_date", "transfer_fee_eur", "market_value_at_transfer", "season", "has_actual_fee", "to_club_id"]].copy()

# Compute age at transfer
transfers_for_profile = transfers_for_profile.merge(
    players_cp[["player_id", "date_of_birth", "position", "foot", "height_in_cm",
                "international_caps", "sub_position"]].drop_duplicates("player_id"),
    on="player_id",
    how="left",
)
transfers_for_profile["age"] = (
    (transfers_for_profile["transfer_date"] - transfers_for_profile["date_of_birth"]).dt.days / 365.25
).round(2)

PEAK_MID = 27.0
transfers_for_profile["age_peak_delta"] = (transfers_for_profile["age"] - PEAK_MID).round(2)

POSITION_GROUP_MAP = {
    "Goalkeeper": "GK",
    "Centre-Back": "Defender", "Left-Back": "Defender", "Right-Back": "Defender",
    "Defensive Midfield": "Midfielder", "Central Midfield": "Midfielder",
    "Right Midfield": "Midfielder", "Left Midfield": "Midfielder",
    "Attacking Midfield": "Midfielder",
    "Left Winger": "Forward", "Right Winger": "Forward",
    "Second Striker": "Forward", "Centre-Forward": "Forward",
}
transfers_for_profile["position_group"] = (
    transfers_for_profile["sub_position"].map(POSITION_GROUP_MAP).fillna("Unknown")
)
FOOT_MAP = {"right": 0, "left": 1, "both": 2}
transfers_for_profile["foot_encoded"] = (
    transfers_for_profile["foot"].str.lower().map(FOOT_MAP).fillna(-1).astype(int)
)

print(f"  Profile features built: {transfers_for_profile.shape}")

# %% [markdown]
# ## 8. Join club features

# %%
from src.features.club import COMPETITION_TIER_MAP, DEFAULT_TIER

print("Joining club tier features...")
clubs_cp = clubs.copy()
clubs_cp["club_league_tier"] = clubs_cp["domestic_competition_id"].map(
    COMPETITION_TIER_MAP
).fillna(DEFAULT_TIER).astype(int)

# Merge destination club tier onto transfers
transfers_for_profile = transfers_for_profile.merge(
    clubs_cp[["club_id", "club_league_tier"]].rename(
        columns={"club_id": "to_club_id", "club_league_tier": "dest_club_tier"}
    ),
    left_on="to_club_id",
    right_on="to_club_id",
    how="left",
)

# %% [markdown]
# ## 9. Assemble master feature table

# %%
print("Assembling master feature table...")

master = transfers_for_profile.merge(snap_df, on=["player_id", "transfer_date"], how="inner")

# Target columns
master["target_fee"] = master["transfer_fee_eur"]
master["target_market_value"] = master["market_value_at_snap"].fillna(
    master["market_value_at_transfer"]
)

# Drop rows where we have no target at all
master = master.dropna(subset=["target_market_value"])

print(f"\n=== Master Feature Table ===")
print(f"Total rows: {len(master):,}")
print(f"With actual fee: {master['has_actual_fee'].sum():,} ({master['has_actual_fee'].mean():.1%})")
print(f"Seasons covered: {sorted(master['season'].unique())}")
print(f"Position groups: {master['position_group'].value_counts().to_dict()}")
print(f"\nFeature columns: {len(master.columns)}")
print(f"Missing value rates (top 15):")
missing = master.isna().mean().sort_values(ascending=False)
print(missing.head(15).to_string())

# %% [markdown]
# ## 10. Save

# %%
out_path = DATA_PROC / "features_master.parquet"
master.to_parquet(out_path, index=False)
print(f"\n✓ Saved to {out_path}  ({len(master):,} rows)")

with mlflow.start_run(run_name="feature_engineering"):
    mlflow.log_metric("master_rows", len(master))
    mlflow.log_metric("rows_with_actual_fee", int(master["has_actual_fee"].sum()))
    mlflow.log_metric("fee_coverage", round(master["has_actual_fee"].mean(), 4))
    mlflow.log_param("cutoff_date", str(CUTOFF_DATE.date()))
    mlflow.log_param("output_path", str(out_path))

print("✓ MLflow run logged.")
