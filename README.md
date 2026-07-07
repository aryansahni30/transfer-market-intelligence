# Football Value Intelligence

A football transfer analytics platform that estimates player fair market value from performance statistics, then surfaces clubs that overpaid or underpaid relative to that estimate. The core output is an **arbitrage residual** — the gap between what a club paid and what the model thinks the player was worth — ranked across 13,000+ disclosed transfers.

**Live demo:** _add links after deploy_

---

## What This Is (and Is Not)

**Is:** Fee-vs-fair-value arbitrage engine built on 1M+ rows of Transfermarkt data.

**Is not:**
- A Transfermarkt market value predictor (the most overcrowded project on this dataset — dozens of public notebooks already do it)
- An NLP project — `game_events.csv` uses structured `type` columns (Goal/Card/Substitution), not free text
- A causal model — scenario tools show **sensitivity analysis**, not causal counterfactuals
- A forecasting model — no TFT, no LSTM, no value trajectory prediction

---

## How It Works

```
appearances.csv (1.89M rows)  ─┐
game_events.csv (1.27M rows)   ├─► feature engineering ─► features_master.parquet (88,690 rows)
player_valuations.csv          │                                        │
clubs.csv / games.csv         ─┘                                        ▼
                                                           per-position stacking model
transfers.csv (fee rows only) ──────────────────────────► arbitrage residual = pred − actual fee
                                                                        │
                                                                        ▼
                                              arbitrage board · recruitment tool · similarity engine
```

### Model Architecture

**Target:** `log(market_value_at_snap + 1)` — Transfermarkt's editorial valuation at transfer date, not the actual fee. Market value is available for all 88,690 rows; disclosed fees exist for only 13,298 (15%). Training on market value gives 6× more signal; arbitrage is computed only where fees are disclosed.

**Per-position stacking ensemble** — separate model per position group because GK features are structurally different from outfield, and CB/MF/ST have different feature importance profiles:

| Position | Training rows |
|----------|--------------|
| Forward | ~22,000 |
| Midfielder | ~24,000 |
| Defender | ~25,000 |
| GK | ~8,000 |

Each model:
- **Level-0 base learners:** Random Forest (200 trees, depth 8) + XGBoost (400 trees, lr 0.05) + LightGBM (400 trees, lr 0.05)
- **Level-1 meta-learner:** Ridge Regression trained on out-of-fold predictions

**Validation:** Walk-forward CV — train on seasons 1..N, predict season N+1. 16 splits covering 2009–2024. Prevents any future transfer data leaking into training.

---

## Validation Results

**Headline metric:** Walk-forward mean R² = **0.493** (16 seasonal splits, test-size-weighted across all 4 positions, full stacking ensemble).

| Metric | Value |
|--------|-------|
| Walk-forward mean R² | 0.493 |
| MAE (EUR) | €3.44M |
| RMSE (EUR) | €8.25M |
| Median absolute % error | 67.9% |
| Predictions within 2× of actual fee | 83.0% |

### Two Leakage Fixes Applied

**Fix 1 — Snapshot timing (Check 1):** 34.9% of fee rows had the market value snapshot taken within 30 days of the transfer date. A post-announcement valuation is not a valid pre-transfer feature. Fixed: `merge_asof` with a 30-day buffer — valuation must precede the transfer date by at least 30 days.

**Fix 2 — OOF grouping (Check 2):** Initial stacking used plain KFold, which placed the same player in both train and validation folds. 95% of validation rows had the player seen in training — effectively memorizing player identity. Fixed: switched to `GroupKFold(player_id)`. R² dropped from 0.510 → 0.432 on the diagnostic (Midfielder, single-season RF); the post-fix full ensemble walk-forward R² is 0.493.

> The 0.432 and 0.493 figures measure different things. 0.432 is a single-position, single-season, RF-only diagnostic used to prove the leakage fix matters. 0.493 is the actual model performance: all 4 positions, 16 seasons, full stacking ensemble, season-averaged. These are not contradictory.

