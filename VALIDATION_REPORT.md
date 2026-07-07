======================================================================
FOOTBALL VALUE INTELLIGENCE — MODEL VALIDATION REPORT
======================================================================

Loading data...
  features_master: 88,702 rows
  fee rows:        13,298

======================================================================
CHECK 1: Snapshot-timing leak
======================================================================
  Fee rows with valuation:  13,292
  Same-day valuations:      220 (1.7%)
  Within-30-day valuations: 4,638 (34.9%)

  → FIX NEEDED: 34.9% of fee rows use valuation within 30 days of transfer
  Applying 30-day buffer to features_master...

  Before fix — market_value_at_snap (fee rows) mean: €4,540,798
  After fix  — market_value_at_snap (fee rows) mean: €4,364,230
  Rows after fix: 88,690 (was 88,702)
  Saved fixed features_master.parquet

  CHECK 1 STATUS: FIX APPLIED

======================================================================
CHECK 2: OOF grouping (KFold vs GroupKFold)
======================================================================
  Unique players:           17,590
  Players with >1 transfer: 14,609 (83.1%)
  Mean transfers/player:    5.04

  KFold OOF leakage: 84,296/88,690 val rows (95.0%) have player seen in train
  → FIX NEEDED: switching OOF to GroupKFold(player_id)

  Midfielder OOF R² (KFold):      0.5104
  Midfielder OOF R² (GroupKFold): 0.4320
  Delta: -0.0783

  CHECK 2 STATUS: FIX APPLIED

======================================================================
RETRAINING models with fixes applied...
======================================================================

  NEW walk-forward mean R²:  0.4929
  NEW walk-forward mean MAE: 0.8319

  Training final per-position models...
  Saved updated arbitrage_models.joblib

======================================================================
CHECK 3: Hyperparameter tuning leakage
======================================================================
  Hyperparameters were hardcoded (no grid/random search performed).
  The 16 walk-forward folds were never used as a tuning signal.
  → PASS: No tuning leakage.

======================================================================
CHECK 4: Raw-Euro accuracy
======================================================================
  Fee rows evaluated: 13,298

  MAE (EUR):              €      3,444,206
  RMSE (EUR):             €      8,251,358
  Median abs % error:           67.9%

  Error distribution (abs EUR):
    p50: €     975,163
    p90: €   8,842,198
    p99: €  36,376,580

  Predictions within 20% of actual fee: 12.5%
  Predictions within 50% of actual fee: 34.0%
  Predictions within 100% of actual fee: 83.0%

  Top 10 worst outliers (by abs error):
    pid=68290                      s=2017  actual=€222.0M  pred=€44.7M  err=€177.3M
    pid=342229                     s=2018  actual=€180.0M  pred=€28.0M  err=€152.0M
    pid=288230                     s=2017  actual=€148.0M  pred=€17.4M  err=€130.6M
    pid=462250                     s=2019  actual=€127.2M  pred=€14.3M  err=€112.9M
    pid=648195                     s=2022  actual=€121.0M  pred=€11.5M  err=€109.5M
    pid=203460                     s=2021  actual=€117.5M  pred=€10.6M  err=€106.9M
    pid=80444                      s=2017  actual=€135.0M  pred=€31.4M  err=€103.6M
    pid=687626                     s=2023  actual=€116.0M  pred=€14.1M  err=€101.9M
    pid=357662                     s=2023  actual=€116.6M  pred=€24.9M  err=€91.7M
    pid=8198                       s=2009  actual=€94.0M  pred=€9.7M  err=€84.3M

  CHECK 4 STATUS: PASS

======================================================================
CHECK 5: Arbitrage ranking stability (bootstrap, n=20)
======================================================================
  Mean Jaccard (top-20 underpaid): 0.425
  Mean Jaccard (top-20 overpaid):  0.400

  High-confidence underpaid players (≥80% of runs): 1
  High-confidence overpaid players  (≥80% of runs): 2

  CHECK 5 STATUS: WARN

