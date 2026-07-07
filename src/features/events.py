"""
Structured event features from game_events.csv.

Uses the labeled type/minute columns directly — NOT NLP.
Counts, flags, and recency signals only.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


EARLY_SUB_MINUTE = 70
ROLLING_GAMES = 5
ROLLING_LONG = 10


def build_event_features(
    game_events: pd.DataFrame,
    appearances: pd.DataFrame,
) -> pd.DataFrame:
    """
    Build structured event count / recency features per (player_id, game_id).

    Arguments:
        game_events  — game_events.csv: player_id, game_id, date, type, minute
        appearances  — appearances.csv: player_id, game_id, date (anchor for merge)

    Returns a DataFrame keyed on (player_id, game_id) with event features.
    """
    events = game_events[
        ["player_id", "game_id", "date", "type", "minute"]
    ].copy()
    events["date"] = pd.to_datetime(events["date"])

    apps = appearances[["player_id", "game_id", "date"]].copy()
    apps["date"] = pd.to_datetime(apps["date"])
    apps = apps.sort_values(["player_id", "date"]).reset_index(drop=True)

    # --- injury sub flag: subbed off before EARLY_SUB_MINUTE ---
    subs = events[events["type"] == "Substitutions"].copy()
    early_subs = subs[subs["minute"] < EARLY_SUB_MINUTE][
        ["player_id", "game_id"]
    ].copy()
    early_subs["was_early_sub"] = 1

    # Rolling count of early subs in last ROLLING_GAMES games
    apps = apps.merge(early_subs, on=["player_id", "game_id"], how="left")
    apps["was_early_sub"] = apps["was_early_sub"].fillna(0)

    grp = apps.groupby("player_id", sort=False)
    apps["injury_sub_flag_last_5"] = grp["was_early_sub"].transform(
        lambda s: s.rolling(ROLLING_GAMES, min_periods=1).sum()
    )

    # --- sub_out_rate: pct of games subbed off before 70min ---
    apps["sub_out_rate"] = grp["was_early_sub"].transform(
        lambda s: s.rolling(ROLLING_LONG, min_periods=1).mean()
    )

    # --- days since last card ---
    cards = events[events["type"] == "Cards"][["player_id", "date"]].copy()
    cards = cards.sort_values(["player_id", "date"])
    last_card = (
        cards.groupby("player_id")["date"].last().rename("last_card_date").reset_index()
    )
    apps = apps.merge(last_card, on="player_id", how="left")
    apps["days_since_last_card"] = (
        apps["date"] - apps["last_card_date"]
    ).dt.days.clip(lower=0)
    apps = apps.drop(columns=["last_card_date", "days_since_last_card"])  # already in performance.py

    # --- days since last goal event ---
    goals = events[events["type"] == "Goals"][["player_id", "date"]].copy()
    goals = goals.sort_values(["player_id", "date"])
    last_goal = (
        goals.groupby("player_id")["date"].last().rename("last_goal_date").reset_index()
    )
    apps = apps.merge(last_goal, on="player_id", how="left")
    apps["days_since_last_goal_event"] = (
        apps["date"] - apps["last_goal_date"]
    ).dt.days.clip(lower=0)
    apps = apps.drop(columns=["last_goal_date"])

    # --- red card count this season ---
    red_cards = events[
        (events["type"] == "Cards") & (events["minute"] >= 0)  # all cards; filter later if needed
    ].copy()
    # Approximate: keep card events and count per season
    red_cards["season"] = red_cards["date"].apply(
        lambda d: d.year if d.month >= 8 else d.year - 1
    )
    # Merge season onto apps
    apps["season"] = apps["date"].apply(
        lambda d: d.year if d.month >= 8 else d.year - 1
    )
    red_season = (
        red_cards.groupby(["player_id", "season"])
        .size()
        .rename("red_card_count_season")
        .reset_index()
    )
    apps = apps.merge(red_season, on=["player_id", "season"], how="left")
    apps["red_card_count_season"] = apps["red_card_count_season"].fillna(0).astype(int)
    apps = apps.drop(columns=["season"], errors="ignore")

    # --- goal involvement last 10 (goals + assists rolling) ---
    goal_apps = events[events["type"] == "Goals"][["player_id", "game_id"]].copy()
    goal_apps["goal_event"] = 1
    goal_apps = goal_apps.groupby(["player_id", "game_id"])["goal_event"].sum().reset_index()

    apps = apps.merge(goal_apps, on=["player_id", "game_id"], how="left")
    apps["goal_event"] = apps["goal_event"].fillna(0)

    grp2 = apps.groupby("player_id", sort=False)
    apps["goal_involvement_last_10"] = grp2["goal_event"].transform(
        lambda s: s.rolling(ROLLING_LONG, min_periods=1).sum()
    )
    apps = apps.drop(columns=["goal_event", "was_early_sub"])

    return apps
