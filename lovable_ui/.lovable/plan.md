# MarketEdge — UI Build Plan

A polished, portfolio-grade frontend for a football transfer intelligence tool. UI only, mock data, structured so real API data can drop in later.

## Visual direction (committed, not TBD)

**Concept: "Trading floor meets matchday programme."** Football-native, editorial, data-dense — not generic SaaS.

- **Palette:** deep pitch-night background (near-black with a green undertone), warm off-white paper foreground, chalk-line borders. Two signal accents used only for valuation deltas: an electric lime (underpaid / steal / positive edge) and a hot vermilion (overpaid / negative edge). Muted amber for "low confidence." No purple/indigo, no gradient hero.
- **Typography:** display in a condensed editorial sans with tabular numerics (e.g. *Space Grotesk* or *Archivo Narrow* for headlines, kit-number feel); body in a neutral humanist sans (*Inter Tight* or *Söhne*-alike). Monospaced tabular figures for every currency and stat — critical for scannable rows. Loaded via `<link>` in `__root.tsx`.
- **Motif:** subtle pitch-marking lines, a recurring "spread bar" component (predicted range as a horizontal band with predicted-fair-value mark and actual-fee mark, so the delta is a visual gap, not two numbers to subtract), kit-number-style large figures for headline valuations.
- **Motion:** restrained — number count-ups on load, spread bars draw in once, row hover raises tabular figure weight. No parallax, no hero video.

## Information architecture

Shared top nav (logo mark + 4 destinations + global player search). Routes:

- `/` — landing/overview: what the product is, headline stat (dataset scale), 3 "recent notable mispricings" cards linking into the Arbitrage Board, CTA into Player Lookup. Not a generic marketing page — it's a live-feeling front page.
- `/player` and `/player/$slug` — Player Lookup
- `/arbitrage` — Arbitrage Board
- `/scout` — Scout / Recruitment Assistant
- `/similar` and `/similar/$slug` — Similarity Map

Each route gets its own `head()` with distinct title + description + og tags.

## The four surfaces

### 1. Player Lookup (`/player/$slug`)
- Header block: player name (display type, large), club crest slot, position, age, foot, nationality.
- **Valuation triptych** using the shared SpreadBar:
  - Predicted fair value **range** (low / mid / high) — range is the primary visual, not the midpoint.
  - Current market value marker overlaid on the same axis.
  - Actual last transfer fee marker (if any) on the same axis.
  Delta chips beside each comparison ("+€145M over fair value", tinted vermilion).
- **Confidence badge:** High / Medium / Low, with a one-line plain explanation ("similar profile well-represented in training data" vs "sparse comparables at this age/league").
- **Driver breakdown:** 4–6 factor chips with direction arrows and short prose ("Elite goal output for position: +", "Approaching typical decline age: −", "Recent injury flags: −").
- Seed profiles: Neymar (€77M fair / €222M paid), Haaland, Mbappé, Bellingham, Dembélé, Vinícius, Rice, Caicedo, Wirtz, Palmer.

### 2. Arbitrage Board (`/arbitrage`)
- Dense table, tabular figures, sticky header. Columns: Player · From → To · Season · Position · Fee paid · Fair value (with mini SpreadBar inline) · Delta (± €) · Delta % · Confidence.
- Row is **tinted** by delta direction (lime wash for underpaid, vermilion wash for overpaid) with saturation scaled by |delta%| so the arbitrage signal is scannable across 50+ rows without reading numbers.
- **Filters (sticky sidebar / top bar):** direction (all / underpaid / overpaid), position, season range, league tier, min |delta|, **"High confidence only" toggle**.
- Sort by delta €, delta %, season, fee.
- Mock rows: Neymar, Dembélé, Mbappé, Coutinho, Grealish, Antony, Pogba (return), Hazard (Real), plus a set of underpaid steals (Salah to Liverpool, Kanté to Leicester, Haaland to City, Rüdiger free, etc.).

### 3. Scout / Recruitment Assistant (`/scout`)
- Left: form panel — budget (€, slider + input), position (pitch-diagram selector, not a boring dropdown — click the position on a mini pitch), age range (dual slider), league tier (multiselect chips), optional "must be under contract expiry within X months" toggle.
- Right: ranked results, sorted by **fair-value-to-asking-price ratio**, not raw value. Each card: player, club, age, asking price, fair value range (SpreadBar), ratio badge, and a one-sentence plain-language "why" ("Producing top-quartile xG for his position at 22 in a tier-1 league, priced like a tier-3 rotation player.").
- Empty state pre-filled with a plausible example brief ("£40M, CB, 21–26, tier 1–2") so it looks alive on first load.

### 4. Similarity Map (`/similar/$slug`)
- Chosen player as an anchor node at center.
- **2D scatter** (canvas/SVG) — axes are the two dominant style dimensions ("progressive passing" × "box threat", labeled clearly); similar players plotted around the anchor, size = minutes played, color intensity = similarity score.
- Hover a point → tooltip with name/club/age/market value; click → navigate to that player's lookup.
- Sidebar: ranked list of the top 12 similar players (fallback for accessibility and for those who prefer a list).
- **"Cheaper alternatives only" toggle** — dims points priced ≥ anchor.
- Seed: search Haaland → get Isak, Osimhen, Sesko, Gyökeres, Openda, Jonathan David, etc.

## Shared components

- `SpreadBar` — the load-bearing component. Horizontal axis, translucent band = predicted range, tick = midpoint, diamond = market value, filled circle = actual fee. Reused in Lookup, Arbitrage rows, Scout cards.
- `DeltaChip` — signed currency chip, lime/vermilion tint, tabular figures.
- `ConfidenceBadge` — High/Med/Low with tooltip explanation.
- `PlayerIdentity` — name + club + position + age, consistent everywhere.
- `PitchPositionPicker` — mini pitch SVG for the Scout form.
- `GlobalSearch` — command-palette-style (⌘K) player search in the top nav.

## Mock data

Single typed module `src/lib/mock/*` with `players.ts`, `transfers.ts`, `similarity.ts`, `scoutPool.ts`. All names/clubs/fees real and recognizable; fair-value numbers plausible relative to known reality (Neymar €77M fair / €222M paid, Haaland strong fair value, etc.). Types mirror what a real API would return so swap-in is a one-file change.

## Technical notes

- TanStack Start file routes as listed; each route sets its own `head()`.
- Load fonts via `<link>` in `__root.tsx`, register families in `@theme` in `src/styles.css`. Extend tokens: add `--color-edge-positive`, `--color-edge-negative`, `--color-confidence-low`, tabular-figure font stack.
- shadcn primitives (Input, Slider, Toggle, Tooltip, Command, Table) restyled through tokens — no default shadcn look leaking through.
- Motion via `framer-motion` (already fine for this stack): number count-up, SpreadBar draw-in, row hover.
- All 4 surfaces navigable from the top nav and cross-linked (Arbitrage row → Lookup; Lookup → Similarity; Similarity node → Lookup).

## Out of scope

Real backend, auth, real API calls, dark/light toggle (ships dark-first, matching the identity), mobile-perfect polish beyond "usable and not broken" — desktop is the primary target for a scouting tool.

## Deliverable check before finishing

- No `PlaceholderIndex` / blank-app placeholder left on `/`.
- Every route has distinct `head()` metadata.
- Arbitrage direction is legible at a glance without reading numbers.
- Predicted values are shown as ranges, never bare single numbers.
- Confidence is visible on every prediction surface.
