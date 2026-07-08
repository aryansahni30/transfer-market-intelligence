"""
Singleton app state — models and data loaded once at startup.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

_INSTANCE: "AppState | None" = None


class AppState:
    def __init__(self) -> None:
        self.players_df: pd.DataFrame = pd.DataFrame()
        self.arbitrage_df: pd.DataFrame = pd.DataFrame()
        self._sim_bundle: dict | None = None
        self._faiss_index = None

    @classmethod
    def get(cls) -> "AppState":
        global _INSTANCE
        if _INSTANCE is None:
            _INSTANCE = cls()
        return _INSTANCE

    async def load(self) -> None:
        data_dir = Path(os.getenv("DATA_DIR", "data/processed"))
        models_dir = Path(os.getenv("MODELS_DIR", "models"))

        # --- Data files ---
        players_path = data_dir / "players_enriched.parquet"
        arbitrage_path = data_dir / "arbitrage_board.parquet"

        if players_path.exists():
            try:
                self.players_df = pd.read_parquet(players_path)
                logger.info("Loaded players: %d rows", len(self.players_df))
            except Exception as exc:
                logger.warning("Could not load players_enriched.parquet: %s", exc)
        else:
            logger.warning("players_enriched.parquet not found at %s", players_path)

        if arbitrage_path.exists():
            try:
                self.arbitrage_df = pd.read_parquet(arbitrage_path)
                logger.info("Loaded arbitrage board: %d rows", len(self.arbitrage_df))
            except Exception as exc:
                logger.warning("Could not load arbitrage_board.parquet: %s", exc)
        else:
            logger.warning("arbitrage_board.parquet not found at %s", arbitrage_path)

        # --- Similarity engine ---
        sim_path = models_dir / "similarity_engine.joblib"
        faiss_path = models_dir / "faiss.index"

        if sim_path.exists():
            try:
                import joblib
                self._sim_bundle = joblib.load(sim_path)
                logger.info("Loaded similarity bundle (%d players)", len(self._sim_bundle["player_ids"]))
            except Exception as exc:
                logger.warning("Could not load similarity_engine.joblib: %s", exc)

        if faiss_path.exists() and self._sim_bundle is not None:
            try:
                import faiss
                self._faiss_index = faiss.read_index(str(faiss_path))
                logger.info("Loaded FAISS index (%d vectors)", self._faiss_index.ntotal)
            except Exception as exc:
                logger.warning("Could not load faiss.index: %s", exc)

    def find_similar(self, player_id: int, k: int = 10) -> list[dict]:
        """Return top-k similar players by cosine similarity."""
        if self._sim_bundle is None:
            return []

        player_ids: np.ndarray = self._sim_bundle["player_ids"]
        X_normed: np.ndarray = self._sim_bundle["X_normed"]

        matches = np.where(player_ids == player_id)[0]
        if len(matches) == 0:
            return []

        q_idx = int(matches[0])
        q_vec = X_normed[q_idx].reshape(1, -1).astype(np.float32)

        if self._faiss_index is not None:
            scores, indices = self._faiss_index.search(q_vec, k + 1)
            scores = scores[0].tolist()
            indices = indices[0].tolist()
        else:
            from sklearn.metrics.pairwise import cosine_similarity
            sims = cosine_similarity(q_vec, X_normed)[0]
            indices_arr = np.argsort(sims)[::-1][: k + 1]
            scores = sims[indices_arr].tolist()
            indices = indices_arr.tolist()

        results = []
        rank = 1
        for score, idx in zip(scores, indices):
            pid = int(player_ids[idx])
            if pid == player_id:
                continue
            results.append({"player_id": pid, "similarity": float(score), "rank": rank})
            rank += 1
            if len(results) >= k:
                break

        return results
