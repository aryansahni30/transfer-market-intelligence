"""
/api/arbitrage — ranked board of over/underpaid players.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel

from api.state import AppState

router = APIRouter()


class ArbitrageEntry(BaseModel):
    player_id: int
    name: str
    position_group: str
    age: float
    club: str | None
    league: str | None
    league_tier: int | None
    season: int
    predicted_fair_value: float
    actual_fee: float | None
    market_value_in_eur: float | None
    arbitrage_residual: float | None


@router.get("/board", response_model=list[ArbitrageEntry])
async def get_arbitrage_board(
    direction: Literal["overpaid", "underpaid", "all"] = "all",
    position: str | None = Query(None),
    league_tier: int | None = Query(None, ge=1, le=5),
    season: int | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
) -> list[ArbitrageEntry]:
    """
    Return ranked arbitrage board.

    direction=overpaid  → highest positive residual (actual > fair value)
    direction=underpaid → most negative residual (actual < fair value)
    """
    state = AppState.get()
    if state.arbitrage_df.empty:
        return []

    df = state.arbitrage_df.copy()

    if position:
        df = df[df["position_group"].str.lower() == position.lower()]
    if league_tier is not None:
        df = df[df["dest_club_tier"] == league_tier]
    if season is not None:
        df = df[df["season"] == season]

    df = df.dropna(subset=["arbitrage_residual"])

    # residual = predicted_fair_value - actual_fee
    # overpaid  → actual > predicted → residual < 0
    # underpaid → actual < predicted → residual > 0
    if direction == "overpaid":
        df = df[df["arbitrage_residual"] < 0].sort_values(
            "arbitrage_residual", ascending=True
        )
    elif direction == "underpaid":
        df = df[df["arbitrage_residual"] > 0].sort_values(
            "arbitrage_residual", ascending=False
        )
    else:
        df = df.reindex(
            df["arbitrage_residual"].abs().sort_values(ascending=False).index
        )

    df = df.head(limit)

    def _row(r) -> ArbitrageEntry:
        return ArbitrageEntry(
            player_id=int(r.get("player_id", 0)),
            name=str(r.get("name", "")),
            position_group=str(r.get("position_group", "")),
            age=float(r.get("age", 0)),
            club=r.get("current_club_name"),
            league=r.get("competition_name"),
            league_tier=int(r["dest_club_tier"]) if "dest_club_tier" in r and r["dest_club_tier"] == r["dest_club_tier"] else None,
            season=int(r.get("season", 0)),
            predicted_fair_value=float(r["predicted_fair_value"]),
            actual_fee=float(r["actual_fee"]) if "actual_fee" in r and r["actual_fee"] == r["actual_fee"] else None,
            market_value_in_eur=float(r["market_value_in_eur"]) if "market_value_in_eur" in r and r["market_value_in_eur"] == r["market_value_in_eur"] else None,
            arbitrage_residual=float(r["arbitrage_residual"]),
        )

    return [_row(row) for _, row in df.iterrows()]
