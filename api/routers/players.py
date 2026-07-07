"""
/api/players — player lookup with fair value + SHAP explanation.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from api.state import AppState

router = APIRouter()


class ShapEntry(BaseModel):
    feature: str
    shap_value: float
    feature_value: float | None


class PlayerDetail(BaseModel):
    player_id: int
    name: str
    position_group: str
    age: float
    club: str | None
    league: str | None
    predicted_fair_value: float | None
    market_value_in_eur: float | None
    last_transfer_fee: float | None
    arbitrage_residual: float | None
    shap_explanation: list[ShapEntry]


@router.get("/search")
async def search_players(q: str = Query(..., min_length=2)) -> list[dict]:
    """Full-text search on player name. Returns lightweight list."""
    state = AppState.get()
    if state.players_df.empty:
        return []

    mask = state.players_df["name"].str.contains(q, case=False, na=False)
    cols = ["player_id", "name", "position_group", "age", "current_club_name"]
    available = [c for c in cols if c in state.players_df.columns]
    return state.players_df[mask][available].head(20).to_dict(orient="records")


@router.get("/{player_id}", response_model=PlayerDetail)
async def get_player(player_id: int) -> PlayerDetail:
    """Full player detail: fair value, market value, last fee, SHAP."""
    state = AppState.get()
    if state.players_df.empty:
        raise HTTPException(status_code=503, detail="Player data not loaded.")

    df = state.players_df
    rows = df[df["player_id"] == player_id]
    if rows.empty:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found.")

    row = rows.iloc[0]

    # Pull arbitrage info if available
    arb_row = None
    if not state.arbitrage_df.empty:
        arb_rows = state.arbitrage_df[state.arbitrage_df["player_id"] == player_id]
        if not arb_rows.empty:
            arb_row = arb_rows.sort_values("season", ascending=False).iloc[0]

    # SHAP values — not yet implemented (precomputed SHAP lookup placeholder)
    shap_entries: list[ShapEntry] = []

    return PlayerDetail(
        player_id=int(row["player_id"]),
        name=str(row.get("name", "")),
        position_group=str(row.get("position_group", "")),
        age=float(row.get("age", 0)),
        club=row.get("current_club_name"),
        league=row.get("competition_name"),
        predicted_fair_value=float(arb_row["predicted_fair_value"]) if arb_row is not None and "predicted_fair_value" in arb_row else None,
        market_value_in_eur=float(row["market_value_in_eur"]) if "market_value_in_eur" in row else None,
        last_transfer_fee=float(arb_row["actual_fee"]) if arb_row is not None and "actual_fee" in arb_row else None,
        arbitrage_residual=float(arb_row["arbitrage_residual"]) if arb_row is not None and "arbitrage_residual" in arb_row else None,
        shap_explanation=shap_entries,
    )