### Known Limitations

**Fee sparsity — most important limitation:** Only ~15% of rows have a disclosed transfer fee. Small transfers, loan moves, and free transfers are systematically underrepresented. The model trains on market value (all rows) but arbitrage is only computable where fees are known — biased toward high-value, high-visibility moves at top clubs.

**Record-breaking transfers underestimated:** Training in log space systematically underestimates outlier fees. Neymar (€222M actual vs €44.7M predicted), Mbappé, and similar transfers will always appear massively "overpaid" — the model has no way to learn that a single player can command a premium beyond market value due to scarcity, commercial value, or negotiating leverage.

**Ranking instability (Check 5):** Bootstrap resampling (n=20) shows Jaccard stability of 0.42–0.43 for the top-20 arbitrage rankings. Only players appearing in ≥80% of bootstrap runs are flagged as high-confidence on the arbitrage board.

**Tier-1 clubs (Check 6):** p90 absolute error for Tier-1 destination clubs is €15.9M vs €4.7M for Tier-4+. Model is less reliable for elite transfers.

**Interpretation:** Fair value estimates carry a typical margin of ~65–70%. Best used for **relative ranking and screening** — identifying players where the fee-vs-value gap is large — rather than precise point valuation.

---

## Feature Groups

| Group | Source | Key features |
|-------|--------|-------------|
| Performance | `appearances.csv` (1.89M rows) | goals/90, assists/90, cards/90, rolling 5/10 game windows, starter rate, performance trend slope |
| Time-series | `player_valuations.csv`, `appearances.csv` | MoM/YoY deltas on goals_per_90 and market_value, 3-month form trend |
| Club strength | `clubs.csv`, `games.csv` | Squad value, league tier 1–5, recent form (points/game last 10), continental participation flag |
| Structured events | `game_events.csv` (1.27M rows) | Early sub rate, goal involvement last 10 games, red card count, days since last card/goal |
| Player profile | `players.csv`, `transfers.csv` | Age, age-peak delta (from 27), height, international caps, transfer count, avg historical fee |

**Not used:** `game_lineups.csv` (3.15M rows) — potential signal for positional role analysis in future work.

---

## Web Application

Four pages, all backed by live FastAPI:

| Page | URL | What it shows |
|------|-----|---------------|
| Player Lookup | `/` | Search a player → predicted fair value vs Transfermarkt market value vs last disclosed fee. SHAP waterfall showing top prediction drivers. |
| Arbitrage Board | `/arbitrage` | 13,298 transfers ranked by residual (predicted − actual). Underpaid/overpaid toggle. High-confidence filter (bootstrap-stable entries only). |
| Recruitment | `/recruitment` | Budget + position + age ceiling → ranked candidates by value-for-money ratio (fair value / asking price). |
| Similar Players | `/similarity` | Enter a player → top-10 statistical twins by cosine similarity. Cheaper-only toggle for recruitment use. |

---

## Model Cards

### Arbitrage Model

| Field | Value |
|-------|-------|
| Type | Per-position stacking ensemble (RF + XGB + LGB → Ridge) |
| Target | log(market_value_at_snap + 1) |
| Training data | 88,690 player-transfer snapshots, 2009–2024 |
| Validation | Walk-forward CV, 16 seasonal splits |
| Walk-forward R² | 0.493 |
| MAE | €3.44M |
| Median % error | 67.9% |
| Known failure modes | Record-breaking fees (outlier underestimation), Tier-1 transfers (€15.9M p90 error), free transfers / undisclosed fees (absent from training signal) |
| Hardcoded hyperparams | Yes — no grid/random search performed. Design choice to avoid tuning leakage on the walk-forward folds. |

### Similarity Engine

| Field | Value |
|-------|-------|
| Type | FAISS flat index (cosine similarity) |
| Index size | 48,380 players |
| Feature space | Normalized per-90 stats + profile features, per-position-group |
| Output | Top-k nearest neighbors with similarity score (0–1) |
| Cheaper-only filter | Post-retrieval filter on predicted_fair_value |

