// Builds data/shop/audit-products.json — the lookup the Shop Account Audit modal uses to
// put a product image and the brand's TAP campaign behind each "Proven Winners" row.
//
// Joins three feeds that CI already tracks:
//   data/shop/tap-products.csv    Product ID, Product Name, Total Commission Rate, VS, Campaign ID
//   data/shop/tap-links.csv       CAMPAIGN ID -> Link, Name (brand)
//   data/shop/product-images.json product ID -> image URL
//
// Reads the CSVs directly rather than js/product-data.js (which build-product-data.js
// generates from the same feeds): that file is 4.8 MB because it carries the whole TAP
// catalog, and the modal only ever needs the handful of products actually suggested to
// creators. Same source data, ~6 KB instead of ~4,800.
//
// Only ~40% of suggested products are TAP campaign products. The rest legitimately have no
// image and no link anywhere in the repo, and the modal renders a placeholder for them.
// Image and link are independent — a product can have one without the other.

const fs = require('fs');
const path = require('path');

const shopDir = path.join(__dirname, 'data', 'shop');

function parseCSV(text) {
    const rows = [];
    let row = [], cur = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (inQ && text[i + 1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
        } else if (c === ',' && !inQ) { row.push(cur); cur = ''; }
        else if ((c === '\n' || c === '\r') && !inQ) {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(cur); cur = '';
            if (row.some(v => v.trim() !== '')) rows.push(row);
            row = [];
        } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); if (row.some(v => v.trim() !== '')) rows.push(row); }
    return rows;
}

