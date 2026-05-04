/**
 * build-shop-data.js
 * 
 * Local build script - mirrors shop_sync_script.gs regenerateShopDataJS_()
 * Reads data/shop/{totals,current,history}.csv → writes js/shop-data.js
 * 
 * Run: node build-shop-data.js
 */

const fs = require('fs');
const path = require('path');

// ── CSV PARSER ──────────────────────────────────────────────────────────────
function parseCSVLine(line) {
    const result = [];
    let inQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSV(content) {
    const lines = content.replace(/\r/g, '').split('\n').filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = parseCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); });
        rows.push(row);
    }
    return { headers, rows };
}

function getVal(row, key) {
    if (!row) return '';
    // Try exact match first
    if (row[key] !== undefined) return row[key];
    // Try trimmed keys
    for (const k of Object.keys(row)) {
        if (k.trim() === key.trim()) return row[k];
    }
    return '';
}

function toNum(val) {
    if (val === null || val === undefined || val === '') return 0;
    const s = String(val).replace(/[$,%\s]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

function cleanRank(val) {
    if (!val) return '';
    return val.replace(/[^\x20-\x7E]/g, '?').trim();
}

// ── LOAD CSVs ───────────────────────────────────────────────────────────────
const shopDir = path.join(__dirname, 'data', 'shop');
const totalsRaw   = fs.readFileSync(path.join(shopDir, 'totals.csv'),  'utf8');
const currentRaw  = fs.readFileSync(path.join(shopDir, 'current.csv'), 'utf8');
const historyRaw  = fs.readFileSync(path.join(shopDir, 'history.csv'), 'utf8');

const { rows: totalsRows }  = parseCSV(totalsRaw);
const { rows: currentRows } = parseCSV(currentRaw);

const creatorsMap = {};

// ── 1. TOTALS.CSV ────────────────────────────────────────────────────────────
for (const row of totalsRows) {
    const email = getVal(row, 'User');
    if (!email || email.trim() === '') continue;
    const key = email.toLowerCase().trim();

    creatorsMap[key] = {
        username:     email,
        email:        email,
        name:         getVal(row, 'Name') || email,
        topLevel:     getVal(row, 'Level Label') || getVal(row, 'Top Level') || '--',
        accounts:     [],
        accountsHistory: [],
        tapHistory:   [],
        points:       toNum(getVal(row, 'Points')),
        totalGMV:     toNum(getVal(row, ' Total GMV ') || getVal(row, 'Total GMV')),
        totalComm:    toNum(getVal(row, ' Total Comm ') || getVal(row, 'Total Comm')),
        avgComm:      toNum(getVal(row, 'Avg Comm')),
        levelLabel:   getVal(row, 'Top Level') || getVal(row, 'Level Label') || '--',
        productRank:  cleanRank(getVal(row, 'Rank') || getVal(row, 'Rank Label')),
        cashBonus:    toNum(getVal(row, 'Cash Bonus') || getVal(row, 'Bonus')),
        bonusMTD:     toNum(getVal(row, 'Bonus MTD')),
        bonusYTD:     toNum(getVal(row, 'Bonus YTD')),
        tapLM:        toNum(getVal(row, 'TAP LM')),
        tapGoalM:     toNum(getVal(row, 'TAP Goal M')),
        tapLQ:        toNum(getVal(row, 'TAP LQ')),
        tapGoalQ:     toNum(getVal(row, 'TAP Goal Q')),
        tapTotalTQ:   toNum(getVal(row, 'TAP TQ') || getVal(row, 'TAP Total TQ')),
        totalSV:      toNum(getVal(row, 'SV')),
        totalTaP:     toNum(getVal(row, 'TaP')),
        totalLS:      toNum(getVal(row, 'LS')),
        totalCTR:     toNum(getVal(row, 'CTR')),
        totalViews:   toNum(getVal(row, 'Views')),
        totalSold:    toNum(getVal(row, 'Sold')),
        tapGMV:       toNum(getVal(row, 'TaP GMV')),
        tapYTD:       toNum(getVal(row, 'TAP YTD')),
        manager:      getVal(row, 'Manager') || 'Unassigned',
        joined:       getVal(row, 'Joined') || getVal(row, 'Join Date') || '',
        tier:         getVal(row, 'Tier') || '',
        accts:        getVal(row, 'Accts') || '1',
        score:        toNum(getVal(row, 'Score')),
        detailsLabel: getVal(row, 'Details Label') || '',
        tapMLabel:    getVal(row, 'TAP-M Label') || '',
        tapLLabel:    getVal(row, 'TAP-L Label') || '',
        livesLabel:   getVal(row, 'Lives Label') || '',
        agg_sv: 0, agg_tap: 0, agg_ls: 0, agg_views: 0, agg_sold: 0
    };
}

console.log(`✓ Loaded ${Object.keys(creatorsMap).length} creators from totals.csv`);

// ── 2. CURRENT.CSV ───────────────────────────────────────────────────────────
let accountsLoaded = 0;
for (const row of currentRows) {
    const email = getVal(row, 'User');
    if (!email || email.trim() === '') continue;
    const key = email.toLowerCase().trim();
    if (!creatorsMap[key]) continue;

    const cr = creatorsMap[key];

    // Robust handle extraction
    const tLink   = getVal(row, 'Link') || '';
    const discord = getVal(row, 'Discord') || '';
    const tiktok  = getVal(row, 'TikTok') || '';
    let handle = tiktok;
    if (!handle && tLink && tLink.indexOf('@') !== -1) {
        handle = tLink.split('@')[1].split('/')[0].split('?')[0].trim();
    }
    if (!handle && discord && discord.startsWith('@')) {
        handle = discord.substring(1).trim();
    }
    if (!handle) handle = getVal(row, 'Name') || 'Unknown';

    const accData = {
        handle,
        tiktokLink:   tLink,
        sv:           toNum(getVal(row, 'SV')),
        tap:          toNum(getVal(row, 'TaP')),
        tapGMV:       toNum(getVal(row, ' TaP GMV ') || getVal(row, 'TaP GMV')),
        ls:           toNum(getVal(row, 'L-T') || getVal(row, 'LS')),
        liveHours:    toNum(getVal(row, 'L-H')),
        liveMinutes:  toNum(getVal(row, 'L-M')),
        ctr:          getVal(row, 'CTR') || '0%',
        views:        0,
        sold:         toNum(getVal(row, '# Sold') || getVal(row, 'Sold')),
        gmv:          toNum(getVal(row, ' GMV ($) ') || getVal(row, 'GMV ($)')),
        commDollars:  toNum(getVal(row, ' Comm $ ') || getVal(row, 'Comm $')),
        bonus:        toNum(getVal(row, '$$$')),
        gmvLM:        toNum(getVal(row, ' GMV LM ') || getVal(row, 'GMV LM')),
        commPct:      getVal(row, 'Comm %') || '0%',
        tier:         getVal(row, 'Tier') || '',
        acctRank:     toNum(getVal(row, 'Acct Rank')),
    };
    cr.accounts.push(accData);

    // Aggregate
    cr.agg_sv   += accData.sv;
    cr.agg_tap  += accData.tap;
    cr.agg_ls   += accData.ls;
    cr.agg_sold += accData.sold;

    if (!cr.gmvPace) {
        cr.gmvPace = toNum(getVal(row, ' GMV Pace ') || getVal(row, 'GMV Pace'));
    }
    accountsLoaded++;
}

console.log(`✓ Loaded ${accountsLoaded} account rows from current.csv`);

// ── 3. HISTORY.CSV — DYNAMIC COLUMN DETECTION ───────────────────────────────
// Layout: User, [CurrentMonthLabel e.g."March 19"], GMV, Feb 2026, Jan 2026, ..., ,TAP, Feb 2026, ...
// Col 0 = email, Col 1 = handle (header = current month label), Col 2 = current month GMV (header "GMV"),
// Cols 3+ = past months. Empty column = separator between sections.

const histLines = historyRaw.replace(/\r/g, '').split('\n');
const histHeaders = parseCSVLine(histLines[0]);

// Detect sections dynamically
const sections = [];
let curSection = null;
let justSawSep = false;

for (let si = 0; si < histHeaders.length; si++) {
    const hdr = histHeaders[si].trim();

    if (hdr === '') {
        if (curSection) { curSection.end = si - 1; sections.push(curSection); curSection = null; }
        justSawSep = true;
        continue;
    }

    if (!curSection) {
        curSection = { start: si, end: si, label: hdr, isSeparated: justSawSep, monthCols: [] };
        justSawSep = false;
    }

    const hdrLower = hdr.toLowerCase();
    const isIdentifier = (si === 0 || si === 1);
    let isSectionLabel = curSection.isSeparated && (si === curSection.start) &&
                        (hdrLower === 'tap' || hdrLower === 'comm' || hdrLower === 'bonus');
      
      if (!isIdentifier) {
        // This is a data column — use the header as the month label
        // Special case: col 2 header "GMV" is actually the current month data, so use col 1's header as its label.
        // Similarly, "TAP", "COMM", "BONUS" headers physically contain the current month data.
        let monthLabel = hdr;
        if (si === 2 && hdrLower === 'gmv') {
          monthLabel = histHeaders[1] ? histHeaders[1].trim() : 'Current';
        } else if (isSectionLabel) {
          monthLabel = histHeaders[1] ? histHeaders[1].trim() : 'Current';
        }
        curSection.monthCols.push({ index: si, header: monthLabel });
      }
}
if (curSection) { curSection.end = histHeaders.length - 1; sections.push(curSection); }

// Assign GMV / TAP / COMM / BONUS sections
let gmvSection = null, tapSection = null, commSection = null, bonusSection = null;
for (const sec of sections) {
    const lbl = sec.label.toLowerCase();
    if (!sec.isSeparated && sec.monthCols.length > 0 && !gmvSection) { gmvSection = sec; }
    else if (sec.isSeparated) {
        if (lbl === 'tap'   && !tapSection)   tapSection   = sec;
        else if (lbl === 'comm'  && !commSection)  commSection  = sec;
        else if (lbl === 'bonus' && !bonusSection) bonusSection = sec;
    }
}

// Build chronological (oldest→newest) index arrays
const gmvLabels   = gmvSection   ? gmvSection.monthCols.map(m => m.header)   : [];
const gmvIdxs     = gmvSection   ? gmvSection.monthCols.map(m => m.index)    : [];
const tapIdxs     = tapSection   ? tapSection.monthCols.map(m => m.index)    : [];
const commIdxs    = commSection  ? commSection.monthCols.map(m => m.index)   : [];
const bonusIdxs   = bonusSection ? bonusSection.monthCols.map(m => m.index)  : [];

// CSV is newest-first → reverse to chronological (oldest first for charts)
const chronLabels  = [...gmvLabels].reverse();
const chronGmvIdx  = [...gmvIdxs].reverse();
const chronTapIdx  = [...tapIdxs].reverse();
const chronCommIdx = [...commIdxs].reverse();
const chronBonusIdx= [...bonusIdxs].reverse();

console.log(`✓ History columns detected:`);
console.log(`  GMV months:   ${chronLabels.join(', ')}`);
console.log(`  GMV indices:  ${chronGmvIdx.join(', ')}`);
console.log(`  TAP cols:     ${chronTapIdx.length}`);
console.log(`  COMM cols:    ${chronCommIdx.length}`);
console.log(`  BONUS cols:   ${chronBonusIdx.length}`);

// Process data rows
let histLoaded = 0;
for (let h = 1; h < histLines.length; h++) {
    const line = histLines[h].trim();
    if (!line) continue;
    const cols = parseCSVLine(histLines[h]);
    if (cols.length < 3) continue;
    const email = cols[0].toLowerCase().trim();
    if (!email || !creatorsMap[email]) continue;

    const cr = creatorsMap[email];
    const handle = cols[1] || '';

    // GMV history
    const gmvArr = chronGmvIdx.map(i => toNum(cols[i] || '0'));
    cr.accountsHistory.push({ handle, gmv: gmvArr });

    // Month labels (stored once per creator)
    if (!cr.historyMonths) cr.historyMonths = chronLabels;

    // TAP history (aggregate per creator)
    if (chronTapIdx.length > 0) {
        const tapArr = chronTapIdx.map(i => toNum(cols[i] || '0'));
        if (!cr.tapHistory || cr.tapHistory.length === 0) {
            cr.tapHistory = tapArr;
        } else {
            tapArr.forEach((v, i) => { cr.tapHistory[i] = (cr.tapHistory[i] || 0) + v; });
        }
    }

    // COMM history
    if (chronCommIdx.length > 0) {
        const commArr = chronCommIdx.map(i => toNum(cols[i] || '0'));
        if (!cr.commHistory) {
            cr.commHistory = commArr;
        } else {
            commArr.forEach((v, i) => { cr.commHistory[i] = (cr.commHistory[i] || 0) + v; });
        }
    }

    // BONUS history
    if (chronBonusIdx.length > 0) {
        const bonusArr = chronBonusIdx.map(i => toNum(cols[i] || '0'));
        if (!cr.bonusHistory) {
            cr.bonusHistory = bonusArr;
        } else {
            bonusArr.forEach((v, i) => { cr.bonusHistory[i] = (cr.bonusHistory[i] || 0) + v; });
        }
    }

    histLoaded++;
}

console.log(`✓ Processed ${histLoaded} history rows`);

// ── BUILD OUTPUT ─────────────────────────────────────────────────────────────
const allCreators = Object.values(creatorsMap).sort((a, b) => (b.points || 0) - (a.points || 0));

// Current date label: in Apps Script this reads from Current sheet C1 directly.
// Locally, the CSV header exports "TikTok" (the column name), not the date value.
// So for local builds, fall back to today's date formatted to match the sheet style.
const currentHeaders = parseCSVLine(currentRaw.replace(/\r/g, '').split('\n')[0]);
const rawC1 = (currentHeaders[2] || '').trim();
// If C1 looks like a date (contains a number), use it; otherwise use today
const looksLikeDate = /\d/.test(rawC1);
const todayLabel = (() => {
    const d = new Date();
    return d.toLocaleString('en-US', { month: 'long', day: 'numeric' }); // e.g. "April 7"
})();
const lastUpdatedStr = (looksLikeDate ? rawC1 : todayLabel).replace(/^TikTok\s+/, '');

console.log(`✓ C1 raw value: "${rawC1}" → using label: "${lastUpdatedStr}"`);

const now = new Date().toISOString();
let js = `// Taboost Agency - Multi-Sheet Merged Shop Data\n`;
js += `// Generated: ${now}\n`;
js += `// Total Mapped: ${allCreators.length} unique shop creators\n`;
js += `// History months detected dynamically from CSV headers\n\n`;
js += `const allShopData = ${JSON.stringify(allCreators, null, 2)};\n\n`;
if (lastUpdatedStr) {
    js += `window.SHOP_LAST_UPDATED = ${JSON.stringify(lastUpdatedStr + ' at 11:59 PM PT')};\n`;
}
js += `if (typeof window !== "undefined") {\n`;
js += `    window.TABOOST_SHOP_DATA = allShopData;\n`;
js += `}\n`;
js += `if (typeof module !== "undefined") {\n`;
js += `    module.exports = allShopData;\n`;
js += `}\n`;

const outPath = path.join(__dirname, 'js', 'shop-data.js');
fs.writeFileSync(outPath, js, 'utf8');

const sizeKB = (Buffer.byteLength(js, 'utf8') / 1024).toFixed(1);
console.log(`\n✅ js/shop-data.js written — ${allCreators.length} creators, ${sizeKB} KB`);
console.log(`   Current month label: ${lastUpdatedStr}`);
console.log(`   History months (chronological): ${chronLabels.join(' → ')}`);
