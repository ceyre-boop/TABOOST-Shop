/**
 * Walks the git history of the Shop data files and flattens every dated
 * snapshot into long-format CSVs for analysis outside the platform.
 *
 *   bun scripts/extract-git-snapshots.ts [outDir=handoff]
 *
 * Outputs (one row per snapshot x entity):
 *   product-snapshots.csv  — data/shop/tap-products.csv, every commit
 *   creator-snapshots.csv  — js/shop-data.js (allShopData), every commit, one row per account
 *   campaigns.csv          — data/campaigns.csv as of HEAD (brand, start, end)
 *
 * Snapshot date = commit author date. The file may carry an older
 * "Generated:" stamp; both are kept so the consumer can choose.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] || 'handoff';
mkdirSync(OUT, { recursive: true });

type Commit = { sha: string; date: string };

async function commitsFor(path: string): Promise<Commit[]> {
  const log = execFileSync('git', ['log', '--format=%H|%ad', '--date=short', '--', path], { encoding: 'utf8', maxBuffer: 1 << 26 });
  // Log is newest-first: keep the LAST commit of each day so a same-day
  // re-sync does not leave stale data. Return oldest → newest.
  const byDay = new Map<string, string>();
  for (const line of log.trim().split('\n')) {
    const [sha, date] = line.split('|');
    if (sha && date && !byDay.has(date)) byDay.set(date, sha);
  }
  return [...byDay.entries()].sort().map(([date, sha]) => ({ sha, date }));
}

async function show(sha: string, path: string): Promise<string | null> {
  try { return execFileSync('git', ['show', `${sha}:${path}`], { encoding: 'utf8', maxBuffer: 1 << 28 }); } catch { return null; }
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (q && text[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === ',' && !q) { row.push(cur); cur = ''; }
    else if (c === '\n' && !q) { row.push(cur); if (row.some(v => v.trim())) rows.push(row); row = []; cur = ''; }
    else if (c === '\r') continue;
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); if (row.some(v => v.trim())) rows.push(row); }
  return rows;
}

const esc = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const num = (v: unknown) => {
  const s = String(v ?? '').replace(/[$,%\s]/g, '');
  return s === '' || isNaN(Number(s)) ? '' : Number(s);
};

// ───────────────────────── products ─────────────────────────
async function products() {
  const PATH = 'data/shop/tap-products.csv';
  const cols = ['snapshot_date', 'commit', 'product_id', 'product_name', 'brand', 'shop_name', 'category',
    'sale_price', 'items_sold', 'tap_commission_pct', 'open_collab_commission_pct', 'campaign_id', 'campaign_name', 'rank'];
  const lines = [cols.join(',')];
  let n = 0;
  for (const c of await commitsFor(PATH)) {
    const text = await show(c.sha, PATH); if (!text) continue;
    const rows = parseCSV(text); const h = rows[0].map(x => x.trim());
    const ix = (name: string) => h.indexOf(name);
    const col = { id: ix('Product ID'), name: ix('Product Name'), shop: ix('Shop Name'), cat: ix('Category'),
      price: ix('Sale Price'), sold: ix('Items Sold'), comm: ix('Total Commission Rate'),
      cid: ix('Campaign ID'), cname: ix('Campaign Name'), rank: ix('Rank') };
    for (const r of rows.slice(1)) {
      if (!r[col.id]) continue;
      // Cell reads "18%\nvs. open collab 10% - 12%": TAP rate first, open-collab rate after.
      const commRaw = String(r[col.comm] ?? '');
      const tapComm = num((commRaw.match(/^\s*([\d.]+)\s*%/) || [])[1]);
      const openComm = num((commRaw.match(/open collab\s*([\d.]+)\s*%/i) || [])[1]);
      // ~1/3 of sheet rows leave Shop Name/Category as "~~~" placeholders; the
      // campaign name on those rows is the brand. `brand` is the resolved value.
      const clean = (v: string) => (v || '').replace(/^~+$/, '').trim();
      const shop = clean(r[col.shop]); const brand = shop || clean(r[col.cname]);
      lines.push([c.date, c.sha.slice(0, 8), r[col.id], r[col.name], brand, shop, clean(r[col.cat]), r[col.price],
        num(r[col.sold]), tapComm, openComm, r[col.cid], r[col.cname], num(r[col.rank])].map(esc).join(','));
      n++;
    }
  }
  writeFileSync(join(OUT, 'product-snapshots.csv'), lines.join('\n') + '\n');
  return n;
}

// ───────────────────────── creators ─────────────────────────
async function creators() {
  const PATH = 'js/shop-data.js';
  const cols = ['snapshot_date', 'commit', 'data_generated', 'email', 'name', 'top_level', 'handle', 'tier',
    'sv_posts', 'tap_posts', 'tap_gmv', 'live_streams', 'live_hours', 'ctr', 'views', 'units_sold',
    'gmv', 'commission_dollars', 'commission_pct', 'gmv_last_month', 'acct_rank'];
  const lines = [cols.join(',')];
  let n = 0, skipped = 0;
  for (const c of await commitsFor(PATH)) {
    const text = await show(c.sha, PATH); if (!text) continue;
    const gen = (text.match(/^\/\/ Generated:\s*(\S+)/m) || [])[1] || '';
    // The file is `const allShopData = [...]` followed by window.* assignments.
    // Evaluate it in a sandbox: no DOM, just capture the array.
    let data: any[] = [];
    try {
      const body = text.replace(/^const allShopData\s*=/m, 'var allShopData =');
      const fn = new Function('window', body + '\n;return allShopData;');
      data = fn({});
    } catch (e) { skipped++; continue; }
    if (!Array.isArray(data)) { skipped++; continue; }
    for (const cr of data) {
      const email = cr.email || cr.username || '';
      for (const a of cr.accounts || []) {
        lines.push([c.date, c.sha.slice(0, 8), gen, email, cr.name, cr.topLevel, a.handle, a.tier,
          num(a.sv), num(a.tap), num(a.tapGMV), num(a.ls), num(a.liveHours), num(a.ctr), num(a.views),
          num(a.sold), num(a.gmv), num(a.commDollars), num(a.commPct), num(a.gmvLM), num(a.acctRank)]
          .map(esc).join(','));
        n++;
      }
    }
  }
  writeFileSync(join(OUT, 'creator-snapshots.csv'), lines.join('\n') + '\n');
  return { n, skipped };
}

// ───────────────────────── campaigns ─────────────────────────
function campaigns() {
  const rows = parseCSV(require('node:fs').readFileSync('data/campaigns.csv', 'utf8'));
  const h = rows[0].map(x => x.trim());
  const ix = (n: string) => h.indexOf(n);
  const col = { id: ix('CAMPAIGN ID'), name: ix('Name'), link: ix('Link'), pri: ix('PRIORITY'),
    start: ix('Start Date'), end: ix('End Date'), rank: h.lastIndexOf('Acct Rank') };
  const lines = ['campaign_id,brand,priority,start_date,end_date,affiliate_link,acct_rank'];
  for (const r of rows.slice(1)) {
    if (!r[col.id]) continue;
    lines.push([r[col.id], r[col.name], r[col.pri], r[col.start], r[col.end], r[col.link], r[col.rank]].map(esc).join(','));
  }
  writeFileSync(join(OUT, 'campaigns.csv'), lines.join('\n') + '\n');
  return lines.length - 1;
}

const p = await products();
const cr = await creators();
const ca = campaigns();
console.log(JSON.stringify({ out: OUT, product_rows: p, creator_rows: cr.n, creator_snapshots_skipped: cr.skipped, campaign_rows: ca }));
