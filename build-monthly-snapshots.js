// Builds data/shop/monthly-stats.json from the month-end report snapshots in
// data/shop/monthly/YYYY-MM.csv (one per closed month, exported from the Shop Agency
// Reports sheet).
//
// Why this exists: history.csv keeps only GMV / TAP / COMM / BONUS per month. It has NO
// post counts, so the Month-End recap could never fill "Shop Posts" or "TAP Shop Posts"
// from it. Those live only in the monthly snapshot — col H (SV) and col I (TaP).
//
// Keyed by TikTok handle so it joins to accounts the same way every other feed does.

const fs = require('fs');
const path = require('path');

const shopDir = path.join(__dirname, 'data', 'shop');
const monthlyDir = path.join(shopDir, 'monthly');

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

const toNum = v => {
    const n = parseFloat(String(v == null ? '' : v).replace(/[$,%\s]/g, ''));
    return isNaN(n) ? 0 : n;
};

if (!fs.existsSync(monthlyDir)) {
    console.log('No data/shop/monthly/ directory — nothing to build.');
    process.exit(0);
}

const files = fs.readdirSync(monthlyDir).filter(f => /^\d{4}-\d{2}\.csv$/.test(f)).sort();
if (!files.length) {
    console.log('No YYYY-MM.csv snapshots found in data/shop/monthly/.');
    process.exit(0);
}

const months = {};
let totalRows = 0;

for (const file of files) {
    const month = file.replace(/\.csv$/, '');
    const rows = parseCSV(fs.readFileSync(path.join(monthlyDir, file), 'utf8'));
    if (!rows.length) continue;

    // Resolve by header name, not position — the export has a blank column D and the
    // column order has drifted before.
    const headers = rows[0].map(h => h.trim());
    const col = name => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
    const cHandle = col('TikTok'), cSV = col('SV'), cTaP = col('TaP'),
          cTapGmv = col('TaP GMV'), cGmv = col('GMV ($)'), cComm = col('Est Comm'),
          cCommPct = col('Comm %'), cSold = col('# Sold'), cViews = col('Views');

    if (cHandle < 0 || cSV < 0 || cTaP < 0) {
        console.log('  ! ' + file + ': missing TikTok/SV/TaP columns — skipped');
        continue;
    }

    const stats = {};
    // Row 2 of the export is a date banner, not a creator — it has no handle, so the
    // empty-handle guard below drops it.
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const handle = (r[cHandle] || '').trim().toLowerCase();
        if (!handle) continue;
        stats[handle] = {
            shopPosts: toNum(r[cSV]),
            tapPosts: toNum(r[cTaP]),
            tapGmv: cTapGmv >= 0 ? toNum(r[cTapGmv]) : 0,
            gmv: cGmv >= 0 ? toNum(r[cGmv]) : 0,
            comm: cComm >= 0 ? toNum(r[cComm]) : 0,
            commPct: cCommPct >= 0 ? (r[cCommPct] || '').trim() : '',
            sold: cSold >= 0 ? toNum(r[cSold]) : 0,
            views: cViews >= 0 ? toNum(r[cViews]) : 0
        };
        totalRows++;
    }
    months[month] = stats;
    const withPosts = Object.values(stats).filter(s => s.shopPosts || s.tapPosts).length;
    console.log('  ' + month + ': ' + Object.keys(stats).length + ' accounts (' +
        withPosts + ' with post counts)');
}

// ── monthly PRODUCT snapshots ───────────────────────────────────────────────
// Month-End must not read the current-month product tabs — those are August data on a
// July card. Drop a per-month export alongside the agency report:
//   data/shop/monthly/YYYY-MM-products.csv       (same schema as top-products.csv)
//   data/shop/monthly/YYYY-MM-sugg-products.csv  (same schema as sugg-products.csv)
// Both optional. Absent -> Month-End shows its "pending" state rather than wrong months.
function resolveFeedColumns(headers) {
    const h = (headers || []).map(x => String(x || '').trim());
    const slots = [], categories = [];
    for (let k = 1; k <= 5; k++) {
        const name = h.findIndex(x =>
            new RegExp('^(top\\s*' + k + '\\s*product|suggested\\s*product\\s*' + k + ')$', 'i').test(x));
        if (name < 0) continue;
        const gmv = h.findIndex(x =>
            new RegExp('^(top\\s*' + k + '\\s*product\\s*gmv|total\\s*gmv\\s*' + k + ')$', 'i').test(x));
        const id = h.findIndex(x =>
            new RegExp('^(top\\s*' + k + '\\s*)?(product\\s*_?id|sku(\\s*id)?)(\\s*' + k + ')?$', 'i').test(x));
        slots.push({ name: name, gmv: gmv, id: id >= 0 ? id : null });
    }
    for (let k = 1; k <= 2; k++) {
        const name = h.findIndex(x => new RegExp('^top\\s*' + k + '\\s*category$', 'i').test(x));
        if (name < 0) continue;
        const gmv = h.findIndex(x => new RegExp('^top\\s*' + k + '\\s*category\\s*gmv$', 'i').test(x));
        categories.push({ name: name, gmv: gmv });
    }
    return { slots: slots, categories: categories };
}

const money = v => {
    const s = String(v == null ? '' : v).trim();
    if (!s) return '';
    const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? s : '$' + Math.round(n).toLocaleString('en-US');
};

const productMonths = {};
for (const file of fs.readdirSync(monthlyDir)) {
    const m = file.match(/^(\d{4}-\d{2})-(products|sugg-products)\.csv$/);
    if (!m) continue;
    const month = m[1], kind = m[2] === 'products' ? 'top' : 'suggested';
    const rows = parseCSV(fs.readFileSync(path.join(monthlyDir, file), 'utf8'));
    if (rows.length < 2) continue;
    const cols = resolveFeedColumns(rows[0]);
    if (!cols.slots.length) { console.log('  ! ' + file + ': unrecognised header — skipped'); continue; }

    const bucket = (productMonths[month] = productMonths[month] || {});
    let n = 0;
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const handle = (r[0] || '').trim().toLowerCase();
        if (!handle) continue;
        const items = [];
        cols.slots.forEach((s, k) => {
            const nm = (r[s.name] || '').trim();
            if (!nm) return;
            items.push({ rank: k + 1, name: nm, gmv: money(r[s.gmv]),
                         productId: s.id != null ? (r[s.id] || '').trim() : '' });
        });
        if (!items.length) continue;
        const entry = (bucket[handle] = bucket[handle] || {});
        entry[kind] = items;
        if (kind === 'top') {
            entry.categories = cols.categories.map(c => ({
                name: (r[c.name] || '').trim(), gmv: money(r[c.gmv])
            })).filter(c => c.name);
        }
        n++;
    }
    console.log('  ' + file + ': ' + n + ' creators (' + kind + ')');
}

const outPath = path.join(shopDir, 'monthly-stats.json');
fs.writeFileSync(outPath, JSON.stringify({ months: months, products: productMonths }));
const pm = Object.keys(productMonths);
console.log(pm.length
    ? '  product snapshots: ' + pm.join(', ')
    : '  product snapshots: none yet — Month-End product lists will show their pending state');
console.log('✓ monthly-stats.json written — ' + (fs.statSync(outPath).size / 1024).toFixed(1) +
    ' KB, ' + files.length + ' month(s), ' + totalRows + ' account-months');
