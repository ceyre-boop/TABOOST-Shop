# CLAUDE.md — TABOOST Shop Platform

## What This Is (The Why)

The Shop Platform tracks TikTok Shop performance for TABOOST creators: GMV, commissions, CTR, units sold, and campaign calendars across multiple creator accounts simultaneously.

**It has two distinct functions that serve different audiences:**

**1. Creator performance dashboard** — the e-commerce equivalent of the Live Platform. Shop creators see their GMV, commission earnings, TAP link performance, and sales history. Same principle as Live: show creators how their behavior drives income.

**2. TAP Links — the affiliate marketplace and talent acquisition funnel.** TABOOST brokers above-market commission rates directly with brands, then makes those rates available to *any* creator — not just their managed roster. This is accessed through the Shop Platform. Every external creator who uses TAP links sees what TABOOST offers its managed talent, making it the primary top-of-funnel for new talent recruitment. The better the commission rates TABOOST secures, the more creators the platform attracts.

These two functions are intentionally intertwined: TAP Links brings creators in; the dashboard shows them the value of being fully managed.

---

## What This Is (The How)

Same static HTML/CSS/JS architecture as the Live Platform — GitHub Pages, no backend, data compiled from CSVs into JS files.

### Data Pipeline
```
Google Sheets (managers export 7 CSVs → save to data/shop/)
  → node update-shop-data.js data/shop
  → script joins all 7 CSVs on User/Name/TikTok fields
  → writes compiled allShopData → js/shop-data.js
  → node validate-and-deploy-shop.js  (bumps ?v= cache-bust timestamps)
  → git push → GitHub Pages deploys
```

### The 7 CSV Sources (export from Sheets → data/shop/)
1. `totals.csv` — all-time totals
2. `current.csv` — current period stats
3. `history.csv` — month-by-month GMV history
4. `shop-current.csv` — shop-specific current metrics
5. `products.csv` — product performance
6. `tap-links.csv` — TAP affiliate link performance
7. `tap-products.csv` — TAP product tracking

### How It's Made — Key Files
| File | Purpose |
|---|---|
| `js/shop-data.js` | **Compiled output** — allShopData (211 creators, multi-account, monthly history) |
| `js/shop-dashboard.js` | Shop leaderboard + dashboard logic |
| `js/product-data.js` | Product performance data |
| `js/profile-view.js` | Individual creator profile modal |
| `js/auto-sync-loader.js` | Auto-sync from GitHub raw URLs |
| `update-shop-data.js` | CSV → js/shop-data.js compiler (run locally) |
| `validate-and-deploy-shop.js` | Cache-bust ?v= timestamps before push |
| `update_shop_data.py` | Python alternative for data refresh |
| `fetch_product_images.py` | Scrapes/fetches product image URLs |

### Key Pages
| Page | Purpose |
|---|---|
| `shop-dashboard.html` | Main shop leaderboard (7 views) |
| `shop-creator-dashboard.html` | Per-creator shop detail |
| `profile.html` | Creator public profile |
| `product-review.html` | Product review interface |
| `shop-login.html` | Shop login |

---

## Data Schema

### Shop creator object (js/shop-data.js — allShopData)
```js
{
  username, email, name,
  topLevel,   // "L1"–"L10" tier
  accounts: [{
    handle, tiktokLink,
    sv,           // short video posts
    tap,          // TAP video count
    tapGMV,       // GMV from TAP affiliate links
    ls,           // live streams
    liveHours, liveMinutes,
    ctr,          // click-through rate
    views, sold,  // units sold
    gmv,          // gross merchandise value (current period)
    commDollars,  // commission earned ($)
    commPct,      // commission rate (%)
    gmvLM,        // GMV last month
    bonus,
    tier,         // "Select" | "Affiliate" | etc.
    acctRank
  }],
  accountsHistory: [{
    handle,
    gmv: [month1, month2, ...]   // monthly GMV, oldest first
  }]
}
```

---

## How to Update Shop Data

1. Export the 7 CSVs from Google Sheets → save all into `data/shop/`
2. `node update-shop-data.js data/shop`
3. `node validate-and-deploy-shop.js`
4. `git add . && git commit && git push`

**Never edit `js/shop-data.js` directly** — it's a compiled output.

---

## Secondary Flow — Recent Orders (Transaction History)

Shop orders update more frequently than daily stats, so they have a separate path:

1. Manager exports "Shop Recent Orders" CSV from TikTok
2. Open `shop-ledger-update.html` locally in browser
3. Drag the CSV onto the UI
4. UI validates schema (`CID, Shop, Type, Date, Sales, Cost`) then pushes directly to `data/recent-orders.csv` via GitHub API using a `ghp_` PAT
5. `js/shop-dashboard.js` fetches this CSV at runtime — no compile step needed

---

## Cache Busting (Critical)

Always run `validate-and-deploy-shop.js` before pushing data updates. It generates a UTC timestamp (e.g. `?v=202603201416`) and replaces old `?v=` strings in `shop-dashboard.html` and `js/shop-dashboard.js`. Without this, users see stale data from CDN/browser cache.

---

## Platform vs Live — Key Differences

| | Live Platform | Shop Platform |
|---|---|---|
| Metric | Diamonds / hours | GMV / commissions / TAP |
| Audience | TikTok Live creators | TikTok Shop creators |
| Extra function | — | TAP Links talent funnel |
| Creator count | 823 | 211 |
| Compiled data | `js/data.js` | `js/shop-data.js` |
| Compile script | `update-data.js` | `update-shop-data.js` |
| Deploy script | `validate-and-deploy.js` | `validate-and-deploy-shop.js` |

---

## Do Not
- Edit `js/shop-data.js` directly
- Change the 7 CSV column schemas without updating `update-shop-data.js`
- Skip `validate-and-deploy-shop.js` before pushing — users will see stale cached data

---

## Session End Protocol

At the end of EVERY session — before your final message — write a session note to the Obsidian vault using the `obsidian-vault` MCP tool (`write_file`).

**File path:** `C:\Users\Admin\clawdbot-vault\Projects\TABOOST-Shop\Sessions\YYYY-MM-DD-[topic].md`

**Template:**
```
# Session: [topic] — YYYY-MM-DD

## What we did
[What was discussed or built]

## What changed
[Files modified, features added, bugs fixed]

## Decisions made
[Any non-obvious decisions and why]

## Next
[Open questions, what to pick up next session]
```
