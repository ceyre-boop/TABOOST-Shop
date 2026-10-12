#!/usr/bin/env node
/**
 * build-daily-shortlist.js — the product picker for the faceless TikTok Shop lane.
 *
 * Reads js/product-data.js (the compiled TAP catalog) and writes a daily shortlist
 * ranked by  commission% × units sold × TAP uplift over open-collab × price factor,
 * with the hero image URL, 3 hooks, a caption and a hashtag set per product —
 * ready to drop into CapCut or TikTok photo mode.
 *
 * Run:  node build-daily-shortlist.js [--top 15] [--date 2026-10-12] [--cooldown 7]
 *                                     [--category "Beauty & Personal Care"] [--max-price 40]
 *
 * Outputs: data/shop/daily-shortlist.json   (machine-readable)
 *          data/shop/daily-shortlist.md     (paste into CapCut / photo mode)
 * Rotation: data/shop/shortlist-history.json remembers what was picked; a product
 *           is not re-picked for --cooldown days (default 7).
 */

const fs = require('fs');
const path = require('path');

// -- args --------------------------------------------------------------------
const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : def;
}
const TOP = parseInt(arg('top', '15'), 10);
const DATE = arg('date', new Date().toISOString().slice(0, 10));
const COOLDOWN = parseInt(arg('cooldown', '7'), 10);
const CATEGORY = arg('category', null);
const MAX_PRICE = parseFloat(arg('max-price', 'NaN'));
const MIN_SOLD = parseInt(arg('min-sold', '200'), 10);

const ROOT = __dirname;
const SRC = path.join(ROOT, 'js', 'product-data.js');
const OUT_DIR = path.join(ROOT, 'data', 'shop');
const OUT_JSON = path.join(OUT_DIR, 'daily-shortlist.json');
const OUT_MD = path.join(OUT_DIR, 'daily-shortlist.md');
const HISTORY = path.join(OUT_DIR, 'shortlist-history.json');

// -- load catalog -------------------------------------------------------------
function loadCatalog() {
  const src = fs.readFileSync(SRC, 'utf8');
  const m = src.match(/window\.PRODUCT_DATA = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error(`Could not find window.PRODUCT_DATA in ${SRC}`);
  return JSON.parse(m[1]);
}

// -- parsing helpers ----------------------------------------------------------
const num = (s) => parseFloat(String(s ?? '').replace(/[^0-9.]/g, '')) || 0;
const pct = (s) => {
  const m = String(s ?? '').match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : 0;
};
/** "$17.49-$22.47" -> {low, high} */
function parsePrice(s) {
  const nums = String(s ?? '').match(/\d+(?:\.\d+)?/g) || [];
  const v = nums.map(Number);
  if (!v.length) return { low: 0, high: 0 };
  return { low: Math.min(...v), high: Math.max(...v) };
}
/** "vs. open collab 10%-12%" -> 12 (the rate an unmanaged creator would get, upper bound) */
function parseOpenRate(vsText) {
  const nums = String(vsText ?? '').match(/\d+(?:\.\d+)?/g) || [];
  return nums.length ? Math.max(...nums.map(Number)) : 0;
}
function cleanName(name) {
  return String(name ?? '').replace(/\.\.\.$/, '').replace(/^\[[^\]]*\]\s*/, '').replace(/\s+/g, ' ').trim();
}
function shortName(name, max = 48) {
  const n = cleanName(name);
  if (n.length <= max) return n;
  const cut = n.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ') > 20 ? cut.lastIndexOf(' ') : max);
}

// -- scoring ------------------------------------------------------------------
/**
 * score = commission% × sold × uplift × priceFactor
 *   uplift      = TAP rate / open-collab rate (≥1). The repo has no price-discount
 *                 field; the commission uplift IS the discount TABOOST negotiated.
 *   priceFactor = 1 for $10–$40 (impulse band), tapering outside it. Shop videos
 *                 convert on impulse price points; sub-$10 pays too little per sale.
 */
function priceFactor(low) {
  if (low <= 0) return 0.5;
  if (low < 10) return 0.6;
  if (low <= 40) return 1.0;
  if (low <= 80) return 0.8;
  return 0.6;
}
function scoreProduct(p) {
  const commission = pct(p.commission);
  const sold = num(p.sold);
  const open = parseOpenRate(p.vsText);
  const uplift = open > 0 ? Math.max(1, commission / open) : 1;
  const price = parsePrice(p.price);
  const expectedPayout = price.low * commission / 100; // $ per sale, low end
  const score = commission * sold * uplift * priceFactor(price.low);
  return { commission, sold, open, uplift, price, expectedPayout, score };
}

