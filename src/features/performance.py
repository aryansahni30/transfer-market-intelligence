"""
Performance features from appearances.csv.

Per-90 stats, rolling windows, and trend slopes.
All operations return new DataFrames — no in-place mutation.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


# --- constants ---

ROLLING_SHORT = 5
ROLLING_LONG = 10
PEAK_AGE_LOW = 26
PEAK_AGE_HIGH = 28
EARLY_SUB_MINUTE = 70


# --- helpers ---

def _per_90(series: pd.Series, minutes: pd.Series) -> pd.Series:
    """Normalise a counting stat to per-90 minutes."""
    return (series / minutes.clip(lower=1)) * 90


def _rolling_slope(series: pd.Series, window: int) -> pd.Series:
    """
    Linear slope of a rolling window via least-squares.
    Returns NaN when fewer than window observations are available.
    """
    def _slope(vals: np.ndarray) -> float:
        if len(vals) < window or np.all(np.isnan(vals)):
            return np.nan
        x = np.arange(len(vals), dtype=float)
        mask = ~np.isnan(vals)
        if mask.sum() < 2:
            return np.nan
        coeffs = np.polyfit(x[mask], vals[mask], deg=1)
        return float(coeffs[0])

    return series.rolling(window, min_periods=2).apply(_slope, raw=True)


# --- main feature builders ---

def build_per90_features(appearances: pd.DataFrame) -> pd.DataFrame:
    """
    Build per-90 stats and rolling aggregates from appearances.

    Input columns expected:
        player_id, date, minutes_played, goals, assists,
        yellow_cards, red_cards

    Returns a new DataFrame with one row per (player_id, date) observation.
    """
    df = appearances.copy()
    df = df.sort_values(["player_id", "date"]).reset_index(drop=True)

    df["goals_per_90"] = _per_90(df["goals"], df["minutes_played"])
    df["assists_per_90"] = _per_90(df["assists"], df["minutes_played"])
    df["cards_per_90"] = _per_90(
        df["yellow_cards"] + df["red_cards"], df["minutes_played"]
    )

    grp = df.groupby("player_id", sort=False)

    for col in ("goals_per_90", "assists_per_90", "cards_per_90"):
        df[f"{col}_roll{ROLLING_SHORT}"] = grp[col].transform(
            lambda s: s.rolling(ROLLING_SHORT, min_periods=1).mean()
        )
        df[f"{col}_roll{ROLLING_LONG}"] = grp[col].transform(
            lambda s: s.rolling(ROLLING_LONG, min_periods=1).mean()
        )

    df["minutes_last_5"] = grp["minutes_played"].transform(
        lambda s: s.rolling(ROLLING_SHORT, min_periods=1).sum()
    )
    df["goals_last_5"] = grp["goals"].transform(
        lambda s: s.rolling(ROLLING_SHORT, min_periods=1).sum()
    )
    df["goals_last_10"] = grp["goals"].transform(
        lambda s: s.rolling(ROLLING_LONG, min_periods=1).sum()
    )

    df["performance_trend"] = grp["goals_per_90"].transform(
        lambda s: _rolling_slope(s, ROLLING_LONG)
    )

    df["career_minutes"] = grp["minutes_played"].transform("cumsum")

    return df


def build_recency_features(
    appearances: pd.DataFrame,
    game_events: pd.DataFrame,
) -> pd.DataFrame:
    """
    Days-since features: last goal, last card, last injury sub.

    Joins appearances with game_events to derive event-recency signals.
    Returns a new DataFrame keyed on (player_id, date).
    """
    appearances = appearances.copy()
    appearances["date"] = pd.to_datetime(appearances["date"])

    # --- last goal event ---
    goals = game_events[game_events["type"] == "Goals"][
        ["player_id", "date"]
    ].copy()
    goals["date"] = pd.to_datetime(goals["date"])
    goals = goals.sort_values(["player_id", "date"])
    goals = goals.rename(columns={"date": "last_goal_date"})
    goals = goals.groupby("player_id")["last_goal_date"].last().reset_index()

    appearances = appearances.merge(goals, on="player_id", how="left")
    appearances["days_since_last_goal"] = (
        appearances["date"] - appearances["last_goal_date"]
    ).dt.days.clip(lower=0)
    appearances = appearances.drop(columns=["last_goal_date"])

    # --- last card ---
    cards = game_events[game_events["type"].isin(["Cards"])][
        ["player_id", "date"]
    ].copy()
    cards["date"] = pd.to_datetime(cards["date"])
    cards = cards.sort_values(["player_id", "date"])
    cards = cards.rename(columns={"date": "last_card_date"})
    cards = cards.groupby("player_id")["last_card_date"].last().reset_index()

    appearances = appearances.merge(cards, on="player_id", how="left")
    appearances["days_since_last_card"] = (
        appearances["date"] - appearances["last_card_date"]
    ).dt.days.clip(lower=0)
    appearances = appearances.drop(columns=["last_card_date"])

    # --- injury substitution (subbed off before EARLY_SUB_MINUTE) ---
    subs = game_events[game_events["type"] == "Substitutions"].copy()
    subs["date"] = pd.to_datetime(subs["date"])
    injury_subs = subs[subs["minute"] < EARLY_SUB_MINUTE][["player_id", "date"]].copy()
    injury_subs = injury_subs.sort_values(["player_id", "date"])
    injury_subs = injury_subs.rename(columns={"date": "last_injury_sub_date"})
    injury_subs = (
        injury_subs.groupby("player_id")["last_injury_sub_date"].last().reset_index()
    )

    appearances = appearances.merge(injury_subs, on="player_id", how="left")
    appearances["days_since_last_injury_sub"] = (
        appearances["date"] - appearances["last_injury_sub_date"]
    ).dt.days.clip(lower=0)
    appearances = appearances.drop(columns=["last_injury_sub_date"])

    return appearances


def build_role_features(appearances: pd.DataFrame) -> pd.DataFrame:
    """
    Starter rate and club tenure from appearances.

    Input columns: player_id, date, minutes_played, player_current_club_id
    Returns a new DataFrame with additional columns.
    """
    df = appearances.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["player_id", "date"])

    df["is_starter"] = (df["minutes_played"] >= 60).astype(int)
    grp = df.groupby("player_id", sort=False)

    df["starter_rate"] = grp["is_starter"].transform(
        lambda s: s.rolling(ROLLING_LONG, min_periods=1).mean()
    )

    # Days at current club: days since player first appeared for this club
    df["club_join_date"] = grp["player_current_club_id"].transform(
        lambda s: s.where(s != s.shift()).ffill()
    )
    # Map first appearance date per (player, club) block
    first_app = (
        df.groupby(["player_id", "player_current_club_id"])["date"]
        .min()
        .rename("first_club_date")
        .reset_index()
    )
    df = df.merge(first_app, on=["player_id", "player_current_club_id"], how="left")
    df["days_at_current_club"] = (df["date"] - df["first_club_date"]).dt.days.clip(
        lower=0
    )
    df = df.drop(columns=["club_join_date", "first_club_date"])

    return df
