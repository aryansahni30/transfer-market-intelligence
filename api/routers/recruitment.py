"""
/api/recruitment — budget + position query → ranked value-for-money candidates.
"""

from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel

from api.state import AppState

router = APIRouter()


class RecruitmentCandidate(BaseModel):
    player_id: int
    name: str
    position_group: str
    sub_position: str | None
    age: float
    club: str | None
    league: str | None
    league_tier: int | None
    predicted_fair_value: float
    asking_price: float | None  # market_value_in_eur as proxy
    value_ratio: float | None   # predicted_fair_value / asking_price
    arbitrage_residual: float | None
    durability_score: float | None


@router.get("/candidates", response_model=list[RecruitmentCandidate])
async def get_candidates(
    budget: float = Query(..., gt=0, description="Max asking price in EUR"),
    position: str = Query(..., description="GK | Defender | Midfielder | Forward"),
    max_age: int = Query(32, ge=15, le=45),
    min_age: int = Query(16, ge=15, le=45),
    league_tier: int | None = Query(None, ge=1, le=5),
    limit: int = Query(20, ge=1, le=100),
) -> list[RecruitmentCandidate]:
    """
    Return best-value targets within budget, ranked by value_ratio.

    value_ratio = predicted_fair_value / asking_price
    A ratio > 1.0 means the model thinks the player is worth more than their asking price.
    """
    state = AppState.get()
    if state.arbitrage_df.empty:
        return []

    df = state.arbitrage_df.copy()

    # Filter position
    df = df[df["position_group"].str.lower() == position.lower()]

    # Filter age
    if "age" in df.columns:
        df = df[(df["age"] >= min_age) & (df["age"] <= max_age)]

    # Use market_value_in_eur as proxy asking price; filter by budget
    asking_col = "market_value_in_eur"
    if asking_col in df.columns:
        df = df[df[asking_col].notna() & (df[asking_col] <= budget)]

    if league_tier is not None:
        df = df[df["dest_club_tier"] == league_tier]

    # Compute value ratio
    if asking_col in df.columns:
        df = df.copy()
        df["value_ratio"] = df["predicted_fair_value"] / df[asking_col].clip(lower=1)
    else:
        df["value_ratio"] = None

    df = df.sort_values("value_ratio", ascending=False).head(limit)

    def _row(r) -> RecruitmentCandidate:
        asking = float(r[asking_col]) if asking_col in r and r[asking_col] == r[asking_col] else None
        raw_tier = r.get("dest_club_tier")
        tier = int(raw_tier) if raw_tier is not None and raw_tier == raw_tier else None
        sub_pos = r.get("sub_position")
        return RecruitmentCandidate(
            player_id=int(r.get("player_id", 0)),
            name=str(r.get("name", "")),
            position_group=str(r.get("position_group", "")),
            sub_position=str(sub_pos) if sub_pos is not None else None,
            age=float(r.get("age", 0)),
            club=r.get("current_club_name"),
            league=r.get("competition_name"),
            league_tier=tier,
            predicted_fair_value=float(r["predicted_fair_value"]),
            asking_price=asking,
            value_ratio=float(r["value_ratio"]) if r.get("value_ratio") is not None else None,
            arbitrage_residual=float(r["arbitrage_residual"]) if "arbitrage_residual" in r and r["arbitrage_residual"] == r["arbitrage_residual"] else None,
            durability_score=float(r["durability_score"]) if "durability_score" in r and r["durability_score"] == r["durability_score"] else None,
        )

    return [_row(row) for _, row in df.iterrows()]