// -- hooks + captions ---------------------------------------------------------
const CATEGORY_ANGLE = {
  'Beauty & Personal Care': 'skin',
  'Health': 'body',
  'Phones & Electronics': 'tech',
  'Computers & Office Equipment': 'tech',
  'Household Appliances': 'home',
  'Home Supplies': 'home',
  'Kitchenware': 'home',
  'Furniture': 'home',
  'Textiles & Soft Furnishings': 'home',
  'Home Improvement': 'home',
  'Tools & Hardware': 'home',
  'Sports & Outdoor': 'fitness',
  'Shoes': 'fashion',
  'Womenswear & Underwear': 'fashion',
  'Menswear & Underwear': 'fashion',
  'Fashion Accessories': 'fashion',
  'Jewelry Accessories & Derivatives': 'fashion',
  'Luggage & Bags': 'fashion',
  'Food & Beverages': 'food',
  'Pet Supplies': 'pet',
  'Toys & Hobbies': 'fun',
  'Automotive & Motorcycle': 'car',
};
const HOOKS = {
  skin: [
    '{sold} people bought this for their skin. Here\'s why.',
    'The ${price} {name} TikTok won\'t stop talking about',
    'Stop scrolling if your skincare routine is missing this',
  ],
  body: [
    '{sold} sold and it\'s only ${price}',
    'I didn\'t believe the reviews on this until I tried it',
    'The ${price} health find everyone\'s adding to cart',
  ],
  tech: [
    '{sold} sold. ${price}. Still in stock.',
    'Why pay more? This ${price} {name} does the job',
    'The tech deal TikTok Shop is hiding right now',
  ],
  home: [
    'This ${price} find fixed the most annoying thing in my house',
    '{sold} people can\'t be wrong about this',
    'Under ${price} and it actually works',
  ],
  fitness: [
    '{sold} sold. ${price}. Your gym bag needs this.',
    'The ${price} upgrade that makes workouts easier',
    'Don\'t buy the expensive one. Buy this.',
  ],
  fashion: [
    'POV: you found the ${price} {name} everyone keeps asking about',
    '{sold} sold and it\'s ${price}. Run.',
    'The ${price} piece that looks 3x the price',
  ],
  food: [
    '{sold} people ordered this. ${price}.',
    'If you see this on TikTok Shop, grab it',
    'The ${price} snack that keeps selling out',
  ],
  pet: [
    'Your pet is going to lose it over this ${price} find',
    '{sold} pet owners bought this. Here\'s why.',
    'The ${price} thing every dog owner needs',
  ],
  fun: [
    '{sold} sold. ${price}. Instant fun.',
    'The ${price} gift that wins every time',
    'Why is this only ${price}?',
  ],
  car: [
    'The ${price} car gadget with {sold} sold',
    'Every driver needs this. ${price}.',
    'I keep this in my car and it\'s saved me more than once',
  ],
  generic: [
    '{sold} sold and it\'s only ${price}',
    'The ${price} find TikTok Shop keeps pushing',
    'Why is everyone buying this?',
  ],
};
function fmtSold(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}
/** TikTok CDN hero (1000–4000px) vs a scraped Google thumbnail (~200px, not usable for video) */
function imageQuality(url) {
  if (/ttcdn-us\.com|tiktokcdn/.test(url)) {
    const m = url.match(/webp:(\d+):(\d+)/);
    return m ? `${m[1]}px` : 'cdn';
  }
  if (/gstatic|googleusercontent/.test(url)) return 'LOW-RES thumbnail — re-fetch hero before filming';
  return 'unknown';
}
function fill(tpl, p, s) {
  return tpl
    .replace(/\{sold\}/g, fmtSold(s.sold))
    .replace(/\{price\}/g, s.price.low.toFixed(2).replace(/\.00$/, ''))
    .replace(/\{name\}/g, shortName(p.name, 32));
}
function buildHooks(p, s) {
  const angle = CATEGORY_ANGLE[p.category] || 'generic';
  return HOOKS[angle].map((t) => fill(t, p, s));
}
function buildCaption(p, s) {
  const n = shortName(p.name, 60);
  const priceStr = s.price.high > s.price.low
    ? `from $${s.price.low.toFixed(2)}`
    : `$${s.price.low.toFixed(2)}`;
  return `${n} — ${priceStr}, ${fmtSold(s.sold)} sold. Link in bio / tap the orange cart 🛒`;
}
function buildHashtags(p) {
  const cat = String(p.category || '').toLowerCase().replace(/[^a-z ]/g, '').trim().split(/\s+/)[0];
  const tags = ['tiktokshop', 'tiktokmademebuyit', 'tiktokshopfinds'];
  if (cat && cat !== 'other') tags.push(cat + 'finds');
  return tags.map((t) => '#' + t).join(' ');
}

// -- rotation history ---------------------------------------------------------
function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY, 'utf8')); } catch { return {}; }
}
function daysBetween(a, b) {
  return Math.round((new Date(a) - new Date(b)) / 86400000);
}

