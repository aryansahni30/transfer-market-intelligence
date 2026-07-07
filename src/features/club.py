"""
Club-strength features from clubs.csv, competitions.csv, games.csv.

Returns new DataFrames — no in-place mutation.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


# Competition prestige tiers (1 = top, 5 = lower).
# Mapping from competition_id prefix / name patterns — extend as needed.
COMPETITION_TIER_MAP: dict[str, int] = {
    # Tier 1 — big 5 + major leagues
    "GB1": 1,  # Premier League (England)
    "ES1": 1,  # La Liga (Spain)
    "L1":  1,  # Bundesliga (Germany)
    "IT1": 1,  # Serie A (Italy)
    "FR1": 1,  # Ligue 1 (France)
    # Tier 2 — strong leagues
    "PO1": 2,  # Primeira Liga (Portugal)
    "NL1": 2,  # Eredivisie (Netherlands)
    "TR1": 2,  # Süper Lig (Turkey)
    "RU1": 2,  # Premier Liga (Russia)
    "BE1": 2,  # Jupiler Pro League (Belgium)
    "SC1": 2,  # Scottish Premiership
    "GR1": 2,  # Super League 1 (Greece)
    "RO1": 2,  # Superliga (Romania)
    "UKR1": 2, # Premier Liga (Ukraine)
    "PL1": 2,  # Ekstraklasa (Poland)
    "A1":  2,  # Bundesliga (Austria)
    # Tier 3 — second/third divisions + mid leagues
    "NO1": 3,  # Eliteserien (Norway)
    "SE1": 3,  # Allsvenskan (Sweden)
    "DK1": 3,  # Superliga (Denmark)
    "C1":  3,  # Super League (Switzerland)
    "TS1": 3,  # Chance Liga (Czech Republic)
    "SER1": 3, # Super Liga (Serbia)
    "KR1": 3,  # Supersport HNL (Croatia)
    # Tier 4 — other domestic + Americas/Asia
    "ARG1": 4, "BRA1": 4, "MEX1": 4, "MLS1": 4,
    "JAP1": 4, "RSK1": 4, "SA1": 4, "AUS1": 4,
}
DEFAULT_TIER = 5

CONTINENTAL_COMPETITIONS = {"CL", "EL", "UCOL"}  # Champions League, Europa, Conference


def build_club_features(
    clubs: pd.DataFrame,
    competitions: pd.DataFrame,
    games: pd.DataFrame,
) -> pd.DataFrame:
    """
    Build per-club features: league tier, recent form, continental flag, total squad value.

    Arguments:
        clubs        — clubs.csv (club_id, domestic_competition_id, total_market_value, ...)
        competitions — competitions.csv (competition_id, type, ...)
        games        — games.csv (game_id, home_club_id, away_club_id, date,
                                   home_club_goals, away_club_goals, ...)

    Returns DataFrame keyed on (club_id, season).
    """
    clubs = clubs.copy()
    competitions = competitions.copy()
    games = games.copy()

    # --- league tier ---
    competitions["tier"] = competitions["competition_id"].map(
        COMPETITION_TIER_MAP
    ).fillna(DEFAULT_TIER).astype(int)

    clubs = clubs.merge(
        competitions[["competition_id", "tier"]],
        left_on="domestic_competition_id",
        right_on="competition_id",
        how="left",
    )
    clubs["club_league_tier"] = clubs["tier"].fillna(DEFAULT_TIER).astype(int)
    clubs = clubs.drop(columns=["competition_id", "tier"], errors="ignore")

    # --- continental flag ---
    # Assume clubs.csv has 'squad_size' or a flag column; derive from games
    games["date"] = pd.to_datetime(games["date"])
    games["season"] = games["date"].apply(
        lambda d: d.year if d.month >= 8 else d.year - 1
    )

    continental = set()
    if "competition_id" in games.columns:
        cont_games = games[games["competition_id"].isin(CONTINENTAL_COMPETITIONS)]
        continental = set(
            pd.concat(
                [cont_games["home_club_id"], cont_games["away_club_id"]]
            ).unique()
        )

    clubs["club_continental_participation"] = clubs["club_id"].isin(continental).astype(int)

    # --- recent form: points per game last 10 matches ---
    form = _build_recent_form(games, window=10)

    # --- season-level squad value (use club-level total_market_value if available) ---
    if "total_market_value" in clubs.columns:
        clubs["club_total_market_value"] = (
            pd.to_numeric(clubs["total_market_value"], errors="coerce")
        )

    result = clubs.merge(form, on="club_id", how="left")
    return result


def build_squad_depth_rank(
    player_valuations: pd.DataFrame,
) -> pd.DataFrame:
    """
    Rank each player within their club by current market value.

    Returns per-(player_id, date) rank (1 = most valuable at club).
    """
    df = player_valuations[
        ["player_id", "date", "current_club_id", "market_value_in_eur"]
    ].copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["current_club_id", "date", "market_value_in_eur"])

    df["squad_depth_rank"] = df.groupby(
        ["current_club_id", "date"], sort=False
    )["market_value_in_eur"].rank(method="dense", ascending=False)

    return df


def build_competition_avg_value(
    player_valuations: pd.DataFrame,
    players: pd.DataFrame,
    clubs: pd.DataFrame,
) -> pd.DataFrame:
    """
    Average player market value per competition, per date snapshot.

    Returns per-(competition_id, date) average value.
    """
    pv = player_valuations[
        ["player_id", "date", "current_club_id", "market_value_in_eur"]
    ].copy()
    pv["date"] = pd.to_datetime(pv["date"])

    club_comp = clubs[["club_id", "domestic_competition_id"]].copy()
    pv = pv.merge(
        club_comp,
        left_on="current_club_id",
        right_on="club_id",
        how="left",
    )

    avg = (
        pv.groupby(["domestic_competition_id", "date"])["market_value_in_eur"]
        .mean()
        .rename("competition_avg_player_value")
        .reset_index()
    )
    avg = avg.rename(columns={"domestic_competition_id": "competition_id"})
    return avg


# --- internal helpers ---

def _build_recent_form(games: pd.DataFrame, window: int = 10) -> pd.DataFrame:
    """Points-per-game over rolling window, from each club's perspective."""
    games = games.copy()
    games["date"] = pd.to_datetime(games["date"])

    home = games[["game_id", "date", "home_club_id", "home_club_goals", "away_club_goals"]].copy()
    home = home.rename(
        columns={
            "home_club_id": "club_id",
            "home_club_goals": "gf",
            "away_club_goals": "ga",
        }
    )
    away = games[["game_id", "date", "away_club_id", "home_club_goals", "away_club_goals"]].copy()
    away = away.rename(
        columns={
            "away_club_id": "club_id",
            "away_club_goals": "gf",
            "home_club_goals": "ga",
        }
    )

    both = pd.concat([home, away], ignore_index=True)
    both["points"] = np.where(
        both["gf"] > both["ga"], 3,
        np.where(both["gf"] == both["ga"], 1, 0),
    )
    both = both.sort_values(["club_id", "date"])

    form = (
        both.groupby("club_id", sort=False)["points"]
        .rolling(window, min_periods=1)
        .mean()
        .rename("club_recent_form")
        .reset_index(level=0, drop=True)
    )
    both = both.copy()
    both["club_recent_form"] = form.values

    # Keep only the most recent form value per club (for a static feature table)
    latest = both.groupby("club_id").last().reset_index()[["club_id", "club_recent_form"]]
    return latest
