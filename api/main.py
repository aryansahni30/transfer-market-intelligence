"""FastAPI entry point for Football Value Intelligence API."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import arbitrage, players, recruitment, similarity
from api.state import AppState

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models and data once at startup."""
    state = AppState.get()
    await state.load()
    logger.info("Models loaded. API ready.")
    yield
    logger.info("API shutting down.")


app = FastAPI(
    title="Football Value Intelligence",
    description="Fair-value estimation, arbitrage detection, and player recruitment API.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router, prefix="/api/players", tags=["players"])
app.include_router(arbitrage.router, prefix="/api/arbitrage", tags=["arbitrage"])
app.include_router(recruitment.router, prefix="/api/recruitment", tags=["recruitment"])
app.include_router(similarity.router, prefix="/api/similarity", tags=["similarity"])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