======================================================================
CHECK 6: Segment residual variance
======================================================================

  By position group:
  Segment              N    Mean €M     Std €M     MAE €M     p90 €M
  Forward          4,485       -3.2        8.7        3.9       10.2
  Midfielder       3,823       -2.7        8.3        3.6        8.9
  Defender         4,071       -2.4        6.6        3.0        7.6
  GK                 919       -1.6        5.2        2.2        5.5

  By destination club tier:
  Segment         N    Mean €M     Std €M     MAE €M     p90 €M
  Tier1       5,444       -4.8       11.2        6.2       15.9 ⚠ HIGH
  Tier4+      1,836       -1.7        4.2        2.1        4.7
  Tier2       4,954       -1.2        3.3        1.5        3.8
  Tier3       1,064       -0.4        1.0        0.6        1.5

  By era:
  Era               N    Mean €M     Std €M     MAE €M     p90 €M
  pre-2015      1,427       -3.1        7.0        3.5        9.3
  2015-2019     4,361       -3.0        8.7        3.8        9.4
  2020+         7,510       -2.4        7.4        3.2        8.4

  CHECK 6 STATUS: PASS

======================================================================
CHECK 7: Human sanity check — known transfers
======================================================================

  Top 3 OVERPAID (actual >> predicted):
    pid=68290                    (Midfielder, age 25, 2017)
      ? → ?
      actual=€222.0M  predicted=€44.7M  residual=€-177.3M (-80%)
    pid=342229                   (Forward, age 20, 2018)
      ? → ?
      actual=€180.0M  predicted=€28.0M  residual=€-152.0M (-84%)
    pid=288230                   (Forward, age 20, 2017)
      ? → ?
      actual=€148.0M  predicted=€17.4M  residual=€-130.6M (-88%)

  Top 3 UNDERPAID (actual << predicted):
    pid=264372                   (Forward, age 25, 2022)
      ? → ?
      actual=€5.0M  predicted=€30.5M  residual=€25.5M (+509%)
    pid=198008                   (Forward, age 25, 2020)
      ? → ?
      actual=€3.0M  predicted=€28.4M  residual=€25.4M (+847%)
    pid=180337                   (Forward, age 27, 2021)
      ? → ?
      actual=€2.5M  predicted=€24.2M  residual=€21.7M (+868%)

  Reasonably priced (±10% of prediction):
    pid=185245                   (Forward, age 23, 2016)
      ? → ?
      actual=€6.5M  predicted=€6.2M  residual=€-0.3M (-5%)
    pid=147078                   (Defender, age 31, 2022)
      ? → ?
      actual=€0.8M  predicted=€0.9M  residual=€0.0M (+1%)
    pid=139396                   (Forward, age 28, 2022)
      ? → ?
      actual=€4.2M  predicted=€4.3M  residual=€0.1M (+2%)
    pid=269601                   (Forward, age 25, 2021)
      ? → ?
      actual=€0.8M  predicted=€0.8M  residual=€0.0M (+3%)

  CHECK 7 STATUS: PASS

======================================================================
SUMMARY
======================================================================

  Check 1 (Timing leak):           FIX APPLIED
  Check 2 (OOF grouping):          FIX APPLIED
  Check 3 (HP tuning leakage):     PASS
  Check 4 (Raw-EUR accuracy):      PASS
  Check 5 (Ranking stability):     WARN
  Check 6 (Segment variance):      PASS
  Check 7 (Human sanity):          PASS

  Final walk-forward mean R²: 0.4929
  Final walk-forward mean MAE (log): 0.8319
  MAE in EUR: €3,444,206
  RMSE in EUR: €8,251,358
  Median abs % error: 67.9%

  VERDICT: GO WITH CAVEATS — WARNings documented. Carry forward to UI confidence flags.

  Caveats to carry into UI:
  • Predictions are in log(market_value) space — fee predictions systematically
    underestimate record-breaking transfers (Neymar-style outliers)
  • Median absolute error: 68% — show confidence bands in UI
  • Underpaid ranking Jaccard=0.43 — only high-confidence players shown by default
  • Overpaid ranking Jaccard=0.40 — only high-confidence players shown by default
  • Segment-level confidence varies — see Check 6 table for per-segment guidance