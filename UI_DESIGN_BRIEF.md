# UI Design Brief — MarketEdge

## 0. Concept

Not a sports app. Not a fintech dashboard. **A ledger of record for a market that lies to itself.**

The entire product is built on one honest tension: Transfermarkt's number, the fee actually paid, and what the model believes is fair — three numbers that disagree, and the disagreement is the whole point. Every design decision below serves that tension. Nothing here should read as "football stats site" (grass textures, jersey numbers, ball iconography) or "generic dark SaaS dashboard" (neon accent on pure black, gradient blobs, numbered 01/02/03 steps). The reference point is closer to an actuarial ledger or a registry of record — an instrument for people who care about being right more than looking impressive — which is also, not coincidentally, how this model was actually built (see: the GroupKFold fix that made the number *worse* and got reported anyway).

**Self-check against generic AI-design defaults, before you build any of this:** a near-black background with one bright acid-green accent is the single most common default for "data product" UIs right now — my first instinct here was exactly that, and I deliberately moved away from it. The palette below uses two functional signal colors (not one hero accent), a cool ink background rather than neutral black, and a muted brass accent instead of neon. Keep it that way — if an implementation pass drifts toward flat black + bright green glow, that's the generic version reasserting itself, not a good simplification.

---

## 1. Design tokens

### Color

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#10131A` | Base background — cool ink-blue-black, not neutral black |
| `--panel` | `#171B24` | Card/panel surface, one step up from ink |
| `--hairline` | `#2A2F3B` | Dividers, table rules, borders — used like ruled ledger lines |
| `--parchment` | `#E8E4D9` | Primary text, and the "actual value paid" marker |
| `--verdigris` | `#4FBA8F` | Undervalued / good signal — muted aged-copper green, never neon |
| `--brick` | `#C2483B` | Overvalued / bad signal — deep rust-red, deliberately not orange-leaning |
| `--gold` | `#D4A84B` | Brand + interactive + high-confidence marker — muted brass, used sparingly |

Signal color is never the *only* encoding for direction — pair `--verdigris`/`--brick` with a ▲/▼ glyph or explicit +/− sign everywhere, so the product doesn't fail for colorblind readers. This is also just correct practice for anything presenting itself as a serious instrument.

### Type

| Role | Face | Notes |
|---|---|---|
| Display | **Fraunces** (variable) | Page titles, the hero search, big numbers. Ink-trap serif detail reads like a stamped ledger heading. Use with restraint — headlines only. |
| Body / UI | **Public Sans** | Labels, buttons, filters, descriptions. Civic/registry character (it's GSA's own typeface) — fits "record of note" better than a generic startup grotesk. |
| Data / numeric | **IBM Plex Mono** | Every currency figure, every date, player codes. Tabular figures, always right-aligned in tables. This is functionally required, not decorative — misaligned currency columns look sloppy immediately. |

### Motion

- Ease: `cubic-bezier(0.2, 0.7, 0.2, 1)` — precise, decisive, no bounce, no elastic overshoot anywhere in the product.
- Durations: 150ms for hover/micro states, 400–600ms for the signature reveal (see §3). Nothing longer.
- Respect `prefers-reduced-motion`: every animated reveal has a static equivalent (instant, fully drawn) — no exceptions.

---

## 2. Global chrome

Slim top bar, not a sidebar: wordmark (`MARKETEDGE`, small caps, letter-spaced, mono) on the left, four nav items styled as ledger tabs (a filled hairline underline on the active tab, not a pill or gradient background). A single right-aligned line in mono type: `DATA THROUGH 2024 · 88,690 SNAPSHOTS` — a permanent, quiet reminder that this is a bounded, dated dataset, not a live feed pretending to be real-time. This is true, and it's more credible than faking liveness.

---

## 3. The signature element: the Value Ledger Mark

This is the one thing the site should be remembered for — reused everywhere a value appears (player card, arbitrage board rows, recruitment results). Nothing else in the product should compete with it for visual weight.

**What it shows, honestly, in one compact horizontal instrument:**
- A soft horizontal band (~140px wide, 20px tall) representing the model's uncertainty range around its fair-value estimate — not a single confident point.
- A thin `--gold` tick at the point estimate.
- Where an actual fee exists, a solid `--parchment` marker at that position, with a small mono label showing the gap: `−€6.1M vs. paid`.
- Band color leans `--verdigris` or `--brick` depending on which side the actual/asking value falls, with a ▲/▼ glyph — this is the arbitrage signal made literally visible as distance, not just a colored badge.
- Confidence (from the bootstrap stability check) shown as the band's opacity/solidity: a high-confidence entry (top-20 in >80% of bootstrap runs) renders with a solid, fully-opaque band; a lower-confidence entry renders visibly hollow/dashed. This replaces a bolted-on "ConfidenceNote" badge with the uncertainty built into the primary visualization itself.

