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
    const rec = [
        images[id] || '',
        camp.link || '',
        (r[pComm] || '').trim(),
        camp.brand || (pCname >= 0 ? (r[pCname] || '').trim() : ''),
        pVs >= 0 ? (r[pVs] || '').trim() : ''
    ];

    if (truncated) prefixes.push({ key, rec });
    else if (!exact.has(key)) exact.set(key, rec);
}
prefixes.sort((a, b) => b.key.length - a.key.length);

function lookup(name) {
    const n = norm(name);
    if (!n) return null;
    if (exact.has(n)) return exact.get(n);
    for (const p of prefixes) if (n.startsWith(p.key)) return p.rec;
    return null;
}

// ── keep only products the audit can actually surface ───────────────────────
// Suggestions repeat heavily (129 unique products across 259 creators), so scoping the
// output to referenced names keeps this at a few KB instead of ~1.1 MB.
const sp = readCSV('sugg-products.csv');
const out = {};
let cells = 0, matched = 0;

for (let i = 1; i < sp.rows.length; i++) {
    const r = sp.rows[i];
    for (let k = 0; k < 5; k++) {
        const name = (r[1 + k * 2] || '').trim();
        if (!name) continue;
        cells++;
        const rec = lookup(name);
        if (!rec) continue;
        matched++;
        const n = norm(name);
        if (!out[n]) out[n] = rec;
    }
}

// Prefix resolution happens HERE, at build time — a name that only matched a truncated
// catalog entry is still stored under its full normalised name. So the client does a plain
// exact lookup and needs no prefix list, which keeps this file at a few KB instead of ~180
// (400 prefix records carry a full image URL each). CI rebuilds this alongside
// sugg-products.csv, so a name can only miss between a CSV push and that rebuild — and the
// modal already renders a placeholder for unmatched products.
const payload = { products: out };
const outPath = path.join(shopDir, 'audit-products.json');
fs.writeFileSync(outPath, JSON.stringify(payload));

const size = fs.statSync(outPath).size;
const withImg = Object.values(out).filter(v => v[0]).length;
const withLink = Object.values(out).filter(v => v[1]).length;

console.log('✓ audit-products.json written — ' + (size / 1024).toFixed(1) + ' KB');
console.log('  suggestion cells:   ' + cells);
console.log('  matched cells:      ' + matched + ' (' + (cells ? (matched / cells * 100).toFixed(1) : '0') + '%)');
console.log('  unique products:    ' + Object.keys(out).length + '  (image: ' + withImg + ', TAP link: ' + withLink + ')');