// -- main ---------------------------------------------------------------------
function main() {
  const catalog = loadCatalog();
  const history = loadHistory();
  const seenIds = new Set();

  const scored = catalog
    .filter((p) => p.image && /^https?:/.test(p.image))
    .filter((p) => p.link)
    .filter((p) => !CATEGORY || p.category === CATEGORY)
    .map((p) => ({ p, s: scoreProduct(p) }))
    .filter(({ s }) => s.sold >= MIN_SOLD && s.commission > 0 && s.price.low > 0)
    .filter(({ s }) => Number.isNaN(MAX_PRICE) || s.price.low <= MAX_PRICE)
    .filter(({ p }) => {
      const key = cleanName(p.name).toLowerCase();
      if (seenIds.has(key)) return false;
      seenIds.add(key);
      return true;
    })
    .sort((a, b) => b.s.score - a.s.score);

  const eligible = scored.filter(({ p }) => {
    const last = history[p.id];
    return !last || daysBetween(DATE, last) >= COOLDOWN;
  });
  const picks = eligible.slice(0, TOP);

  const shortlist = picks.map(({ p, s }, i) => ({
    rank: i + 1,
    id: p.id,
    name: cleanName(p.name),
    brand: p.creator,
    category: p.category,
    price: p.price,
    priceLow: s.price.low,
    commission: `${s.commission}%`,
    openCollab: s.open ? `${s.open}%` : null,
    uplift: +s.uplift.toFixed(2),
    sold: s.sold,
    expectedPayoutPerSale: +s.expectedPayout.toFixed(2),
    score: Math.round(s.score),
    image: p.image.replace(/&amp;/g, '&'),
    imageQuality: imageQuality(p.image),
    link: p.link,
    hooks: buildHooks(p, s),
    caption: buildCaption(p, s),
    hashtags: buildHashtags(p),
    format: s.price.low <= 25 ? 'carousel-roundup' : 'single-product',
  }));

  const out = {
    generated: new Date().toISOString(),
    date: DATE,
    source: path.relative(ROOT, SRC),
    formula: 'commission% × sold × (TAP rate / open-collab rate) × priceFactor(10–40 = 1.0)',
    filters: { minSold: MIN_SOLD, category: CATEGORY, maxPrice: Number.isNaN(MAX_PRICE) ? null : MAX_PRICE, cooldownDays: COOLDOWN },
    catalogSize: catalog.length,
    eligible: eligible.length,
    products: shortlist,
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));

  // markdown for CapCut / photo mode
  const md = [];
  md.push(`# Daily Shop shortlist — ${DATE}`);
  md.push('');
  md.push(`Top ${shortlist.length} of ${eligible.length} eligible (catalog ${catalog.length}). Ranked by ${out.formula}.`);
  md.push('');
  md.push('| # | Product | Price | Comm. | Sold | $/sale | Format |');
  md.push('|---|---|---|---|---|---|---|');
  for (const x of shortlist) {
    md.push(`| ${x.rank} | ${shortName(x.name, 40)} (${x.brand}) | ${x.price} | ${x.commission} | ${fmtSold(x.sold)} | $${x.expectedPayoutPerSale} | ${x.format} |`);
  }
  md.push('');
  for (const x of shortlist) {
    md.push(`## ${x.rank}. ${x.name}`);
    md.push(`- **Price:** ${x.price} · **Commission:** ${x.commission}${x.openCollab ? ` (open collab ${x.openCollab})` : ''} · **Sold:** ${x.sold.toLocaleString()} · **Category:** ${x.category}`);
    md.push(`- **Image (${x.imageQuality}):** ${x.image}`);
    md.push(`- **Link:** ${x.link}`);
    md.push('- **Hooks (first 2 seconds, pick one per variant):**');
    x.hooks.forEach((h, i) => md.push(`  ${i + 1}. ${h}`));
    md.push(`- **Caption:** ${x.caption}`);
    md.push(`- **Hashtags:** ${x.hashtags}`);
    md.push('');
  }
  const cheap = shortlist.filter((x) => x.priceLow <= 20);
  if (cheap.length >= 3) {
    md.push(`## Carousel roundup — ${Math.min(cheap.length, 5)} finds under $20`);
    cheap.slice(0, 5).forEach((x, i) => md.push(`${i + 1}. ${shortName(x.name, 40)} — $${x.priceLow} · ${x.image}`));
    md.push('');
  }
  fs.writeFileSync(OUT_MD, md.join('\n'));

  // record picks for rotation
  for (const x of shortlist) history[x.id] = DATE;
  fs.writeFileSync(HISTORY, JSON.stringify(history, null, 2));

  console.log(`Catalog ${catalog.length} → eligible ${eligible.length} → picked ${shortlist.length}`);
  console.log(`Wrote ${path.relative(ROOT, OUT_JSON)}, ${path.relative(ROOT, OUT_MD)}`);
  for (const x of shortlist) {
    console.log(`${String(x.rank).padStart(2)}. ${shortName(x.name, 44).padEnd(45)} ${x.price.padEnd(16)} ${x.commission.padStart(4)} ${fmtSold(x.sold).padStart(6)} sold  $${x.expectedPayoutPerSale}/sale`);
  }
}

main();
