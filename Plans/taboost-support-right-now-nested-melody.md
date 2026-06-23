# Plan — Creator Revenue Score v1.1: Marco's rating drives 80%

## Context

v1 (shipped on `genie-preview`) computed the composite from commission 40% + GMV 30% +
category 20% + freshness 10%. Marco's feedback: he **already has a rating score** (`score`,
0–11) pushed through every sheet, and it's **what TABOOST gets paid on AND already reflects
what's selling**. So commission + GMV are redundant — his rating subsumes both, and it's
zero extra work since it's already in the data. Reweight so the **rating is 80%** of the
composite; the remaining **20%** stays a surfacing nudge (personalization + new-product
discovery) to push the right products closer to the top where creators will see them.

This is a one-file change to `js/scoring.js`. The `index.html` wiring (delegation, init call,
category-tracking hooks) is unchanged — it just calls `CreatorScore.sortAndTier` as before.

> Mobile header text change is **explicitly deferred** per Marco/TABOOST — not in this plan.

---

## New weighting

| Component | Weight | Source | Normalization |
|-----------|--------|--------|---------------|
| **Rating** | **80%** | `product.score` (0–11, Marco's sheet rating) | `score / maxRating × 100`. Already encodes commission + sales. |
| **Category match** | 15% | sessionStorage tap counts (unchanged) | Most-tapped category → 100; others scale by share; 0 if no taps. |
| **Freshness (New drop)** | 5% | `sold < 1000` (unchanged) | Full 5% if new drop — gives new products with no sales history a chance to be seen. |

**Commission (40%) and GMV (30%) are removed from the composite** — the rating replaces both.

### Why this behaves well
The catalog's `score` is 0–11, clustered at 2–4 (max 11). At 80% weight the composite spreads
roughly with the rating (score 5+ ≈ top ~20%, score 3–4 ≈ middle, score ≤2 ≈ bottom), so the
**self-calibrating percentile tier bands (p80/p45) map cleanly onto Marco's rating tiers** —
his rating decides who's on top, exactly as intended. Category match adds up to +15 (≈ 2 score
levels) so a creator's browsed category lifts those products ~1 tier without flattening
everything (the wider rating-driven spread prevents the v1 razor-thin-band collapse). Freshness
adds a gentle +5 so brand-new products (low rating only because they're unproven) still surface.

---

## Changes — `js/scoring.js` only

1. **Weights** (line ~23):
   `var WEIGHTS = { rating: 0.80, category: 0.15, freshness: 0.05 };`
2. **Add rating helpers** (alongside the existing parse/score helpers):
   - `parseRating(p)` → `parseInt(p.score, 10) || 0`.
   - `ratingScore(p)` → `maxRating ? Math.min(100, parseRating(p) / maxRating * 100) : 0`.
3. **`init()`** (line ~95): replace the `maxCommission`/`maxSold` scan with a `maxRating` scan
   (`maxRating = max(parseRating(p))`). Keep `parseSold` (freshness still needs the `<1000`
   check — no max required). Return `maxRating` in the debug object.
4. **`coldTotal(p)`** (line ~83): `WEIGHTS.rating * ratingScore(p) + WEIGHTS.freshness * freshnessScore(p)`
   (category still excluded — it's the session lever that bumps products above their cold tier).
5. **`score()`** (line ~120): compute `rating`, `category`, `freshness`; `total =
   WEIGHTS.rating*rating + WEIGHTS.category*category + WEIGHTS.freshness*freshness`; return
   `{ total, rating, category, freshness }`.
6. **Remove** the now-unused `commissionScore` / `gmvScore` functions and the
   `maxCommission` / `maxSold` vars (keep `parseSold`).
7. **Debug output**: update the `[CreatorScore]` log to print `maxRating` instead of
   `maxCommission`/`maxSold`, and the `console.table` breakdown columns in `sortAndTier` to
   `{ name, rating, category, freshness, total, tier }`.

Tier-band logic (percentile p80/p45), the shuffle-within-tier behavior Marco approved, and all
`index.html` integration stay **exactly as they are**.

---

## Verification

Re-run the Node harness against the real catalog (the same approach that caught the v1 band bug):
load `product-data.js` + `scoring.js` with a `window`/`sessionStorage` shim, then confirm:

1. **`init` reports `maxRating: 11`** and computes sane tier bands.
2. **Rating drives tiers** — group products by raw `score`; confirm high-`score` products land
   Tier 1 and low-`score` land Tier 3 (cold, no session). Healthy 3-way split (not all one tier).
3. **Personalization intact** — a product's total rises ~+15 after 3 taps of its category, and
   browsed-category products move up ~a tier (but do NOT all collapse into Tier 1 like v1).
4. **New-drop nudge** — two same-rating products, the `sold < 1000` one ranks slightly higher.
5. **Breakdown** — `?debug=1` console.table shows `rating / category / freshness / total / tier`
   for the first 5, weights sum to 1.0.

Then (in-browser, once Render rebuilds the `genie-preview` preview): open `?debug=1`, click a
category 3×, confirm those products rise; reload a few times and confirm best-rated stay on top
with order rotating within tier. *(Real-Chrome step needs Interceptor, which isn't installed
locally — so this is the one check that happens on the deployed preview, not from here.)*

Ship: `git add js/scoring.js && git commit && git push origin genie-preview`.

## Out of scope
- Mobile search-results header text removal (deferred by request).
- Real recency field + Firebase cross-session persistence (still v2).
