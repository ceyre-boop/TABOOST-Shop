# TABOOST Shop - Data Flow & Pipeline

The Shop Creator Dashboard leverages a **headless, static data pipeline** designed to eliminate loading spinners and bypass Firebase bottlenecks by caching data directly into the platform codebase during deployment.

This enables instant, plug-and-play rendering. 

## 1. Primary Data Flow (Daily Metrics Update)
The core dashboard logic maps **7 distinct Shop leaderboards & trackers** (`totals`, `current`, `History`, `totals 1/26`, `TaP Leaders`, `Live Leaders`, `Sales Leader`) using the highly optimized \`update-shop-data.js\` compiler.

### Process Architecture:
1. **Google Sheets Export**: An agency manager exports the 7 distinct CSV files locally into the freshly designated `/data/shop/` folder.
2. **Compilation**: Running `node update-shop-data.js data/shop`.
3. **Internal Parsing**: This newly upgraded script iterates across all CSVs in the folder, dynamically reads their unique headers, anchors on the `User`/`Name`/`TikTok` fields to natively join records, and calculates pacing/leaderboard badges seamlessly into one `shopDataService`.
4. **Output Pipeline**: The compiled payload is physically written directly into `js/shop-data.js`. The dashboard sources this statically!

## 2. Secondary Data Flow (Recent Orders / Transactions)
The `Transaction History` (formerly Earnings History) table runs asynchronously because shop transaction velocity updates faster than aggregated daily stats. 

### Process Architecture:
1. **Export**: The manager exports the "Shop Recent Orders" CSV log.
2. **Shop Ledger Drag-and-Drop**: The manager opens `shop-ledger-update.html` locally in their browser.
3. **Validation & Github API Push**: 
   - They drag `Recent_Orders.csv` onto the UI.
   - The UI validates column schema constraints exactly (`CID, Shop, Type, Date, Sales, Cost`).
   - Using the Github `ghp_` PAT (Personal Access Token), the browser initiates an HTTPS PUT request directly to `data/recent-orders.csv` on the master branch.

## 3. Deployment & Cache Busting (CRITICAL)
Without proper invalidation, Edge CDN caches and end-user browsers will stubbornly display old Sales data.

**The Fix:**
1. After all CSV drops, the deployment engineer executes `node validate-and-deploy-shop.js`.
2. This pre-flight validation enforces strict logic checks.
3. It generates a 12-digit timestamp integer corresponding to the immediate runtime UTC time: `?v=202603201416`
4. It strips and replaces old querystring versions from:
   - `shop-dashboard.html` (for CSS and JS links)
   - `js/shop-dashboard.js` (for the internal `recent-orders.csv` fetch string).
5. Committing these timestamp changes globally triggers Github Pages cache wipe, so any user visiting the platform forces a fresh redownload.

---

## 4. OPEN DATA REQUIREMENT — `Product ID` on the product exports

**Ask:** add `Product ID` to the exports that generate **Top 5 Products** and **Suggested
Products**.

```
Current:  Creator | Product Name | GMV
Needed:   Creator | Product Name | Product ID | GMV
```

**Why.** The Shop Account Audit modal shows a product thumbnail per row. Images are resolved by
**TikTok product ID** — `fetch_product_images.py` reads `tiktok.com/view/product/{id}` and caches
the result in `data/shop/product-images.json`. Those exports carry only a product *name*, so the
only dataset that can bridge name → ID is the TAP campaign catalog (`tap-products.csv`).

Consequences today, measured:

| | |
|---|---|
| Image coverage, TAP-catalog products | **98.9%** |
| Image coverage, non-TAP products | **0.0%** |
| Cached images orphaned (no dataset maps the ID back to a name) | **2,135** |

So a creator whose recommendations are mostly non-TAP products sees the ★ placeholder on every
row. That is an honest data limitation, **not** a UI bug — and it must not be "fixed" with looser
title matching, which would risk attaching the wrong product or the wrong TAP campaign.

**Once the column exists**, no new tooling is needed:
- join images by **exact product ID** — `resolveFeedColumns()` in `build-audit-products.js` and
  `saResolveColumns()` in `js/shop-audit.js` already detect an optional per-slot id column and
  will use it automatically
- keep **TAP campaign matching independent and title-based** (SKU-level). A product ID must never
  influence which campaign is attached to a row.

Both parsers resolve their columns from the CSV **header**, not fixed offsets, so inserting the
new column will not shift-corrupt the parse. Until it appears, output is unchanged.
