"""
/api/similarity — top-k similar players for a given player.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from api.state import AppState

router = APIRouter()


class SimilarPlayer(BaseModel):
    player_id: int
    name: str
    position_group: str
    age: float
    club: str | None
    league: str | None
    predicted_fair_value: float | None
    market_value_in_eur: float | None
    similarity_score: float
    rank: int


@router.get("/{player_id}", response_model=list[SimilarPlayer])
async def get_similar_players(
    player_id: int,
    k: int = Query(5, ge=1, le=20),
    cheaper_only: bool = Query(False, description="Return only players cheaper than the query player"),
) -> list[SimilarPlayer]:
    """Return top-k players most similar to player_id."""
    state = AppState.get()

    if state._sim_bundle is None:
        raise HTTPException(status_code=503, detail="Similarity engine not loaded.")
    if state.players_df.empty:
        raise HTTPException(status_code=503, detail="Player data not loaded.")

    similar_list = state.find_similar(player_id, k=k + 5)
    if not similar_list:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found in similarity index.")

    # Enrich with player metadata
    players = state.players_df.set_index("player_id")

    # Optional: query player's market value for cheaper_only filter
    query_value = None
    if cheaper_only and player_id in players.index:
        query_value = players.loc[player_id].get("market_value_in_eur")

    results = []
    for sim_row in similar_list:
        pid = int(sim_row["player_id"])
        if pid not in players.index:
            continue

        p = players.loc[pid]
        mv = p.get("market_value_in_eur")

        if cheaper_only and query_value is not None and mv is not None:
            if mv >= query_value:
                continue

        # Pull fair value from arbitrage board if available
        fair_value = None
        if not state.arbitrage_df.empty:
            arb = state.arbitrage_df[state.arbitrage_df["player_id"] == pid]
            if not arb.empty:
                fair_value = float(arb.sort_values("season", ascending=False).iloc[0]["predicted_fair_value"])

        results.append(SimilarPlayer(
            player_id=pid,
            name=str(p.get("name", "")),
            position_group=str(p.get("position_group", "")),
            age=float(p.get("age", 0)),
            club=p.get("current_club_name"),
            league=p.get("competition_name"),
            predicted_fair_value=fair_value,
            market_value_in_eur=float(mv) if mv is not None else None,
            similarity_score=float(sim_row["similarity"]),
            rank=int(sim_row["rank"]),
        ))

        if len(results) >= k:
            break

    return results
