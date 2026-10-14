# TABOOST Shop — Snapshot History Handoff

**Generated:** 2026-10-14 from the git history of `ceyre-boop/TABOOST-Shop`.
**Regenerate:** `bun scripts/extract-git-snapshots.ts handoff` (takes ~4 s).
**Source of truth:** every row is a verbatim copy of a file as it existed at a commit. Nothing here was modelled or interpolated.

## Answer to the three questions

| Asked for | Exists? | Where in this folder |
|---|---|---|
| 1. Daily snapshots from before July | **Yes, back to 2026-04-02.** The repo commits the compiled data every time the sheet syncs, so git history is the archive. Roughly weekly for products, near-daily for creators. | `product-snapshots.csv`, `creator-snapshots.csv` |
| 2. Wider roster | No. 166 creators today, 269 distinct emails ever seen across the history. | `creator-snapshots.csv` (column `email`) |
| 3. Posts, not sales (creator → brand pairs) | **Partial.** There is no deal log. What exists is a dated brand list (which TAP campaigns were live, with start/end dates) and per-creator TAP post counts per snapshot. The pairing of creator to brand is NOT recorded anywhere. | `campaigns.csv` + `tap_posts` column in `creator-snapshots.csv` |

Not available from the repo: Google Sheet version history before 2026-04-02, and any brand-attributed post log. Both would have to come from Marco.

## Files

### `product-snapshots.csv` — 60,404 rows, 22 snapshots, 2026-04-07 → 2026-10-04
One row per product per snapshot of the TAP products sheet. 5,196 distinct product IDs, 2,089 distinct brand labels.

| column | meaning |
|---|---|
| `snapshot_date` | commit date of the sync (YYYY-MM-DD). Use this as the observation date. |
| `commit` | short SHA, for audit |
| `product_id` | TikTok Shop product ID, stable across snapshots |
| `product_name` | truncated by the sheet at ~60 chars |
| `brand` | **resolved brand**: `shop_name` when present, else `campaign_name`. Never blank. |
| `shop_name` | TikTok Shop storefront name. Blank on ~1/3 of rows (sheet placeholder `~~~`). |
| `category` | TikTok category, same blank pattern as `shop_name` |
| `sale_price` | string as shown, e.g. `$17.49-$22.47`; blank in early April snapshots |
| `items_sold` | **cumulative lifetime units sold** for the product as of that snapshot, per TikTok. Difference between two snapshots = units in that window. Not monotonic if TikTok restates. |
| `tap_commission_pct` | TABOOST's negotiated TAP rate |
| `open_collab_commission_pct` | the public open-collab rate for comparison |
| `campaign_id`, `campaign_name` | TAP campaign the product sits under |
| `rank` | row rank within the sheet at that snapshot |

Snapshot dates: 04-07, 04-08, 04-17, 04-27, 04-29, 04-30, 05-01, 05-08, 05-29, 06-01, 06-04, 06-26, 06-29, 07-01, 07-03, 07-10, 07-24, 08-03, 08-16, 09-03, 09-30, 10-04. Row counts per snapshot range 1,155 (04-29, partial sync) to 3,479.

Caveats:
- `brand` falls back to the campaign name, and some campaign names are groupings rather than brands (`Fashion 2026`, `Beauty 2026`, `ColourPop 1` / `ColourPop 2`). Map those by `campaign_id` if brand identity matters.
- `items_sold` is a lifetime counter from TikTok's product page, not TABOOST's sales. It measures the product's market, not the agency.
- The 2026-04-29 snapshot has a third of the usual rows; treat as partial.

### `creator-snapshots.csv` — 32,070 rows, 125 snapshot days, 2026-04-02 → 2026-10-13
One row per creator **account** (a creator can have several TikTok handles) per snapshot of the compiled creator data. Metrics are month-to-date for the calendar month of the snapshot and reset on the 1st.

| column | meaning |
|---|---|
| `snapshot_date` | commit date |
| `data_generated` | the compile timestamp inside the file; lags `snapshot_date` on 5 days only |
| `email` | creator key (Shop creators are keyed by email, not handle) |
| `name`, `top_level` | display name, L1–L10 tier |
| `handle`, `tier` | TikTok handle, account tier (Select / Affiliate / …; blank early on) |
| `sv_posts` | short videos posted MTD |
| `tap_posts` | TAP-link videos posted MTD — **the closest thing to an attention signal** |
| `tap_gmv` | GMV attributed to TAP links MTD |
| `live_streams`, `live_hours` | live sessions MTD |
| `ctr`, `views` | click-through rate, video views MTD |
| `units_sold`, `gmv` | units and gross merchandise value MTD |
| `commission_dollars`, `commission_pct` | creator's commission MTD; blank before the sheet added those columns (~late April) |
| `gmv_last_month` | prior calendar month GMV, as the sheet reported it |
| `acct_rank` | rank within the roster at that snapshot |

Snapshot days per month: Apr 17, May 23, Jun 20, Jul 20, Aug 20, Sep 18, Oct 7 (so far).

Caveats:
- MTD semantics: to get a daily series, difference consecutive snapshots within a month; the first snapshot of a month is the first few days' total.
- Schema grew over time. Early snapshots have blanks in `tier`, `commission_*`, `gmv_last_month`. Blank means "column did not exist yet", not zero.
- The compiled file is also what the public dashboard reads, so no creator here is private.

### `campaigns.csv` — 133 rows, HEAD only
The TAP campaign list: one row per brand campaign with the window it was live.

| column | meaning |
|---|---|
| `campaign_id` | TikTok campaign ID (a few internal `TABOOSTnnn` IDs) |
| `brand` | campaign / brand name |
| `priority` | sheet's priority bucket |
| `start_date`, `end_date` | M/D/YYYY. Starts span 2024-07-03 → 2026-01-21; ends 2026-02-28 → 2031-09-30 (some are placeholders). 7 campaigns are live on 2026-10-14 by these dates. |
| `affiliate_link` | TAP share link |
| `acct_rank` | sheet column, mostly 1 |

This file has no git history worth extracting (10 commits, mostly link edits). It is the brand side of the attention feed; the creator side is `tap_posts`, unattributed.

## How the pieces could join
- Product → brand: `product_id` is stable; `brand`/`campaign_id` give the brand.
- Brand → window: `campaigns.csv` by `campaign_id` or by name.
- Creator → brand: **not possible from this data.** `tap_posts` per creator per day is available; which brand each post was for is not.

## Monthly archives (already in the repo, not duplicated here)
`data/shop/monthly/2026-0{7,8,9}*.csv` — month-close copies of the products and creator sheets for Jul, Aug, Sep. They are the same data as the last snapshot of each month.