**Reveal animation (the one orchestrated moment in the whole product):** the band draws outward from the point estimate over ~500ms on the calibrated ease above — like an instrument settling on a reading, not a bar chart growing. Where SHAP drivers are shown alongside (player detail page), each driver line stamps in top-to-bottom with a 50ms stagger, like line items being entered in a ledger. Everywhere else this mark appears (table rows, cards), it should render instantly on scroll-into-view — the full draw-in is reserved for the player detail page only, so it stays a moment, not a tic that fires forty times on the arbitrage board.

---

## 4. Pages

### 4.1 Player Lookup (`/`)

The hero is the search itself, not a tagline. Large centered input, mono placeholder text: `> search a player…`, command-palette style (⌘K to focus). No stock photography, no hero illustration.

```
┌──────────────────────────────────────────┐
│  MARKETEDGE          Board  Scout  Map    │
├──────────────────────────────────────────┤
│                                            │
│         > search a player…                │
│                                            │
├──────────────────────────────────────────┤
│  ERLING HAALAND · NOR · FW · Man City     │
│  ─────────────────────────────────────    │
│  Fair value  [====●=====]  €142M ±€38M    │
│  SHAP drivers (stamped in, one by one):   │
│    +€18M   goals/90 top 2% at position    │
│    +€9M    age at predicted peak (24)     │
│    −€4M    injury recency flag            │
└──────────────────────────────────────────┘
```

### 4.2 Arbitrage Board (`/arbitrage`)

The flagship page — a literal ledger table, not a card grid. Rows sorted by signal strength by default, each row carrying an inline (static, no reveal animation) Value Ledger Mark. Filters render as tab-style chips reading like ledger sections: `League ▸`, `Position ▸`, `Season ▸`. A quiet toggle, on by default: **"High confidence only"** — off shows the full 13,298, on restricts to the bootstrap-stable set. Don't hide this toggle in a settings menu — it's core to the product's honesty and should be visible by default.

### 4.3 Recruitment Assistant (`/recruitment`)

Framed as filling out a requisition, not a filter sidebar: three plain-language fields in a row — `Budget ceiling`, `Position needed`, `Age ceiling` — each labeled the way a scout would say it, not the way the database names the column. Results render as a ranked list of Value Ledger Marks, sorted by value-for-money, each with a one-line plain-language rationale pulled from the top SHAP driver ("Best value: elite per-90 output, contract expiring in 8 months").

### 4.4 Similarity Map (`/similarity`)

The UMAP projection, restyled to match — plotted as ink dots on a faint `--hairline` grid (graph-paper quality, not a sci-fi radar). Selecting a player draws thin ruler-straight lines to its nearest neighbors (150ms draw-in, not the 500ms signature reveal — this is a micro-interaction, not the hero moment). Cheaper statistical twins are marked with a small `--gold` dot; nothing else on this page uses gold, so it reads immediately as "this one's the find."

---

## 5. Copy & voice

- Plain, active, no filler: "Fair value" not "Estimated Fair Market Valuation." "High confidence only" not "Enable strict filtering mode."
- Errors and empty states explain, they don't apologize: a player with no fee data shows *"No disclosed transfer fee — showing model estimate only,"* not "Oops, we don't have that."
- Never oversell precision the model doesn't have. Nowhere in the UI should a value render as a single bare number with no band, range, or confidence marker next to it — that would misrepresent what was actually validated in §4 of the model checklist.

---

## 6. Explicit guardrails — do not do these

- No grass textures, ball icons, jersey-number motifs, or any literal football iconography as decoration.
- No numbered 01/02/03 step markers — nothing in this product is a sequential process.
- No gradient-blob backgrounds, no glassmorphism, no glow-on-hover for its own sake.
- No single bright accent color standing in for "the brand" — the palette's job is done by verdigris/brick/gold together, not one of them alone.
- No fake live-data feel (ticking numbers with no real update, "live" badges) — the dataset has a hard cutoff and the top bar says so.
- Don't reuse the signature draw-in animation everywhere — it loses its weight if it fires on every row of a 13,000-row table.

---

## 7. Implementation notes

