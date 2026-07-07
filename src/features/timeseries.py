"""
Time-series features from player_valuations.csv and appearances.csv.

Month-over-month / year-over-year deltas, value momentum, form trends.
All operations return new DataFrames — no in-place mutation.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


# --- helpers ---

def _pct_change_safe(series: pd.Series) -> pd.Series:
    """Percentage change, clipped to avoid infinite values on zero denominators."""
    return series.pct_change().replace([np.inf, -np.inf], np.nan)


def _rolling_slope(series: pd.Series, window: int) -> pd.Series:
    """Linear slope over a rolling window (least-squares)."""
    def _slope(vals: np.ndarray) -> float:
        if len(vals) < 2 or np.all(np.isnan(vals)):
            return np.nan
        x = np.arange(len(vals), dtype=float)
        mask = ~np.isnan(vals)
        if mask.sum() < 2:
            return np.nan
        return float(np.polyfit(x[mask], vals[mask], deg=1)[0])

    return series.rolling(window, min_periods=2).apply(_slope, raw=True)


# --- valuation-based features ---

def build_valuation_features(valuations: pd.DataFrame) -> pd.DataFrame:
    """
    Build YoY / MoM market value features from player_valuations.

    Input columns: player_id, date, market_value_in_eur
    Returns a new DataFrame sorted by (player_id, date).
    """
    df = valuations[["player_id", "date", "market_value_in_eur"]].copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["player_id", "date"]).reset_index(drop=True)

    grp = df.groupby("player_id", sort=False)

    df["yoy_market_value"] = grp["market_value_in_eur"].transform(
        lambda s: s.pct_change(periods=min(len(s) - 1, 12))
        .replace([np.inf, -np.inf], np.nan)
    )

    df["value_momentum"] = grp["market_value_in_eur"].transform(
        lambda s: _rolling_slope(s, window=3)
    )

    df["market_value_lag1"] = grp["market_value_in_eur"].transform(
        lambda s: s.shift(1)
    )
    df["market_value_delta_abs"] = (
        df["market_value_in_eur"] - df["market_value_lag1"]
    )
    df = df.drop(columns=["market_value_lag1"])

    return df


# --- appearance-based time-series features ---

def build_appearance_timeseries(appearances: pd.DataFrame) -> pd.DataFrame:
    """
    MoM changes in career minutes and goals_per_90 from appearances.

    Input columns: player_id, date, minutes_played, goals
    Returns a new DataFrame.
    """
    df = appearances[["player_id", "date", "minutes_played", "goals"]].copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["player_id", "date"]).reset_index(drop=True)

    df["goals_per_90"] = (df["goals"] / df["minutes_played"].clip(lower=1)) * 90

    # Aggregate to monthly buckets per player for MoM deltas
    df["year_month"] = df["date"].dt.to_period("M")
    monthly = (
        df.groupby(["player_id", "year_month"], sort=False)
        .agg(
            minutes_played=("minutes_played", "sum"),
            goals_per_90=("goals_per_90", "mean"),
        )
        .reset_index()
    )
    monthly = monthly.sort_values(["player_id", "year_month"])

    grp = monthly.groupby("player_id", sort=False)

    monthly["mom_career_minutes"] = grp["minutes_played"].transform(
        _pct_change_safe
    )
    monthly["mom_goals_per_90"] = grp["goals_per_90"].transform(
        _pct_change_safe
    )

    # 3-month rolling performance slope on goals_per_90
    monthly["form_trend_3m"] = grp["goals_per_90"].transform(
        lambda s: _rolling_slope(s, window=3)
    )

    return monthly


def build_seasonal_features(appearances: pd.DataFrame) -> pd.DataFrame:
    """
    Season-over-season goal changes and injury frequency trend.

    Expects appearances to have a 'season' column (e.g. '2022' for 2021/22).
    If missing, derived from date as the year of the August-July season.
    """
    df = appearances.copy()
    df["date"] = pd.to_datetime(df["date"])

    if "season" not in df.columns:
        # Season = year in which the August-July season starts
        df["season"] = df["date"].apply(
            lambda d: d.year if d.month >= 8 else d.year - 1
        )

    season_agg = (
        df.groupby(["player_id", "season"], sort=False)
        .agg(
            total_goals=("goals", "sum"),
            total_minutes=("minutes_played", "sum"),
        )
        .reset_index()
        .sort_values(["player_id", "season"])
    )

    season_agg["season_change_goals"] = season_agg.groupby("player_id")[
        "total_goals"
    ].transform(_pct_change_safe)

    return season_agg


def build_injury_trend(game_events: pd.DataFrame, window_seasons: int = 2) -> pd.DataFrame:
    """
    Injury frequency trend: count of early subs per season, rolling window.

    Input: game_events with columns player_id, date, type, minute
    Returns per-(player_id, season) injury frequency features.
    """
    EARLY_SUB_MINUTE = 70

    subs = game_events[game_events["type"] == "Substitutions"].copy()
    subs["date"] = pd.to_datetime(subs["date"])
    early_subs = subs[subs["minute"] < EARLY_SUB_MINUTE].copy()

    early_subs["season"] = early_subs["date"].apply(
        lambda d: d.year if d.month >= 8 else d.year - 1
    )

    freq = (
        early_subs.groupby(["player_id", "season"])
        .size()
        .rename("injury_sub_count")
        .reset_index()
        .sort_values(["player_id", "season"])
    )

    freq["injury_freq_trend"] = freq.groupby("player_id")[
        "injury_sub_count"
    ].transform(
        lambda s: _rolling_slope(s, window=window_seasons)
    )

    return freq
