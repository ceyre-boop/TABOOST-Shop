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
  // Marco's sheet rating (`score`, 0–11) IS the money signal — it already reflects
  // both what TABOOST gets paid on and what's selling. So it carries 80% of the
  // composite; the remaining 20% is a surfacing nudge: category match (show the
  // creator what they're browsing) + a small new-drop bonus (give unproven products
  // a chance to be seen). Commission/GMV are intentionally NOT separate signals —
  // the rating subsumes them.
  var WEIGHTS = { rating: 0.80, category: 0.15, freshness: 0.05 };

  // Tier bands are SELF-CALIBRATING — derived from the live catalog's cold-score
  // distribution at init(), not hardcoded. Absolute bands break here because the
  // raw inputs cluster tightly and the data regenerates daily. Banding by percentile
  // of the cold (no-session) composite keeps the top slice in Tier 1 and all tiers
  // populated no matter how the numbers shift. With rating at 80% the cold composite
  // tracks Marco's rating, so the bands map onto his rating tiers. A browsed category
  // adds up to +15 (~2 rating levels), lifting those products ~1 tier — enough to
  // personalize, not enough to flatten the rating ordering.
  var TIER1_PCTL = 80;  // cold composite >= 80th pctl -> Tier 1 (renders first, ~top 20%)
  var TIER2_PCTL = 45;  // cold composite >= 45th pctl -> Tier 2 (renders second)
                        // below                        -> Tier 3 (renders last)

  var NEW_DROP_MAX_SOLD = 1000; // sold below this = "New drop" bonus

  // --- Cached dataset max + computed bands (set once via init) --------------
  var maxRating = 0;
  var tier1Min = 0;     // composite threshold for Tier 1 (computed in init)
  var tier2Min = 0;     // composite threshold for Tier 2 (computed in init)
  var ready = false;

  // --- Parsing helpers (mirror index.html's existing parsing) ---------------
  function parseRating(p) {
    var n = parseInt(p && p.score != null ? p.score : 0, 10);
    return isFinite(n) ? n : 0;
  }

  function parseSold(p) {
    var n = parseInt(String(p && p.sold != null ? p.sold : '0').replace(/[^0-9]/g, ''), 10);
    return isFinite(n) ? n : 0;
  }

  // --- Component scores (each returns 0–100) --------------------------------
  function ratingScore(p) {
    if (!maxRating) return 0;
    return Math.min(100, (parseRating(p) / maxRating) * 100);
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
    return WEIGHTS.rating * ratingScore(p) +
           WEIGHTS.freshness * freshnessScore(p);
  }

  function percentile(sortedAsc, q) {
    if (!sortedAsc.length) return 0;
    return sortedAsc[Math.floor((q / 100) * (sortedAsc.length - 1))];
  }

  // --- Public API -----------------------------------------------------------
  function init(products) {
    var list = products || (typeof window !== 'undefined' && window.PRODUCT_DATA) || [];
    maxRating = 0;
    for (var i = 0; i < list.length; i++) {
      var r = parseRating(list[i]);
      if (r > maxRating) maxRating = r;
    }
    ready = true; // maxRating is set — coldTotal can be computed now

    // Self-calibrating tier bands from the cold-composite distribution.
    var colds = [];
    for (var j = 0; j < list.length; j++) colds.push(coldTotal(list[j]));
    colds.sort(function (a, b) { return a - b; });
    tier1Min = percentile(colds, TIER1_PCTL);
    tier2Min = percentile(colds, TIER2_PCTL);

    return {
      maxRating: maxRating, count: list.length,
      tier1Min: Math.round(tier1Min), tier2Min: Math.round(tier2Min)
    };
  }

  function score(product, ctx) {
    if (!ready) init();
    var rating = ratingScore(product);
    var category = categoryScore(product, ctx);
    var freshness = freshnessScore(product);
    var total =
      WEIGHTS.rating * rating +
      WEIGHTS.category * category +
      WEIGHTS.freshness * freshness;
    return {
      total: total,
      rating: rating,
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
          rating: Math.round(sc.rating),
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
        '| maxRating', maxRating,
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