- Extend the existing CSS custom properties setup (already dark-themed) with the token table in §1 rather than starting the theme over.
- `fmtEur()` stays, but all numeric output should sit in the mono face with `font-variant-numeric: tabular-nums`.
- Framer Motion (or CSS transitions if you'd rather avoid the dependency) for the signature reveal in §3 — respect `prefers-reduced-motion` via the media query, not a manual toggle.
- The Value Ledger Mark should be one shared component with a `confidence` and `variant` (`live-reveal` vs `static`) prop — it appears on all four pages and needs to stay visually identical everywhere except that one reveal-animation flag.

---

## 8. Gap analysis against the current build

The current build (screens: Player Lookup, Arbitrage Board, Recruitment, Similar Players — all shown in their pre-search/empty state) has the right layout and information architecture already — keep the structure below as-is. What's missing entirely is everything in §1–§7. This section maps specific elements already on screen to specific fixes, so the restyle pass doesn't have to re-derive intent from scratch.

**Fix first — naming inconsistency.** The nav reads `FVI` and the footer reads "Football Value Intelligence" — both predate the `marketedge` decision. Nav wordmark → `MARKETEDGE`, small caps, letter-spaced, set in the mono face. Footer → swap "Football Value Intelligence" for "MarketEdge," keep the rest of the footer copy (data source + model description) as-is — it's honest and reads correctly as an instrument's imprint line.

**Typography — currently 0% applied, do this first.** All four screens use one flat system sans for page titles, labels, *and* every number (budget "30", age range "18–28", "€30.0M"). Apply the three-role system from §1: page titles → Fraunces, labels/descriptions/buttons/nav → Public Sans, and — this is the highest-leverage single change available — every numeric value anywhere on any screen → IBM Plex Mono with tabular-nums. Nothing currently distinguishes a number from a label, and that's true on every screen shown.

**Color — the accent is currently generic indigo/blue (~#4F6BFF), used on the active nav tab, the Direction segmented control, the Position toggle (Forward selected), and both primary buttons (Run, Find Targets).** Nothing in the brief's palette is blue — this is a full swap, not a tint adjustment:
- Active nav tab: drop the filled pill background, replace with a 2px `--gold` underline under the label only.
- Segmented controls / toggle buttons (Direction: All/Underpaid/Overpaid; Position: GK/Defender/Midfielder/Forward): drop the solid-blue-fill active state, replace with a `--gold` 1px border + `--panel` background. This is quieter on purpose — blue is currently doing the job of "the brand color," which §6 of this brief explicitly warns against.
- Primary buttons (Run, Find Targets): `--gold` fill, `--ink` text.
- One thing already correct: the Arbitrage Board's "Undervalued" (green) / "Overvalued" (red) legend text is directionally right — just retarget the exact hex values to `--verdigris` (#4FBA8F) and `--brick` (#C2483B), and reuse those same two colors once results populate (row badges, Value Ledger Mark bands) rather than introducing a second red/green pair for the table itself.

**Empty states — currently a generic pattern.** All four screens use the same dashed-border rounded box with centered gray text when nothing's loaded yet ("Type a player name to get started," "Select filters and click Run," etc.). This is a recognizable default SaaS pattern and undercuts the brief's whole premise. Replace with a dormant Value Ledger Mark — a faint, static, ungraded band at low opacity, instructional copy set beside it rather than centered in a dashed box. The empty state should still look like this product, not like every other dashboard's empty state.

**Card and input geometry.** Current border-radius on cards and inputs reads as default-component-library rounded (looks like ~12–16px). Tighten to ~4–6px across cards, buttons, and inputs — closer to a ledger/instrument, further from a generic SaaS card. Border → `--hairline` (#2A2F3B), background → `--panel` (#171B24), replacing the current indigo-tinted panel fill.

**Per-screen notes:**
- *Player Lookup* — search input is structurally fine, just needs the type/color pass. The post-search player card isn't shown in these screenshots — confirm it lands exactly per §4.1 (Value Ledger Mark reveal + staggered SHAP driver stamp-in) once built.
- *Arbitrage Board* — filter row (Direction / Position / Season / League Tier / Run) has good layout, keep it, restyle per above. **Missing entirely:** the "High confidence only" toggle from §4.2 isn't in this filter bar at all — it needs to be added, not just restyled, and should default visible, not tucked into a menu.
- *Recruitment* — the value-ratio explainer copy in the subhead is good plain language, keep it verbatim, just retype. Confirm results (once populated) carry the one-line plain-language rationale per §4.3, not just a ranked number.
- *Similar Players* — "Cheaper Only" toggle: restyle to `--gold` for on-state, `--hairline` for off — not the current default blue/white iOS-style switch. Confirm the results view matches §4.4 (graph-paper grid, ruler-line connections to neighbors, gold dot marking cheaper twins) once built — not visible in the current empty state.

**Priority order for the restyle pass:** typography swap → color token swap (kill blue everywhere) → naming fix → empty-state redesign → card/input radius → confirm the four result states (not shown in these screenshots) actually carry the Value Ledger Mark, since that's where the signature element does its real work.