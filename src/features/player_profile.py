"""
Player profile features from players.csv and transfers.csv.

Static and semi-static features: age, position, physical, transfer history.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


PEAK_AGE_LOW = 26
PEAK_AGE_HIGH = 28

POSITION_GROUP_MAP = {
    "Goalkeeper": "GK",
    "Centre-Back": "Defender",
    "Left-Back": "Defender",
    "Right-Back": "Defender",
    "Defensive Midfield": "Midfielder",
    "Central Midfield": "Midfielder",
    "Right Midfield": "Midfielder",
    "Left Midfield": "Midfielder",
    "Attacking Midfield": "Midfielder",
    "Left Winger": "Forward",
    "Right Winger": "Forward",
    "Second Striker": "Forward",
    "Centre-Forward": "Forward",
}


def build_player_profile(
    players: pd.DataFrame,
    transfers: pd.DataFrame,
    snapshot_date: pd.Timestamp | str,
) -> pd.DataFrame:
    """
    Build player-level profile features at a given snapshot date.

    Arguments:
        players       — players.csv
        transfers     — transfers.csv
        snapshot_date — date at which to compute age and contract features

    Returns one row per player with profile features.
    """
    snapshot_date = pd.Timestamp(snapshot_date)
    df = players.copy()
    df["date_of_birth"] = pd.to_datetime(df["date_of_birth"], errors="coerce")

    df["age"] = (
        (snapshot_date - df["date_of_birth"]).dt.days / 365.25
    ).round(2)

    peak_mid = (PEAK_AGE_LOW + PEAK_AGE_HIGH) / 2.0
    df["age_peak_delta"] = (df["age"] - peak_mid).round(2)

    df["position_group"] = (
        df["position"].map(POSITION_GROUP_MAP).fillna("Unknown")
    )

    foot_map = {"right": 0, "left": 1, "both": 2}
    df["foot_encoded"] = df["foot"].str.lower().map(foot_map).fillna(-1).astype(int)

    df["height"] = pd.to_numeric(df.get("height_in_cm", df.get("height")), errors="coerce")

    # Transfer history aggregates
    t = transfers.copy()
    t["transfer_fee"] = pd.to_numeric(t["transfer_fee"], errors="coerce")
    t["transfer_date"] = pd.to_datetime(t["transfer_date"], errors="coerce")

    # Only transfers before snapshot
    t_past = t[t["transfer_date"] <= snapshot_date]

    transfer_counts = (
        t_past.groupby("player_id")
        .size()
        .rename("transfer_count")
        .reset_index()
    )
    avg_fees = (
        t_past[t_past["transfer_fee"].notna()]
        .groupby("player_id")["transfer_fee"]
        .mean()
        .rename("avg_historical_fee")
        .reset_index()
    )

    df = df.merge(transfer_counts, on="player_id", how="left")
    df = df.merge(avg_fees, on="player_id", how="left")
    df["transfer_count"] = df["transfer_count"].fillna(0).astype(int)

    # Contract years remaining (if contract_expiry_date present)
    if "contract_expiry_date" in df.columns:
        df["contract_expiry_date"] = pd.to_datetime(
            df["contract_expiry_date"], errors="coerce"
        )
        df["contract_years_remaining"] = (
            (df["contract_expiry_date"] - snapshot_date).dt.days / 365.25
        ).clip(lower=0).round(2)
    else:
        df["contract_years_remaining"] = np.nan

    # International caps from players.csv (last known count)
    if "international_caps" not in df.columns:
        df["international_caps"] = np.nan

    keep = [
        "player_id",
        "age",
        "age_peak_delta",
        "position_group",
        "foot_encoded",
        "height",
        "international_caps",
        "transfer_count",
        "avg_historical_fee",
        "contract_years_remaining",
    ]
    keep = [c for c in keep if c in df.columns]
    return df[keep]
