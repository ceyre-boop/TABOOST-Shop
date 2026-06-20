/*
 * Creator Revenue Score — personalization v1 (genie-preview branch)
 * ------------------------------------------------------------------
 * Replaces the static Sheet `score` as the tiering input for the product grid.
 * Composite 0–100 = weighted sum of four signals, each normalized to 0–100:
 *
 *   Commission rate  40%  — primary money signal (higher commission = more agency revenue)
 *   Proven sales/GMV 30%  — log-scaled `sold`, so 75k sellers don't dwarf everyone
 *   Category match   20%  — this-session interest from sessionStorage tap counts
 *   Freshness        10%  — "New drop" first-mover bonus (sold < 1000); no per-product
 *                           date exists yet, so we proxy with the existing low-sales signal.
 *
 * The shuffle-within-tier behavior Marco approved is unchanged — we only make the
 * tier assignment smarter. Drop-in replacement: index.html's scoreTierShuffle()
 * delegates here, which covers every product render path (search + campaign).
 *
 * All knobs are constants below — trivial to retune once we see live distribution.
 */
(function () {
  'use strict';

  // --- Tunable config -------------------------------------------------------
  var WEIGHTS = { commission: 0.40, gmv: 0.30, category: 0.20, freshness: 0.10 };

  // Tier bands are SELF-CALIBRATING — derived from the live catalog's cold-score
  // distribution at init(), not hardcoded. Hardcoded absolute bands break here
  // because a single 50%-commission / 2M-sold outlier compresses everyone else's
  // absolute composite, and the data regenerates daily. Instead we band by
  // percentile of the cold (no-session) composite, so the top slice always lands
  // in Tier 1 and tiers stay populated regardless of how the raw numbers shift.
  // A creator browsing a category adds up to +20, pushing those products up a tier.
  var TIER1_PCTL = 80;  // cold composite >= 80th pctl -> Tier 1 (renders first, ~top 20%)
  var TIER2_PCTL = 45;  // cold composite >= 45th pctl -> Tier 2 (renders second)
                        // below                        -> Tier 3 (renders last)

  var NEW_DROP_MAX_SOLD = 1000; // sold below this = "New drop" first-mover bonus

  // --- Cached dataset maxima + computed bands (set once via init) -----------
  var maxCommission = 0;
  var maxSold = 0;
  var tier1Min = 0;     // composite threshold for Tier 1 (computed in init)
  var tier2Min = 0;     // composite threshold for Tier 2 (computed in init)
  var ready = false;

  // --- Parsing helpers (mirror index.html's existing parsing) ---------------
  function parseCommission(p) {
    var raw = String(p && p.commission != null ? p.commission : '0').split('\n')[0];
    var n = parseFloat(raw.replace(/[^0-9.]/g, ''));
    return isFinite(n) ? n : 0;
  }

  function parseSold(p) {
    var n = parseInt(String(p && p.sold != null ? p.sold : '0').replace(/[^0-9]/g, ''), 10);
    return isFinite(n) ? n : 0;
  }

  // --- Component scores (each returns 0–100) --------------------------------
  function commissionScore(p) {
    if (!maxCommission) return 0;
    return Math.min(100, (parseCommission(p) / maxCommission) * 100);
  }

  function gmvScore(p) {
    if (!maxSold) return 0;
    // log scale so a 75k seller doesn't flatten everything below it
    return Math.min(100, (Math.log(parseSold(p) + 1) / Math.log(maxSold + 1)) * 100);
  }

  function categoryScore(p, ctx) {
    if (!ctx || !ctx.topCount) return 0;            // no session interest yet
    var c = ctx.counts[p.category] || 0;
    if (!c) return 0;
    return (c / ctx.topCount) * 100;                // most-tapped category -> 100
  }

  function freshnessScore(p) {
    return parseSold(p) < NEW_DROP_MAX_SOLD ? 100 : 0;
  }

  // Cold composite: the static signals only (category excluded). Used to derive
  // tier bands so a creator's live category interest can lift products ABOVE
  // their cold tier rather than defining the bands themselves.
  function coldTotal(p) {
    return WEIGHTS.commission * commissionScore(p) +
           WEIGHTS.gmv * gmvScore(p) +
           WEIGHTS.freshness * freshnessScore(p);
  }

  function percentile(sortedAsc, q) {
    if (!sortedAsc.length) return 0;
    return sortedAsc[Math.floor((q / 100) * (sortedAsc.length - 1))];
  }

  // --- Public API -----------------------------------------------------------
  function init(products) {
    var list = products || (typeof window !== 'undefined' && window.PRODUCT_DATA) || [];
    maxCommission = 0;
    maxSold = 0;
    for (var i = 0; i < list.length; i++) {
      var c = parseCommission(list[i]);
      var s = parseSold(list[i]);
      if (c > maxCommission) maxCommission = c;
      if (s > maxSold) maxSold = s;
    }
    ready = true; // maxima are set — coldTotal can be computed now

    // Self-calibrating tier bands from the cold-composite distribution.
    var colds = [];
    for (var j = 0; j < list.length; j++) colds.push(coldTotal(list[j]));
    colds.sort(function (a, b) { return a - b; });
    tier1Min = percentile(colds, TIER1_PCTL);
    tier2Min = percentile(colds, TIER2_PCTL);

    return {
      maxCommission: maxCommission, maxSold: maxSold, count: list.length,
      tier1Min: Math.round(tier1Min), tier2Min: Math.round(tier2Min)
    };
  }

  function score(product, ctx) {
    if (!ready) init();
    var commission = commissionScore(product);
    var gmv = gmvScore(product);
    var category = categoryScore(product, ctx);
    var freshness = freshnessScore(product);
    var total =
      WEIGHTS.commission * commission +
      WEIGHTS.gmv * gmv +
      WEIGHTS.category * category +
      WEIGHTS.freshness * freshness;
    return {
      total: total,
      commission: commission,
      gmv: gmv,
      category: category,
      freshness: freshness
    };
  }

  function tierFor(total) {
    if (total >= tier1Min) return 1;
    if (total >= tier2Min) return 2;
    return 3;
  }

  // Fisher–Yates — identical to the shuffle Marco approved
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function trackCategory(category) {
    if (!category) return;
    try {
      var key = 'tb_cat_' + category;
      var n = parseInt(sessionStorage.getItem(key) || '0', 10) || 0;
      sessionStorage.setItem(key, String(n + 1));
    } catch (e) { /* sessionStorage unavailable — personalization simply stays off */ }
  }

  function getSessionContext() {
    var counts = {};
    var topCat = null;
    var topCount = 0;
    try {
      for (var i = 0; i < sessionStorage.length; i++) {
        var k = sessionStorage.key(i);
        if (k && k.indexOf('tb_cat_') === 0) {
          var cat = k.slice('tb_cat_'.length);
          var n = parseInt(sessionStorage.getItem(k) || '0', 10) || 0;
          counts[cat] = n;
          if (n > topCount) { topCount = n; topCat = cat; }
        }
      }
    } catch (e) { /* sessionStorage unavailable */ }
    return { counts: counts, topCat: topCat, topCount: topCount };
  }

  function debugEnabled() {
    try {
      if (localStorage.getItem('SCORING_DEBUG') === '1') return true;
    } catch (e) { /* ignore */ }
    return typeof location !== 'undefined' && /[?&]debug=1\b/.test(location.search);
  }

  // Drop-in replacement for scoreTierShuffle: score -> bucket into 3 tiers ->
  // shuffle within each tier -> concat (Tier 1 first). Order rotates each call.
  function sortAndTier(products, ctx) {
    if (!ready) init();
    if (!ctx) ctx = getSessionContext();
    var buckets = { 1: [], 2: [], 3: [] };
    var breakdown = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var sc = score(p, ctx);
      var tier = tierFor(sc.total);
      buckets[tier].push(p);
      if (breakdown.length < 5) {
        breakdown.push({
          name: String(p.name || '').slice(0, 32),
          commission: Math.round(sc.commission),
          gmv: Math.round(sc.gmv),
          category: Math.round(sc.category),
          freshness: sc.freshness,
          total: Math.round(sc.total),
          tier: tier
        });
      }
    }
    shuffle(buckets[1]);
    shuffle(buckets[2]);
    shuffle(buckets[3]);

    if (debugEnabled() && typeof console !== 'undefined') {
      console.log('[CreatorScore] weights', WEIGHTS,
        '| bands', { tier1Min: Math.round(tier1Min), tier2Min: Math.round(tier2Min), pctl: [TIER1_PCTL, TIER2_PCTL] },
        '| maxCommission', maxCommission, '| maxSold', maxSold,
        '| session topCat', ctx.topCat, '(' + ctx.topCount + ')',
        '| tier sizes', { t1: buckets[1].length, t2: buckets[2].length, t3: buckets[3].length });
      if (console.table) console.table(breakdown);
    }

    return buckets[1].concat(buckets[2], buckets[3]);
  }

  window.CreatorScore = {
    init: init,
    score: score,
    sortAndTier: sortAndTier,
    trackCategory: trackCategory,
    getSessionContext: getSessionContext,
    shuffle: shuffle
  };
})();