// MUST stay byte-identical to saNorm() in js/shop-audit.js or matches silently vanish.
function norm(s) {
    return String(s == null ? '' : s)
        .toLowerCase()
        .replace(/’/g, "'")
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

// product-images.json was scraped from HTML, so its URLs carry entity-encoded separators
// ("...?dr=12190&amp;t=555f072d"). The client renders the thumbnail through innerHTML with
// saEsc(), which escapes the "&" again — the browser then decodes ONE level and the URL
// keeps a literal "&amp;", which the TikTok CDN rejects. Decode here so what we store is a
// clean URL and saEsc round-trips correctly.
function decodeEntities(url) {
    return String(url || '')
        .replace(/&amp;/g, '&')
        .replace(/&#38;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function readCSV(name) {
    const p = path.join(shopDir, name);
    if (!fs.existsSync(p)) throw new Error('missing feed: data/shop/' + name);
    const rows = parseCSV(fs.readFileSync(p, 'utf8'));
    const headers = (rows[0] || []).map(h => h.trim());
    return { rows, headers, col: n => headers.indexOf(n) };
}

// ── campaign id -> { link, brand } ──────────────────────────────────────────
const tl = readCSV('tap-links.csv');
const cIdIdx = tl.col('CAMPAIGN ID'), cLinkIdx = tl.col('Link'), cNameIdx = tl.col('Name');
if (cIdIdx < 0 || cLinkIdx < 0) throw new Error('tap-links.csv: expected "CAMPAIGN ID" and "Link" columns');

const campaigns = {};
for (let i = 1; i < tl.rows.length; i++) {
    const r = tl.rows[i];
    const id = (r[cIdIdx] || '').trim();
    if (!id) continue;
    campaigns[id] = { link: (r[cLinkIdx] || '').trim(), brand: (r[cNameIdx] || '').trim() };
}

// ── product images ──────────────────────────────────────────────────────────
const imgPath = path.join(shopDir, 'product-images.json');
const images = fs.existsSync(imgPath) ? JSON.parse(fs.readFileSync(imgPath, 'utf8')) : {};

// ── product name -> record ──────────────────────────────────────────────────
// The TAP export truncates long names to ~50 chars with a trailing "...", while
// sugg-products.csv carries the full name. Truncated entries therefore go into a
// prefix list matched with startsWith, longest-first so a short prefix can't win
// over a more specific one. This list is build-time only — see the payload note below.
const tp = readCSV('tap-products.csv');
const pName = tp.col('Product Name'), pId = tp.col('Product ID'),
      pComm = tp.col('Total Commission Rate'), pVs = tp.col('VS'),
      pCid = tp.col('Campaign ID'), pCname = tp.col('Campaign Name');
if (pName < 0 || pId < 0) throw new Error('tap-products.csv: expected "Product Name" and "Product ID" columns');

const exact = new Map();
const prefixes = [];

for (let i = 1; i < tp.rows.length; i++) {
    const r = tp.rows[i];
    const raw = (r[pName] || '').trim();
    if (!raw) continue;
    const truncated = /\.\.\.$/.test(raw);
    const key = norm(raw.replace(/\.\.\.$/, ''));
    if (!key) continue;

    const id = (r[pId] || '').trim();
    const camp = campaigns[(r[pCid] || '').trim()] || {};
    // "Total Commission Rate" is a multiline cell — "20%\nvs. open collab 15%" — and its
    // second line duplicates the VS column. Keep only the rate, or the stat tile renders
    // the comparison twice and leaks a newline.
    const commission = (r[pComm] || '').split('\n')[0].trim();
    // Campaign names carry a year suffix ("medicube 2026"); the popup reads as a brand.
    const brand = (camp.brand || (pCname >= 0 ? (r[pCname] || '') : ''))
        .trim().replace(/\s+20\d{2}$/, '');
    // Image and TAP campaign are INDEPENDENT joins: name -> campaign (link) and
    // product id -> image. A product with a campaign but no cached image must still
    // surface its TAP link, so an empty image never suppresses the rest of the record.
    const rec = {
        image: decodeEntities(images[id] || ''),
        link: camp.link || '',
        commission: commission,
        brand: brand,
        vs: pVs >= 0 ? (r[pVs] || '').split('\n')[0].trim() : '',
        productId: id,
        campaignId: (r[pCid] || '').trim()
    };

    if (truncated) prefixes.push({ key, rec });
    else if (!exact.has(key)) exact.set(key, rec);
}
prefixes.sort((a, b) => b.key.length - a.key.length);

// Minimum catalog-key length before we'll accept a mid-string match. The suggestions feed
// sometimes carries a marketing/brand prefix the TAP export doesn't ("sacheu LIP LINER
// STAY-N..." vs "LIP LINER STAY-N..."), so a strict startsWith misses a product we do have
// a campaign for. 40 chars of exact text is long enough that a collision is implausible,
// and we still refuse the match if it resolves to more than one campaign — a missing image
// is fine, a wrong TAP link is not.
const MIN_CONTAINS_KEY = 40;

function lookup(name) {
    const n = norm(name);
    if (!n) return null;
    if (exact.has(n)) return { rec: exact.get(n), how: 'exact' };
    for (const p of prefixes) if (n.startsWith(p.key)) return { rec: p.rec, how: 'prefix' };

    // Widened, still conservative: unique long substring.
    const hits = [];
    for (const [key, rec] of exact) if (key.length >= MIN_CONTAINS_KEY && n.includes(key)) hits.push(rec);
    for (const p of prefixes) if (p.key.length >= MIN_CONTAINS_KEY && n.includes(p.key)) hits.push(p.rec);
    if (hits.length) {
        const links = new Set(hits.map(h => h.link));
        if (links.size === 1) return { rec: hits[0], how: 'contains' };
        return null;   // ambiguous across campaigns — refuse rather than guess
    }
    return null;
}

// ── keep only products the audit can actually surface ───────────────────────
// Suggestions repeat heavily (129 unique products across 259 creators), so scoping the
// output to referenced names keeps this at a few KB instead of ~1.1 MB.
const sp = readCSV('sugg-products.csv');
const out = {};
const stats = { cells: 0, tapMatched: 0, tapUrl: 0, imaged: 0, unmatched: 0, byMethod: {} };
const unmatchedNames = new Map();

for (let i = 1; i < sp.rows.length; i++) {
    const r = sp.rows[i];
    for (let k = 0; k < 5; k++) {
        const name = (r[1 + k * 2] || '').trim();
        if (!name) continue;
        stats.cells++;
        const n = norm(name);
        const hit = lookup(name);
        if (!hit) {
            stats.unmatched++;
            if (!unmatchedNames.has(n)) unmatchedNames.set(n, name);
            continue;
        }
        stats.tapMatched++;
        stats.byMethod[hit.how] = (stats.byMethod[hit.how] || 0) + 1;
        if (hit.rec.link) stats.tapUrl++;
        if (hit.rec.image) stats.imaged++;
        // Serialised as an array to keep the payload small; index 0 (image) may be "" while
        // index 1 (TAP link) is populated — the client must treat them independently.
        if (!out[n]) out[n] = [hit.rec.image, hit.rec.link, hit.rec.commission, hit.rec.brand, hit.rec.vs];
    }
}

// Prefix resolution happens HERE, at build time — a name that only matched a truncated
// catalog entry is still stored under its full normalised name. So the client does a plain
// exact lookup and needs no prefix list, which keeps this file at a few KB instead of ~180
// (400 prefix records carry a full image URL each). CI rebuilds this alongside
// sugg-products.csv, so a name can only miss between a CSV push and that rebuild — and the
// modal already renders a placeholder for unmatched products.
const uniqWithImg  = Object.values(out).filter(v => v[0]).length;
const uniqWithLink = Object.values(out).filter(v => v[1]).length;
const pct = (a, b) => (b ? (a / b * 100).toFixed(1) : '0') + '%';

const diagnostics = {
    displayedProducts: stats.cells,
    tapCampaignMatched: stats.tapMatched,
    tapUrlPresent: stats.tapUrl,
    imageMatched: stats.imaged,
    unmatchedProducts: stats.unmatched,
    matchedWithoutImage: stats.tapMatched - stats.imaged,
    matchedWithoutTapUrl: stats.tapMatched - stats.tapUrl,
    uniqueProducts: Object.keys(out).length,
    uniqueUnmatched: unmatchedNames.size,
    matchMethods: stats.byMethod,
    unmatchedSample: [...unmatchedNames.values()].slice(0, 10)
};

const payload = { products: out, diagnostics: diagnostics };
const outPath = path.join(shopDir, 'audit-products.json');
fs.writeFileSync(outPath, JSON.stringify(payload));

console.log('✓ audit-products.json written — ' + (fs.statSync(outPath).size / 1024).toFixed(1) + ' KB');
console.log('  displayed products    : ' + stats.cells);
console.log('  TAP campaign matched  : ' + stats.tapMatched + ' ' + pct(stats.tapMatched, stats.cells));
console.log('  TAP URL present       : ' + stats.tapUrl + ' ' + pct(stats.tapUrl, stats.cells));
console.log('  image matched         : ' + stats.imaged + ' ' + pct(stats.imaged, stats.cells));
console.log('  unmatched products    : ' + stats.unmatched + ' ' + pct(stats.unmatched, stats.cells));
console.log('  matched w/o image     : ' + diagnostics.matchedWithoutImage + '   (must still show TAP link)');
console.log('  matched w/o TAP url   : ' + diagnostics.matchedWithoutTapUrl);
console.log('  match methods         : ' + JSON.stringify(stats.byMethod));
console.log('  unique products kept  : ' + diagnostics.uniqueProducts + ' (image: ' + uniqWithImg + ', TAP link: ' + uniqWithLink + ')');
if (diagnostics.matchedWithoutTapUrl > 0) {
    console.log('  ⚠ some matched products have a campaign but no TAP URL — check tap-links.csv');
}
console.log('\n  sample unmatched (no TAP campaign found):');
diagnostics.unmatchedSample.forEach((n, i) => console.log('   ' + (i + 1) + '. ' + n.slice(0, 78)));
