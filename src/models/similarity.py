"""
Task 3 — Player Similarity Engine.

FAISS nearest-neighbor retrieval on per-90 performance embeddings.
UMAP for 2D visualization.
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

try:
    import faiss  # type: ignore
    FAISS_AVAILABLE = True
except ImportError:
    logger.warning("faiss not installed — SimilarityEngine will use sklearn fallback.")
    FAISS_AVAILABLE = False

try:
    from umap import UMAP  # type: ignore
    UMAP_AVAILABLE = True
except ImportError:
    UMAP_AVAILABLE = False


EMBEDDING_FEATURES = [
    "goals_per_90",
    "assists_per_90",
    "cards_per_90",
    "minutes_last_5",
    "starter_rate",
    "performance_trend",
    "injury_sub_flag_last_5",
    "sub_out_rate",
    "goal_involvement_last_10",
    "age",
    "age_peak_delta",
]


class SimilarityEngine:
    """
    FAISS-backed nearest-neighbor retrieval for player similarity.

    Workflow:
    1. build(features_df) — normalise + index
    2. find_similar(player_id, k) — return top-k similar players
    3. umap_coords(features_df) — 2D projection for visualisation
    """

    def __init__(self, features: list[str] | None = None):
        self._features = features or EMBEDDING_FEATURES
        self._scaler = StandardScaler()
        self._index = None
        self._player_ids: np.ndarray = np.array([])
        self._embeddings: np.ndarray = np.array([])

    def build(self, df: pd.DataFrame) -> "SimilarityEngine":
        """
        Build FAISS index from a player feature DataFrame.

        Requires: player_id column + all features in self._features.
        Rows with >50% missing features are dropped before indexing.
        """
        df = df.copy()
        available_features = [f for f in self._features if f in df.columns]
        missing = set(self._features) - set(available_features)
        if missing:
            logger.warning("Missing embedding features (will be ignored): %s", missing)

        feature_df = df[["player_id"] + available_features].copy()
        feature_df = feature_df.dropna(
            subset=available_features, thresh=int(len(available_features) * 0.5)
        )
        feature_df[available_features] = feature_df[available_features].fillna(
            feature_df[available_features].median()
        )

        X = self._scaler.fit_transform(feature_df[available_features].values.astype(np.float32))
        X = X.astype(np.float32)

        # L2-normalise for cosine similarity via inner product
        norms = np.linalg.norm(X, axis=1, keepdims=True).clip(min=1e-8)
        X_norm = X / norms

        if FAISS_AVAILABLE:
            index = faiss.IndexFlatIP(X_norm.shape[1])
            index.add(X_norm)
            self._index = index
        else:
            self._index = None

        self._embeddings = X_norm
        self._player_ids = feature_df["player_id"].values
        self._available_features = available_features
        return self

    def find_similar(
        self,
        player_id: int | str,
        k: int = 5,
        exclude_same_club: bool = False,
        club_ids: pd.Series | None = None,
    ) -> pd.DataFrame:
        """
        Return top-k most similar players to player_id.

        Returns a DataFrame with columns: player_id, similarity_score, rank.
        Excludes the query player from results.
        """
        if self._embeddings.size == 0:
            raise RuntimeError("Call build() before find_similar().")

        mask = self._player_ids == player_id
        if not mask.any():
            raise ValueError(f"player_id {player_id!r} not in index.")

        query_vec = self._embeddings[mask][0:1]

        if FAISS_AVAILABLE and self._index is not None:
            scores, idxs = self._index.search(query_vec, k + 1)
            scores, idxs = scores[0], idxs[0]
        else:
            # sklearn cosine fallback
            sims = (self._embeddings @ query_vec.T).flatten()
            idxs = np.argsort(sims)[::-1][: k + 1]
            scores = sims[idxs]

        results = []
        for score, idx in zip(scores, idxs):
            pid = self._player_ids[idx]
            if pid == player_id:
                continue
            results.append({"player_id": pid, "similarity_score": float(score)})
            if len(results) >= k:
                break

        result_df = pd.DataFrame(results)
        result_df["rank"] = range(1, len(result_df) + 1)
        return result_df

    def umap_coords(self, n_components: int = 2, random_state: int = 42) -> pd.DataFrame:
        """
        Return 2D UMAP projection of all indexed players.

        Returns DataFrame with player_id, umap_x, umap_y.
        """
        if not UMAP_AVAILABLE:
            raise ImportError("umap-learn is required for UMAP visualisation.")
        if self._embeddings.size == 0:
            raise RuntimeError("Call build() before umap_coords().")

        reducer = UMAP(n_components=n_components, random_state=random_state)
        coords = reducer.fit_transform(self._embeddings)

        return pd.DataFrame({
            "player_id": self._player_ids,
            **{f"umap_{i + 1}": coords[:, i] for i in range(n_components)},
        })

    def save(self, path: str | Path) -> None:
        """Persist index + metadata to disk."""
        import joblib
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "scaler": self._scaler,
                "player_ids": self._player_ids,
                "embeddings": self._embeddings,
                "features": self._available_features,
            },
            path / "similarity_engine.pkl",
        )
        if FAISS_AVAILABLE and self._index is not None:
            faiss.write_index(self._index, str(path / "faiss.index"))
        logger.info("SimilarityEngine saved to %s", path)

    @classmethod
    def load(cls, path: str | Path) -> "SimilarityEngine":
        import joblib
        path = Path(path)
        data = joblib.load(path / "similarity_engine.pkl")
        engine = cls(features=data["features"])
        engine._scaler = data["scaler"]
        engine._player_ids = data["player_ids"]
        engine._embeddings = data["embeddings"]
        engine._available_features = data["features"]
        if FAISS_AVAILABLE:
            index_path = path / "faiss.index"
            if index_path.exists():
                engine._index = faiss.read_index(str(index_path))
        return engine
