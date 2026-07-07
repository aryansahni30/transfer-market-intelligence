# Football Value Intelligence — Project Plan

**Dataset:** [Transfermarkt Player Scores](https://www.kaggle.com/datasets/davidcariboo/player-scores/data)

**Recruiter narrative:**
> Built a football value intelligence platform on 1M+ rows of real transfer data. Core engine estimates a player's fair market value from performance features, then compares against actual transfer fees paid to surface clubs that overpaid or underpaid. Turns that signal into a recruitment tool: given a budget and a positional need, who are the best-value targets right now?

The differentiator is **fee-vs-fair-value arbitrage**, not valuation prediction. Predicting Transfermarkt's `market_value_in_eur` is the most overcrowded project on this exact dataset — dozens of public notebooks and theses already do it. Don't rebuild that as the centerpiece.

---

## What This Project Is NOT

Hard guardrails — do not reintroduce these:

- **Not a Transfermarkt-value regressor as the flagship.** `market_value_in_eur` is Transfermarkt's editorial estimate, not a transaction. Use it as a feature/prior, not the primary target.
- **Not an NLP project.** `game_events.csv` is structured data — `type` (Goal/Cards/Substitutions), minute, player_id, game_id are already labeled columns. There is no meaningful free text. Do not build a text classifier to re-derive a label that already exists. Use the structured event fields directly as count/recency features.
- **Not a TFT/LSTM forecasting showcase.** Club squad-value time series is driven by transfer activity and aging, not learned temporal attention over match signals. If any forecasting component is built, Prophet as a lightweight secondary feature only — not a flagship deep learning task.
- **Not "causal" analysis.** Any what-if / scenario tooling must be described as **sensitivity/scenario analysis** — not causal inference. No causal counterfactual claims. There is no identification strategy for that here.
- **Not Streamlit.** Build a real web app (see §7).

---

## Dataset Summary

| File | Description | Rows (approx) |
|------|-------------|---------------|
| `appearances.csv` | Per-player per-game stats — main table | ~1M+ |
| `player_valuations.csv` | Player market value over time | ~400K |
| `players.csv` | Player static info | ~30K |
| `games.csv` | Game metadata | ~60K |
| `game_events.csv` | Structured event records (goal/card/sub) | ~3M+ |
| `clubs.csv` | Club metadata | ~400 |
| `competitions.csv` | League metadata | ~40 |
| `transfers.csv` | Transfer history + actual fees paid | ~80K |

**Key correction from original plan:** `transfers.csv` is now a **primary table**, not secondary. Actual fees paid are the closest thing to ground truth in this dataset.

**Known risk — fee sparsity:** Many transfers list "undisclosed fee." Before committing to this target, run:
```python
transfers['transfer_fee'].notnull().mean()
```
If usable fee data is <30% of rows, the model trains on a biased sample (big clubs, big moves get reported; small moves don't). `market_value_in_eur` can be used as auxiliary target for players without a recent transfer fee — but label it as an estimate, not truth. Document this limitation explicitly in the README.

---

## ML Tasks

### Task 1 (Flagship) — Value Arbitrage Engine

**Objective:** Estimate a player's fair market value from performance + profile features, then compare against the actual fee paid in `transfers.csv` to surface real overpays/underpays.

**Models:**
- Baseline: Linear Regression
- Level-0: Random Forest, XGBoost, LightGBM
- Level-1 meta-learner: Ridge Regression on out-of-fold predictions

**Validation:**
Walk-forward CV — train on seasons 1..N, predict season N+1. Split boundaries must align with transfer windows (January + summer), not calendar months. A mid-window split bleeds information from the same window being predicted.

**Error analysis (mandatory, not optional):**
Segment-level breakdown by position group, age bracket (U21 / 21-27 / 27+), league tier, career stage. A single aggregate RMSE is not sufficient — this segment rigor is itself a differentiator vs. public notebooks.

**Position-specific modeling:**
GK feature set differs meaningfully from outfield. Within outfield, CB/FB/MF/AM/ST have different feature importance profiles. Decision: train separate models per position group (GK, Defender, Midfielder, Forward) rather than a single model with position encoding. Justify this in the README.

**SHAP explainability (mandatory):**
- Waterfall plot: why is this player predicted at €X? Top drivers.
- Summary plot: global feature importance across all players.
- Force plot: compare two players side by side.

**Core output:** Residual (actual fee − fair value estimate) → ranked arbitrage board. Biggest overpays and underpays, filterable by league/position/season. This residual ranking is the "so what" of the whole project.

**Scenario analysis (not causal):**
Perturb league tier, age, per-90 stats → show shifted fair-value estimate. Label explicitly as sensitivity analysis in the UI and README.

---

### Task 2 — Recruitment Assistant (product layer on Task 1)

**Note:** This is not a separate ML model. It's a query + ranking layer on top of Task 1's output.

**Objective:** Given a budget, position, and age ceiling, return the best-value targets ranked by (predicted fair value / asking price).

**Interface:** budget + position + age ceiling + optional league filter → ranked candidates by value-for-money ratio.

**Why it matters:** Turns the arbitrage model into a decision tool. This is the feature that makes the project read as product thinking, not just a notebook.

---

### Task 3 — Player Similarity Engine

**Objective:** Given a player, return top-5 most statistically similar players.

**Approach:**
1. Build performance embedding per player (normalized per-90 stats + positional encoding).
2. PCA/UMAP for visualization.
3. FAISS for nearest-neighbor retrieval (cosine similarity).

**Framing:** "Players similar to X but cheaper" — feeds directly into Task 2's recruitment tool.

---

### Task 4 (Optional) — Durability / Injury Risk

**Objective:** Predict injury risk or effective remaining career minutes from structured signals in `game_events.csv` and `appearances.csv`.

**Features:** injury substitution flags, minutes trend, injury recency, substitution patterns — no NLP required.

**Why this replaces the old NLP task:** Actually uses the data correctly (structured signals). Legitimately underexplored on this dataset. Feed durability score into Task 1 and Task 2 as a feature and as a caveat ("good value target, elevated injury risk").

If time runs short, document as future work rather than cutting corners on Task 1.

---

## Feature Engineering

### A. Performance Features (Per 90, Rolling Windows)

From `appearances.csv`:

| Feature | Description |
|---------|-------------|
| `goals_per_90` | Rolling 5/10/season windows |
| `assists_per_90` | Rolling 5/10/season windows |
| `cards_per_90` | Yellow + red, rolling |
| `minutes_last_5` | Total minutes last 5 appearances |
| `goals_last_n` | N = 5, 10 |
| `performance_trend` | Slope of goals_per_90 over last 10 games |
| `career_minutes` | Cumulative minutes played |
| `days_since_last_goal` | Recency of attacking output |
| `days_since_last_injury_sub` | Injury recency signal |
| `days_at_current_club` | Tenure signal |
| `starter_rate` | Pct of games started vs subbed in |

### B. Time-Series Features

From `player_valuations.csv`, `appearances.csv`:

| Feature | Description |
|---------|-------------|
| `mom_career_minutes` | Month-over-month Δ career minutes |
| `mom_goals_per_90` | Month-over-month Δ goals per 90 |
| `yoy_market_value` | Year-over-year Δ market value |
| `form_trend_3m` | 3-month rolling performance slope |
| `season_change_goals` | Season-over-season goals change |
| `injury_freq_trend` | Injury frequency over last 2 seasons |
| `value_momentum` | Rate of change of market value (last 3 valuations) |

### C. Club Strength Features

From `clubs.csv`, `competitions.csv`, `games.csv`:

| Feature | Description |
|---------|-------------|
| `club_total_market_value` | Squad value at time of prediction |
| `club_league_tier` | Encoded competition prestige (1=top, 5=lower) |
| `club_recent_form` | Points per game last 10 matches |
| `competition_avg_player_value` | Average player value in this league |
| `club_continental_participation` | UCL/UEL/UECL flag |
| `squad_depth_rank` | Player's rank within club by market value |

### D. Structured Event Features (NOT NLP)

From `game_events.csv` — use as categorical counts and recency only:

| Feature | Description |
|---------|-------------|
| `injury_sub_flag_last_5` | Was player subbed off early in last 5 games |
| `days_since_last_card` | Recency of disciplinary event |
| `days_since_last_goal_event` | Recency of goal-type event |
| `red_card_count_season` | Season red card total |
| `sub_out_rate` | Pct of games subbed off before 70 min |
| `goal_involvement_last_10` | Goals + assists in last 10 games |

### E. Player Profile Features

From `players.csv`, `transfers.csv`:

| Feature | Description |
|---------|-------------|
| `age` | At time of valuation snapshot |
| `age_peak_delta` | Distance from assumed peak (26-28) |
| `position_group` | GK / Defender / Midfielder / Forward |
| `foot_encoded` | Preferred foot |
| `height` | Physical attribute |
| `international_caps` | National team appearances |
| `transfer_count` | Number of career transfers |
| `avg_historical_fee` | Mean of prior disclosed transfer fees |
| `contract_years_remaining` | Negotiating leverage signal |

---

## EDA Plan

### Player-Level
- Market value distribution (log scale — heavy right tail expected)
- Age vs market value (quadratic peak at 26-28)
- Position group vs value
- Starter vs substitute value comparison
- Performance metrics vs market value scatter matrix

### Transfer Fee Analysis
- Distribution of disclosed vs undisclosed fees — quantify sparsity
- Actual fee vs `market_value_in_eur` at time of transfer (how good is Transfermarkt's estimate?)
- Overpay/underpay distribution by league and season
- Biggest historical overpays/underpays as a sanity check

### Club-Level
- Clubs with highest total squad value
- Squad age distributions
- Club value change across seasons
- League strength vs average player value

### Match & Event-Level
- Goals/assists/cards distribution by position group
- Substitution patterns by position (early sub = injury signal vs. tactical)
- Injury substitution frequency by position
- Event frequency trends across seasons

### Joint / Interaction
- Age × goals_per_90 vs value
- Club league tier × player performance vs value
- Injury recency × minutes played vs value trajectory

---

## Web App

Next.js (React) + Tailwind frontend. FastAPI (Python) backend serving trained models.

**Why this stack:**
- Frontend matches other projects (Aura/AgentLedger) — no new framework to learn.
- FastAPI keeps model serving in Python — no reimplementing SHAP/inference logic in JS.
- Deploy: frontend on Vercel, backend on Railway or Render (free tier sufficient).

**Pages:**
1. **Player Lookup** — search a player, see predicted fair value vs actual market value vs last transfer fee, SHAP waterfall for the prediction.
2. **Arbitrage Board** — ranked table of most over/underpaid players, filterable by league/position/season (Task 1 output).
3. **Recruitment Assistant** — budget + position + age query → ranked value-for-money candidates (Task 2).
4. **Similar Players** — enter a player, get top-5 similar + cheaper alternatives (Task 3).
5. *(If Task 4 built)* Durability/injury risk badge shown alongside recommendations.

---

## MLOps

- **MLflow** for experiment tracking — log every run's hyperparams, features, metrics from Week 1. No "I trained this model and lost the results."
- **AWS S3** for raw/processed data and model artifacts.
- Simple model registry convention (staging/production tag).
- Skip DVC — setup overhead not worth it for this project.

---

## Repo Structure

```
football-value-intelligence/
├── data/
│   ├── raw/
│   └── processed/
├── notebooks/
│   ├── 01_data_sanity.ipynb
│   ├── 02_eda_player.ipynb
│   ├── 03_eda_transfers.ipynb           # fee sparsity + fee vs market_value analysis
│   ├── 04_eda_club.ipynb
│   ├── 05_feature_engineering.ipynb
│   ├── 06_task1_arbitrage_model.ipynb
│   ├── 07_task3_similarity.ipynb
│   └── 08_task4_durability.ipynb        # optional
├── src/
│   ├── features/
│   │   ├── performance.py               # per-90, rolling stats, trend slopes
│   │   ├── timeseries.py                # MoM/YoY deltas, value momentum
│   │   ├── club.py                      # club strength features
│   │   └── events.py                    # structured game_events counts/recency — NOT nlp.py
│   ├── models/
│   │   ├── arbitrage.py                 # Task 1 stacking ensemble
│   │   ├── similarity.py                # Task 3 FAISS
│   │   └── durability.py                # Task 4, optional
│   └── explainability/
│       └── shap_utils.py
├── api/                                 # FastAPI backend
│   ├── main.py
│   └── routers/
│       ├── players.py
│       ├── arbitrage.py
│       ├── recruitment.py
│       └── similarity.py
├── web/                                 # Next.js frontend
│   └── ...
├── mlruns/
├── requirements.txt
└── README.md
```

---

## Milestones

Sequence matters. Don't start Task 1 before feature engineering is solid.

| # | Milestone | Key output |
|---|-----------|-----------|
| 1 | Data sanity + join validation | Clean base tables. Fee sparsity quantified. MLflow configured. S3 set up. |
| 2 | EDA | Insights documented. Transfer fee distribution understood. game_events schema confirmed before building features off it. |
| 3 | Feature engineering | Master feature table. All 5 feature groups implemented and validated. |
| 4 | Task 1 — arbitrage model | Baseline → stacking ensemble → walk-forward CV (transfer-window-aligned splits) → SHAP → segment error analysis. |
| 5 | Task 3 — similarity engine | FAISS index. UMAP visualization. |
| 6 | Task 4 — durability (if time) | Injury risk score feeding into Task 1 + recruitment UI. |
| 7 | Web app | FastAPI backend first. Next.js frontend second. All 4 core pages wired to live API. |
| 8 | README + model cards | Arbitrage/recruitment narrative leads. Known limitations honest and explicit. |

---

## Definition of Done

- Task 1 validated with walk-forward CV (transfer-window-aligned) and segment-level error breakdown — not just aggregate RMSE.
- Arbitrage board and Recruitment Assistant both live in the deployed web app, not only in notebooks.
- SHAP explanations working end-to-end from FastAPI to frontend for the arbitrage model.
- Fee sparsity documented as a known limitation in the README.
- README leads with arbitrage/recruitment narrative.
- No NLP on structured data, no TFT, no causal inference claims anywhere in repo or README.