---

## Stack

| Layer | Tech |
|-------|------|
| ML | scikit-learn, XGBoost, LightGBM, FAISS, SHAP |
| Backend | FastAPI, uvicorn, joblib |
| Frontend | Next.js 15 (App Router), TypeScript |
| Experiment tracking | MLflow |
| Deploy | Vercel (frontend) + Railway (backend) |

---

## Deployment

### Backend → Railway

1. Push this repo to GitHub (models and processed data are committed — no S3 needed)
2. Create new Railway project → "Deploy from GitHub repo"
3. Railway auto-detects Python via `railway.toml` — no extra config needed
4. Set environment variables in Railway dashboard:
   ```
   DATA_DIR=data/processed
   MODELS_DIR=models
   ```
5. Copy the Railway public URL (e.g. `https://football-value-intelligence.up.railway.app`)

### Frontend → Vercel

1. `cd web && npx vercel` (or import from Vercel dashboard)
2. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://<your-railway-url>
   ```
3. Deploy. Vercel auto-detects Next.js.

### After both are live

Update `api/main.py` CORS if you want to lock down to your specific Vercel URL:
```python
allow_origins=["http://localhost:3000", "https://your-app.vercel.app"],
```
Remove `allow_origin_regex` line if restricting to one domain.

---

## Running Locally

**Backend:**
```bash
cd "Football Transfer Market"
venv/bin/uvicorn api.main:app --reload --port 8000 --app-dir .
```

**Frontend:**
```bash
cd web
npm run dev
# http://localhost:3000
```

**Re-run model training from scratch:**
```bash
# Feature engineering
venv/bin/python3 notebooks/05_feature_engineering.py

# Arbitrage model
MLFLOW_ALLOW_FILE_STORE=true venv/bin/python3 notebooks/06_task1_arbitrage_model.py

# Similarity engine
venv/bin/python3 notebooks/07_task3_similarity.py

# Validation + leakage fixes (re-saves features_master.parquet and arbitrage_models.joblib)
MLFLOW_ALLOW_FILE_STORE=true venv/bin/python3 notebooks/08_model_validation.py
```

**Data:** Download from [Transfermarkt Player Scores on Kaggle](https://www.kaggle.com/datasets/davidcariboo/player-scores/data) and place CSVs in `data/raw/`.

---

## Repo Structure

```
Football Transfer Market/
├── data/
│   ├── raw/                    # Transfermarkt CSVs (not committed)
│   └── processed/
│       ├── features_master.parquet   # 88,690 rows, all feature groups
│       ├── arbitrage_board.parquet   # 13,298 rows with residuals
│       ├── players_enriched.parquet  # For API player search
│       └── umap_coords.parquet       # Similarity visualization
├── models/
│   ├── arbitrage_models.joblib       # Per-position stacking models
│   ├── faiss.index                   # Similarity FAISS index
│   └── similarity_engine.joblib      # Similarity metadata
├── notebooks/
│   ├── 01_data_sanity.py
│   ├── 05_feature_engineering.py
│   ├── 06_task1_arbitrage_model.py
│   ├── 07_task3_similarity.py
│   └── 08_model_validation.py
├── src/
│   ├── features/
│   │   ├── performance.py
│   │   ├── timeseries.py
│   │   ├── club.py
│   │   ├── events.py
│   │   └── player_profile.py
│   ├── models/
│   │   ├── arbitrage.py
│   │   └── similarity.py
│   └── explainability/
│       └── shap_utils.py
├── api/
│   ├── main.py
│   ├── state.py
│   └── routers/
│       ├── players.py
│       ├── arbitrage.py
│       ├── recruitment.py
│       └── similarity.py
├── web/                        # Next.js frontend
├── VALIDATION_REPORT.md        # Full 7-check validation output
└── plan.md                     # Original project spec
```
