// ============================================================================
// TABOOST SHOP SYNC — Google Sheets → GitHub CSV Pipeline
// Adapted from the working Live Creator Sync script
// Repo: ceyre-boop/TABOOST-Shop
// ============================================================================

// ── CONFIG: Your 5 Shop sheet tabs ──────────────────────────────────────────
const SHEET_CONFIG = [
  { tabName: 'Totals',       outputPath: 'data/shop/totals.csv' },
  { tabName: 'Current',      outputPath: 'data/shop/current.csv' },
  { tabName: 'History',      outputPath: 'data/shop/history.csv' },
  { tabName: 'TAP-Links',    outputPath: 'data/shop/tap-links.csv' },
  { tabName: 'TAP-Products', outputPath: 'data/shop/tap-products.csv' },
  // Shop Account Audit feeds (popup reads these at runtime; optional tabs — sync
  // skips any tab that doesn't exist in the sheet):
  //   Top-Products:  col A = account handle; top 5 products in B,D,F,H,J (GMV in C,E,G,I,K);
  //                  top 2 categories in L,N (GMV in M,O)
  //   Sugg-Products: Creator, Suggested Product 1, Total GMV 1, ... Suggested Product 5, Total GMV 5
  { tabName: 'Top-Products',  outputPath: 'data/shop/top-products.csv',  optional: true },
  { tabName: 'Sugg-Products', outputPath: 'data/shop/sugg-products.csv', optional: true }
];

// ── MAIN SYNC ───────────────────────────────────────────────────────────────
function syncShopSheetsToGitHub() {
  var config = loadConfig_();
  var startTime = new Date();
  var results = [];
  var csvCache = {}; // ← Store CSV content in memory to avoid re-fetching

  // Fail before doing any work if this project is aimed at the wrong repo.
  // On 2026-08-17 the GITHUB_REPO script property pointed at TABOOST-TALENT_ROSTER,
  // so every run wrote 7 CSVs successfully — into the wrong repository — while the
  // Shop site served stale data. The logs said "7/7 success" and were technically
  // telling the truth. Never let the destination be silent again.
  assertCorrectRepo_(config);

  // Read current date label directly from Current sheet cell C1
  // e.g. "April 7" — no code change needed when month rolls over
  var currentDateLabel = '';
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var currentSheet = ss.getSheetByName('Current');
    if (currentSheet) {
      currentDateLabel = String(currentSheet.getRange('C1').getValue()).trim();
      Logger.log('📅 Current date label from C1: "' + currentDateLabel + '"');
    }
  } catch (e) {
    Logger.log('⚠️ Could not read C1 from Current sheet: ' + e.message);
  }

  Logger.log('🚀 Starting Shop sync at ' + startTime.toISOString());

  // ── PHASE 1: export every tab before writing anything ────────────────────
  // Nothing is pushed until all exports succeed, so a mid-run Google failure
  // can't leave GitHub holding a half-updated set of CSVs.
  var files = [];   // [{ path, content, tabName }]

  for (var s = 0; s < SHEET_CONFIG.length; s++) {
    var sheet = SHEET_CONFIG[s];
    try {
      Logger.log('📊 Processing: ' + sheet.tabName);

      // Get GID for this tab
      var gid = getGidForSheet_(sheet.tabName);
      if (gid === null) {
        if (sheet.optional) {
          Logger.log('⏭️ Skipping optional tab "' + sheet.tabName + '" — not found in this spreadsheet');
          results.push({ sheet: sheet.tabName, path: sheet.outputPath, status: 'skipped' });
          continue;
        }
        throw new Error('Sheet tab "' + sheet.tabName + '" not found in this spreadsheet');
      }

      // Export raw CSV directly from Google
      var csvContent = exportSheetAsCSV_(config.SHEET_ID, gid);
      Logger.log('✅ Exported ' + csvContent.length + ' chars from ' + sheet.tabName);

      // Cache it in memory (keyed by tab name)
      csvCache[sheet.tabName] = csvContent;
      files.push({ path: sheet.outputPath, content: csvContent, tabName: sheet.tabName });

      Utilities.sleep(1500); // pace exports so Google doesn't rate-limit the later tabs

    } catch (error) {
      Logger.log('❌ Export failed ' + sheet.tabName + ': ' + error.message);
      results.push({
        sheet: sheet.tabName,
        path: sheet.outputPath,
        status: 'error',
        error: error.message
      });
    }
  }

  // ── PHASE 2: one atomic commit, then verify it actually landed ───────────
  // Previously each tab was its own PUT (7 separate ref updates). During the
  // 2026-08-17 GitHub incident those returned success codes while nothing was
  // committed, and the script cheerfully logged "7/7" on data that did not
  // exist. One commit means one ref update, and the verify step below reads
  // the ref back so a phantom success can never be reported again.
  var commitSha = null;
  var pushError = null;

  if (files.length > 0) {
    try {
      commitSha = commitFilesToGitHub_(files, config);
      Logger.log('📦 Commit created: ' + commitSha.substring(0, 7));

      verifyCommitLanded_(commitSha, config);
      Logger.log('🔍 Verified: main now points at ' + commitSha.substring(0, 7));

      for (var f = 0; f < files.length; f++) {
        results.push({
          sheet: files[f].tabName,
          path: files[f].path,
          status: 'success',
          commit: commitSha.substring(0, 7)
        });
      }
    } catch (error) {
      pushError = error.message;
      Logger.log('❌ Push failed: ' + error.message);
      for (var f = 0; f < files.length; f++) {
        results.push({
          sheet: files[f].tabName,
          path: files[f].path,
          status: 'error',
          error: error.message
        });
      }
    }
  }

  var duration = (new Date() - startTime) / 1000;
  var successCount = 0, skippedCount = 0, errorCount = 0;
  for (var r = 0; r < results.length; r++) {
    if (results[r].status === 'success') successCount++;
    if (results[r].status === 'skipped') skippedCount++;
    if (results[r].status === 'error') errorCount++;
  }

  // Say plainly whether the data is live. A green "Done" line on a run that
  // wrote nothing is what caused an announcement on stale figures.
  if (errorCount > 0) {
    Logger.log('❌ SYNC FAILED — ' + errorCount + ' tab(s) did NOT reach GitHub. ' +
               'The site is still serving OLD data.' + (pushError ? ' Reason: ' + pushError : ''));
  } else {
    Logger.log('✅ Done: ' + successCount + '/' + SHEET_CONFIG.length + ' sheets LIVE on GitHub in ' + duration + 's' +
               (skippedCount ? ' (' + skippedCount + ' optional skipped)' : ''));
  }
  logResults_(results, duration);

  // shop-data.js is now rebuilt by GitHub Actions (rebuild-shop-data.yml) whenever
  // CSV files change. The Apps Script version of regenerateShopDataJS_ was out of sync
  // with build-shop-data.js (missing commDollars and other fields), causing commission
  // to reset to $0 every 1-3 days. Do NOT re-enable this block.
  Logger.log('ℹ️ shop-data.js regeneration skipped — handled by GitHub Actions');

  return {
    success: errorCount === 0 && successCount + skippedCount === SHEET_CONFIG.length,
    commit: commitSha,
    timestamp: new Date().toISOString(),
    duration: duration,
    results: results
  };
}

// ── TEST ────────────────────────────────────────────────────────────────────
function testShopSync() {
  return syncShopSheetsToGitHub();
}

// ── EXPORT CSV (with retry — Google throttles rapid exports with HTTP 429) ──
function exportSheetAsCSV_(sheetId, gid) {
  var attempts = 0, maxAttempts = 4;
  while (true) {
    attempts++;
    var cacheBuster = '&t=' + new Date().getTime();
    var exportUrl = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/export?format=csv&gid=' + gid + cacheBuster;

    var response = UrlFetchApp.fetch(exportUrl, {
      headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code === 200) return response.getContentText();

    if (code === 429 && attempts < maxAttempts) {
      var waitMs = 3000 * attempts; // 3s, 6s, 9s
      Logger.log('\u23f3 Rate-limited (429), retry ' + attempts + '/' + (maxAttempts - 1) + ' in ' + (waitMs / 1000) + 's\u2026');
      Utilities.sleep(waitMs);
      continue;
    }

    throw new Error('Export failed (HTTP ' + code + '): ' + response.getContentText().substring(0, 200));
  }
}

// ── DESTINATION GUARD ───────────────────────────────────────────────────────
// This script feeds shop.taboost.me and nothing else. loadConfig_ lets script
// properties override the repo, which is how a stale GITHUB_REPO value silently
// redirected an entire day of syncs to TABOOST-TALENT_ROSTER. Refuse to run
// against anything but the Shop repo, and self-heal the property.
var EXPECTED_OWNER = 'ceyre-boop';
var EXPECTED_REPO  = 'TABOOST-Shop';

function assertCorrectRepo_(config) {
  Logger.log('🎯 Target repo: ' + config.GITHUB_OWNER + '/' + config.GITHUB_REPO);

  if (config.GITHUB_OWNER === EXPECTED_OWNER && config.GITHUB_REPO === EXPECTED_REPO) return;

  // Repair the stored properties so the next run is correct without hunting
  // through the Apps Script settings UI.
  var props = PropertiesService.getScriptProperties();
  props.setProperty('GITHUB_OWNER', EXPECTED_OWNER);
  props.setProperty('GITHUB_REPO', EXPECTED_REPO);

  throw new Error(
    'WRONG REPO — this run was aimed at ' + config.GITHUB_OWNER + '/' + config.GITHUB_REPO +
    ' instead of ' + EXPECTED_OWNER + '/' + EXPECTED_REPO + '. Nothing was written. ' +
    'The script properties have been corrected; run the sync again.'
  );
}

// ── GITHUB API HELPER ───────────────────────────────────────────────────────
// Single place for auth + retry. Retries transient failures (429 rate-limit and
// 5xx GitHub-side outages) with backoff; anything else throws immediately.
function githubApi_(config, method, url, bodyObj, label) {
  var retryableCodes = [429, 500, 502, 503, 504];
  var attempts = 0, maxAttempts = 5;

  while (true) {
    attempts++;

    var opts = {
      method: method,
      headers: {
        'Authorization': 'token ' + config.GITHUB_TOKEN,
        'Accept': 'application/vnd.github.v3+json'
      },
      muteHttpExceptions: true
    };
    if (bodyObj) {
      opts.contentType = 'application/json';
      opts.payload = JSON.stringify(bodyObj);
    }

    var res = UrlFetchApp.fetch(url, opts);
    var code = res.getResponseCode();

    if (code >= 200 && code < 300) {
      return JSON.parse(res.getContentText());
    }

    if (retryableCodes.indexOf(code) !== -1 && attempts < maxAttempts) {
      var waitMs = 3000 * attempts; // 3s, 6s, 9s, 12s
      Logger.log('⏳ ' + label + ' got ' + code + ', retry ' + attempts + '/' + (maxAttempts - 1) + ' in ' + (waitMs / 1000) + 's…');
      Utilities.sleep(waitMs);
      continue;
    }

    throw new Error(label + ' failed (HTTP ' + code + '): ' + res.getContentText().substring(0, 300));
  }
}

// ── ATOMIC COMMIT (Git Data API) ────────────────────────────────────────────
// Writes all CSVs in ONE commit: blobs -> tree -> commit -> single ref update.
//
// The old approach used the Contents API once per file — 7 independent ref
// updates per run. That multiplied the chance of hitting a degraded GitHub and
// could leave the repo with some tabs updated and others stale (build-shop-data
// would then rebuild from a mismatched CSV set). One ref update also means one
// Pages deploy instead of seven.
function commitFilesToGitHub_(files, config) {
  var base = 'https://api.github.com/repos/' + config.GITHUB_OWNER + '/' + config.GITHUB_REPO;

  // 1. Current tip of main
  var ref = githubApi_(config, 'GET', base + '/git/ref/heads/main', null, 'Read main ref');
  var baseCommitSha = ref.object.sha;

  var baseCommit = githubApi_(config, 'GET', base + '/git/commits/' + baseCommitSha, null, 'Read base commit');
  var baseTreeSha = baseCommit.tree.sha;

  // 2. One blob per file. Base64 keeps UTF-8 (accented product names) intact.
  var treeEntries = [];
  for (var i = 0; i < files.length; i++) {
    var blob = githubApi_(config, 'POST', base + '/git/blobs', {
      content: Utilities.base64Encode(files[i].content, Utilities.Charset.UTF_8),
      encoding: 'base64'
    }, 'Create blob for ' + files[i].tabName);

    treeEntries.push({
      path: files[i].path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha
    });
  }

  // 3. Tree layered on the current one, so untouched files are preserved
  var tree = githubApi_(config, 'POST', base + '/git/trees', {
    base_tree: baseTreeSha,
    tree: treeEntries
  }, 'Create tree');

  // Identical content produces an identical tree — nothing to commit.
  if (tree.sha === baseTreeSha) {
    Logger.log('ℹ️ No changes detected — sheets match what is already on GitHub.');
    return baseCommitSha;
  }

  // 4. Commit
  var names = [];
  for (var n = 0; n < files.length; n++) names.push(files[n].tabName);
  var commit = githubApi_(config, 'POST', base + '/git/commits', {
    message: 'Auto-sync: ' + names.join(', ') + ' @ ' + new Date().toISOString(),
    tree: tree.sha,
    parents: [baseCommitSha]
  }, 'Create commit');

  // 5. Move main. Non-fast-forward means something else pushed mid-run; surface
  // it rather than force-updating over another commit.
  githubApi_(config, 'PATCH', base + '/git/refs/heads/main', {
    sha: commit.sha,
    force: false
  }, 'Update main ref');

  return commit.sha;
}

// ── VERIFY ──────────────────────────────────────────────────────────────────
// Reads the ref back and confirms main actually points at our commit.
//
// This is the guard against the 2026-08-17 failure: GitHub returned success
// codes for writes that never landed, and the script reported "Done: 7/7" on
// data that did not exist — which is what led to announcing stale figures.
// Never report success without confirming from a fresh read.
function verifyCommitLanded_(expectedSha, config) {
  var base = 'https://api.github.com/repos/' + config.GITHUB_OWNER + '/' + config.GITHUB_REPO;
  var attempts = 0, maxAttempts = 4;

  while (true) {
    attempts++;
    Utilities.sleep(2000); // let the ref settle before reading it back

    try {
      var ref = githubApi_(config, 'GET', base + '/git/ref/heads/main', null, 'Verify main ref');
      if (ref.object.sha === expectedSha) return true;

      // Someone else may have pushed on top of ours; that still means our
      // commit landed. Walk back a few commits to check before failing.
      var cursor = ref.object.sha;
      for (var hop = 0; hop < 5; hop++) {
        var c = githubApi_(config, 'GET', base + '/git/commits/' + cursor, null, 'Walk history');
        if (c.sha === expectedSha) return true;
        if (!c.parents || c.parents.length === 0) break;
        cursor = c.parents[0].sha;
      }
    } catch (e) {
      if (attempts >= maxAttempts) throw e;
    }

    if (attempts >= maxAttempts) {
      throw new Error('VERIFICATION FAILED — commit ' + expectedSha.substring(0, 7) +
                      ' is not on main. GitHub reported success but nothing landed. ' +
                      'The site is still serving OLD data.');
    }
    Logger.log('⏳ Commit not visible on main yet, re-checking (' + attempts + '/' + (maxAttempts - 1) + ')…');
  }
}

// ── REGENERATE shop-data.js ─────────────────────────────────────────────────
// Accepts csvMap = { Totals: '...', Current: '...', History: '...' } from
// syncShopSheetsToGitHub() so we NEVER re-fetch from GitHub (avoids CDN cache).
//
// DYNAMIC HISTORY: Reads CSV headers to find section boundaries (GMV, TAP,
// COMM, BONUS) instead of hardcoding column indices. When the spreadsheet
// rolls to a new month, the columns shift — this function adapts automatically.
function regenerateShopDataJS_(config, csvMap, currentDateLabel) {
  // Use in-memory CSVs passed from the sync function (fresh, no CDN delay)
  var totalsCsv  = (csvMap && csvMap['Totals'])  || '';
  var currentCsv = (csvMap && csvMap['Current']) || '';
  var historyCsv = (csvMap && csvMap['History']) || '';
  
  if (!totalsCsv || !currentCsv) {
    throw new Error('Missing required CSV data — Totals or Current is empty');
  }
  
  // currentDateLabel comes from Current sheet cell C1 (e.g. "April 7")
  // Falls back to GMV history header if not provided
  Logger.log('📦 CSV sizes — Totals: ' + totalsCsv.length + ', Current: ' + currentCsv.length + ', History: ' + historyCsv.length);
  Logger.log('📅 Date label for SHOP_LAST_UPDATED: "' + (currentDateLabel || '(will read from history)') + '"');
  
  // Parse CSVs
  var totalsRows = parseCsv_(totalsCsv);
  var currentRows = parseCsv_(currentCsv);
  
  var creatorsMap = {};
  
  // 1. Process totals.csv
  for (var t = 0; t < totalsRows.length; t++) {
    var row = totalsRows[t];
    var email = getVal_(row, 'User');
    if (!email || email.trim() === '') continue;
    var key = email.toLowerCase().trim();
    
    creatorsMap[key] = {
      username: email,
      email: email,
      name: getVal_(row, 'Name') || email,
      topLevel: getVal_(row, 'Top Level') || 'L1',
      accounts: [],
      accountsHistory: [],
      tapHistory: [],
      points: toNum_(getVal_(row, 'Points')),
      totalGMV: toNum_(getVal_(row, 'Total GMV') || getVal_(row, ' Total GMV ')),
      totalComm: toNum_(getVal_(row, 'Total Comm') || getVal_(row, ' Total Comm ')),
      avgComm: toNum_(getVal_(row, 'Avg Comm')),
      levelLabel: getVal_(row, 'Top Level') || getVal_(row, 'Level Label') || '--',
      productRank: cleanRank_(getVal_(row, 'Rank') || getVal_(row, 'Rank Label')),
      cashBonus: toNum_(getVal_(row, 'Cash Bonus') || getVal_(row, 'Bonus')),
      bonusMTD: toNum_(getVal_(row, 'Bonus MTD')),
      bonusYTD: toNum_(getVal_(row, 'Bonus YTD')),
      tapLM: toNum_(getVal_(row, 'TAP LM')),
      tapGoalM: toNum_(getVal_(row, 'TAP Goal M')),
      tapLQ: toNum_(getVal_(row, 'TAP LQ')),
      tapGoalQ: toNum_(getVal_(row, 'TAP Goal Q')),
      tapTotalTQ: toNum_(getVal_(row, 'TAP TQ') || getVal_(row, 'TAP Total TQ')),
      totalSV: toNum_(getVal_(row, 'SV')),
      totalTaP: toNum_(getVal_(row, 'TaP')),
      totalLS: toNum_(getVal_(row, 'LS')),
      totalCTR: toNum_(getVal_(row, 'CTR')),
      totalViews: toNum_(getVal_(row, 'Views')),
      totalSold: toNum_(getVal_(row, 'Sold')),
      tapGMV: toNum_(getVal_(row, 'TaP GMV')),
      tapYTD: toNum_(getVal_(row, 'TAP YTD')),
      manager: getVal_(row, 'Manager') || 'Unassigned',
      joined: getVal_(row, 'Joined') || getVal_(row, 'Join Date') || '',
      tier: getVal_(row, 'Tier') || '',
      accts: getVal_(row, 'Accts') || '1',
      score: toNum_(getVal_(row, 'Score')),
      agg_sv: 0, agg_tap: 0, agg_ls: 0, agg_views: 0, agg_sold: 0, agg_ctr: '0%'
    };
  }
  
  // 2. Process current.csv (per-account data)
  for (var c = 0; c < currentRows.length; c++) {
    var row = currentRows[c];
    var email = getVal_(row, 'User');
    if (!email || email.trim() === '') continue;
    var key = email.toLowerCase().trim();
    if (!creatorsMap[key]) continue;
    
    var cr = creatorsMap[key];
    
    // Robust Handle Extraction
    var tLink = getVal_(row, 'Link') || '';
    var discord = getVal_(row, 'Discord') || '';
    var extHandle = '';
    
    if (tLink && tLink.indexOf('@') !== -1) {
      extHandle = tLink.split('@')[1].split('/')[0].split('?')[0].trim();
    }
    if (!extHandle && discord && discord.charAt(0) === '@') {
      extHandle = discord.substring(1).trim();
    }
    if (!extHandle) {
      var keys = Object.keys(row);
      if (keys.length > 2) extHandle = getVal_(row, keys[2]);
    }
    if (!extHandle || extHandle.trim() === '') {
      extHandle = getVal_(row, 'TikTok') || getVal_(row, 'Name') || 'Unknown';
    }
    
    var accData = {
      handle: extHandle,
      tiktokLink: tLink,
      sv: toNum_(getVal_(row, 'SV')),
      tap: toNum_(getVal_(row, 'TaP')),
      tapGMV: toNum_(getVal_(row, 'TaP GMV')),
      ls: toNum_(getVal_(row, 'LS')),
      ctr: getVal_(row, 'CTR') || '0%',
      views: toNum_(getVal_(row, 'Views')),
      sold: toNum_(getVal_(row, '# Sold') || getVal_(row, 'Sold')),
      gmv: toNum_(getVal_(row, 'GMV ($)')),
      commDollars: toNum_(getVal_(row, 'Comm $')),
      bonus: toNum_(getVal_(row, 'Agency $') || getVal_(row, '$$$')),
      monthlyBonus: toNum_(getVal_(row, 'Live GMV')),
      commPct: getVal_(row, 'Comm %') || '0%'
    };
    cr.accounts.push(accData);
    
    // Aggregate per-account metrics
    cr.agg_sv += accData.sv;
    cr.agg_tap += accData.tap;
    cr.agg_ls += accData.ls;
    cr.agg_views += accData.views;
    cr.agg_sold += accData.sold;
    
    if (!cr.gmvPace) {
      cr.gmvPace = toNum_(getVal_(row, 'GMV Pace') || getVal_(row, ' GMV Pace '));
    }
  }
  
  // 3. Process history.csv — DYNAMIC COLUMN DETECTION
  // The history CSV has sections separated by empty columns:
  //   User, Handle, GMV, [month1], [month2], ..., [monthN], , TAP, [month1], ..., [monthN], , COMM, ..., , BONUS, ...
  // We detect section boundaries by scanning the header for empty cells and section labels.
  var histLines = historyCsv.split('\n');
  if (histLines.length > 1) {
    var histHeaders = parseCSVLine_(histLines[0]);
    
    // ── Dynamically detect section boundaries ──
    // The history CSV layout:
    //   User, [current-month label e.g. "March 19"], GMV, Feb 2026, Jan 2026, ..., , TAP, Feb 2026, ..., , COMM, ..., , BONUS, ...
    // 
    // Key insight: Col 0 = email, Col 1 = handle (header is current month label like "March 19"),
    // Col 2 = current month GMV (header "GMV"), Cols 3+ = past month GMV values.
    // Then an empty column separates each section (TAP, COMM, BONUS).
    // Only TAP/COMM/BONUS appearing AFTER a separator are true section labels.
    
    var sections = [];       // Array of { start, end, label, isSeparated, monthCols: [{index, header}] }
    var currentSection = null;
    var justSawSeparator = false;
    
    for (var si = 0; si < histHeaders.length; si++) {
      var hdr = histHeaders[si].trim();
      
      if (hdr === '') {
        // Empty column = section separator
        if (currentSection) {
          currentSection.end = si - 1;
          sections.push(currentSection);
          currentSection = null;
        }
        justSawSeparator = true;
        continue;
      }
      
      if (!currentSection) {
        currentSection = { start: si, end: si, label: hdr, isSeparated: justSawSeparator, monthCols: [] };
        justSawSeparator = false;
      }
      
      // Determine if this column is a data column or an identifier/label
      var hdrLower = hdr.toLowerCase();
      var isIdentifier = (si === 0 || si === 1); // Col 0=User (email), Col 1=Handle
      
      // Only treat TAP/COMM/BONUS as section labels when they're the first col after a separator
      var isSectionLabel = currentSection.isSeparated && (si === currentSection.start) &&
                           (hdrLower === 'tap' || hdrLower === 'comm' || hdrLower === 'bonus');

      if (!isIdentifier) {
        // This is a data column — use the header as the month label
        // Special case: col 2 header "GMV" is actually the current month data, so use col 1's header as its label.
        var monthLabel = hdr;
        if (si === 2 && hdrLower === 'gmv') {
          monthLabel = histHeaders[1] ? histHeaders[1].trim() : "Current";
        } else if (isSectionLabel) {
          monthLabel = histHeaders[1] ? histHeaders[1].trim() : "Current";
        }
        currentSection.monthCols.push({ index: si, header: monthLabel });
      }
    }
    // Push the last section if it has content
    if (currentSection) {
      currentSection.end = histHeaders.length - 1;
      sections.push(currentSection);
    }
    
    // Assign sections: first = GMV, then TAP, COMM, BONUS by label
    var gmvSection = null;
    var tapSection = null;
    var commSection = null;
    var bonusSection = null;
    
    for (var si = 0; si < sections.length; si++) {
      var sec = sections[si];
      var lbl = sec.label.toLowerCase();
      
      if (!sec.isSeparated && sec.monthCols.length > 0) {
        // First section (not after separator) with month data = GMV
        if (!gmvSection) gmvSection = sec;
      } else if (sec.isSeparated) {
        // Sections after separators are identified by their label
        if (lbl === 'tap' && !tapSection) tapSection = sec;
        else if (lbl === 'comm' && !commSection) commSection = sec;
        else if (lbl === 'bonus' && !bonusSection) bonusSection = sec;
      }
    }
    
    // Extract the month labels from the GMV section (used for chart + history table)
    // These are in newest-first order from the CSV; we reverse to chronological for the chart
    var gmvMonthLabels = gmvSection ? gmvSection.monthCols.map(function(mc) { return mc.header; }) : [];
    var gmvMonthIndices = gmvSection ? gmvSection.monthCols.map(function(mc) { return mc.index; }) : [];
    // Reverse from newest-first (CSV order) to oldest-first (chronological for charts)
    var chronLabels = gmvMonthLabels.slice().reverse();
    var chronGmvIndices = gmvMonthIndices.slice().reverse();
    
    var tapMonthIndices = tapSection ? tapSection.monthCols.map(function(mc) { return mc.index; }) : [];
    var chronTapIndices = tapMonthIndices.slice().reverse();
    
    var commMonthIndices = commSection ? commSection.monthCols.map(function(mc) { return mc.index; }) : [];
    var chronCommIndices = commMonthIndices.slice().reverse();
    
    var bonusMonthIndices = bonusSection ? bonusSection.monthCols.map(function(mc) { return mc.index; }) : [];
    var chronBonusIndices = bonusMonthIndices.slice().reverse();
    
    Logger.log('📊 Dynamic History sections detected:');
    Logger.log('  GMV months: ' + chronLabels.join(', ') + ' (indices: ' + chronGmvIndices.join(',') + ')');
    Logger.log('  TAP months: ' + (tapSection ? tapSection.monthCols.length : 0) + ' cols');
    Logger.log('  COMM months: ' + (commSection ? commSection.monthCols.length : 0) + ' cols');
    Logger.log('  BONUS months: ' + (bonusSection ? bonusSection.monthCols.length : 0) + ' cols');
    
    // Now process each data row
    for (var h = 1; h < histLines.length; h++) {
      if (!histLines[h].trim()) continue;
      var cols = parseCSVLine_(histLines[h]);
      if (cols.length < 3) continue;
      var email = cols[0].toLowerCase().trim();
      if (!email || !creatorsMap[email]) continue;
      
      var cr = creatorsMap[email];
      var handle = cols[1] || '';
      
      // GMV: read from detected chronological indices
      var gmvArr = [];
      for (var gi = 0; gi < chronGmvIndices.length; gi++) {
        gmvArr.push(toNum_(cols[chronGmvIndices[gi]] || '0'));
      }
      cr.accountsHistory.push({ handle: handle, gmv: gmvArr });
      
      // Store the dynamic month labels once per creator
      if (!cr.historyMonths) {
        cr.historyMonths = chronLabels;
      }
      
      // TAP: read from detected chronological indices
      if (chronTapIndices.length > 0) {
        var tapArr = [];
        for (var ti = 0; ti < chronTapIndices.length; ti++) {
          tapArr.push(toNum_(cols[chronTapIndices[ti]] || '0'));
        }
        if (!cr.tapHistory || cr.tapHistory.length === 0) {
          cr.tapHistory = tapArr;
        } else {
          for (var ti = 0; ti < tapArr.length; ti++) { cr.tapHistory[ti] = (cr.tapHistory[ti] || 0) + tapArr[ti]; }
        }
      }
      
      // COMM: read from detected chronological indices
      if (chronCommIndices.length > 0) {
        var commArr = [];
        for (var ci = 0; ci < chronCommIndices.length; ci++) {
          commArr.push(toNum_(cols[chronCommIndices[ci]] || '0'));
        }
        if (!cr.commHistory) {
          cr.commHistory = commArr;
        } else {
          for (var ci = 0; ci < commArr.length; ci++) { cr.commHistory[ci] = (cr.commHistory[ci] || 0) + commArr[ci]; }
        }
      }
      
      // BONUS: read from detected chronological indices
      if (chronBonusIndices.length > 0) {
        var bonusArr = [];
        for (var bi = 0; bi < chronBonusIndices.length; bi++) {
          bonusArr.push(toNum_(cols[chronBonusIndices[bi]] || '0'));
        }
        if (!cr.bonusHistory) {
          cr.bonusHistory = bonusArr;
        } else {
          for (var bi = 0; bi < bonusArr.length; bi++) { cr.bonusHistory[bi] = (cr.bonusHistory[bi] || 0) + bonusArr[bi]; }
        }
      }
    }
  }
  
  // Build sorted array
  var allCreators = [];
  for (var key in creatorsMap) {
    allCreators.push(creatorsMap[key]);
  }
  allCreators.sort(function(a, b) { return (b.points || 0) - (a.points || 0); });
  
  // Use the date label read directly from Current sheet C1 (passed in)
  // Fall back to the GMV history header only if C1 was empty
  var lastUpdatedStr = (currentDateLabel && currentDateLabel.trim()) ? currentDateLabel.trim()
                     : (gmvMonthLabels && gmvMonthLabels.length > 0 ? gmvMonthLabels[0] : '');
  Logger.log('✅ SHOP_LAST_UPDATED will be set to: "' + lastUpdatedStr + '"');
  
  // Generate JS content
  var now = new Date().toISOString();
  var jsContent = '// Taboost Agency - Multi-Sheet Merged Shop Data\n';
  jsContent += '// Generated: ' + now + '\n';
  jsContent += '// Total Mapped: ' + allCreators.length + ' unique shop creators\n';
  jsContent += '// History months detected dynamically from CSV headers\n\n';
  jsContent += 'const allShopData = ' + JSON.stringify(allCreators, null, 2) + ';\n\n';
  if (lastUpdatedStr) {
    jsContent += 'window.SHOP_LAST_UPDATED = ' + JSON.stringify(lastUpdatedStr + ' at 11:59 PM PT') + ';\n';
  }
  jsContent += 'if (typeof window !== "undefined") {\n';
  jsContent += '    window.TABOOST_SHOP_DATA = allShopData;\n';
  jsContent += '}\n';
  jsContent += 'if (typeof module !== "undefined") {\n';
  jsContent += '    module.exports = allShopData;\n';
  jsContent += '}\n';
  
  // Push shop-data.js to GitHub. Routed through the atomic-commit helper since
  // the old per-file pushToGitHub_ was removed. This function stays disabled
  // (see the note in syncShopSheetsToGitHub) — GitHub Actions owns this rebuild.
  var sha = commitFilesToGitHub_(
    [{ path: 'js/shop-data.js', content: jsContent, tabName: 'shop-data.js' }],
    config
  );
  verifyCommitLanded_(sha, config);
}

// ── HELPERS ─────────────────────────────────────────────────────────────────
function getGidForSheet_(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;
  return sheet.getSheetId().toString();
}

function loadConfig_() {
  var props = PropertiesService.getScriptProperties();
  var activeSheetId = null;
  try {
    activeSheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
    // Auto-update the stored property so background triggers use the newest sheet
    if (activeSheetId) {
      props.setProperty('SHEET_ID', activeSheetId);
    }
  } catch(e) {}
  
  return {
    GITHUB_TOKEN: props.getProperty('GITHUB_TOKEN'),
    GITHUB_OWNER: props.getProperty('GITHUB_OWNER') || 'ceyre-boop',
    GITHUB_REPO: props.getProperty('GITHUB_REPO') || 'TABOOST-Shop',
    SHEET_ID: activeSheetId || props.getProperty('SHEET_ID')
  };
}

function toNum_(val) {
  if (!val || val === '' || val === 'NR' || val === '-') return 0;
  var clean = String(val).replace(/[$%,\s]/g, '').trim();
  if (!clean) return 0;
  var num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function getVal_(rowObj, key) {
  if (!rowObj) return null;
  if (rowObj[key] !== undefined) return rowObj[key];
  var keyLower = key.toLowerCase().trim();
  for (var k in rowObj) {
    if (k.toLowerCase().trim() === keyLower) return rowObj[k];
  }
  return null;
}

function cleanRank_(rank) {
  if (!rank) return '--';
  var val = String(rank).trim();
  var seps = ['|', '?', '•'];
  for (var i = 0; i < seps.length; i++) {
    if (val.indexOf(seps[i]) !== -1) {
      val = val.split(seps[i])[0].trim();
      break;
    }
  }
  return val || '--';
}

function fetchRawFile_(url) {
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('Failed to fetch ' + url);
  }
  return resp.getContentText();
}

function parseCsv_(csvText) {
  var lines = csvText.split('\n');
  if (lines.length < 2) return [];
  var headers = parseCSVLine_(lines[0]);
  var results = [];
  for (var i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    var cols = parseCSVLine_(lines[i]);
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = (j < cols.length) ? cols[j] : '';
    }
    results.push(obj);
  }
  return results;
}

// Proper CSV line parser that handles quoted fields with commas
function parseCSVLine_(line) {
  var result = [];
  var current = '';
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

// ── SETUP ───────────────────────────────────────────────────────────────────
function setupShopSync() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();

  // GitHub Token
  var token = ui.prompt('GitHub Token', 'Enter your GitHub Personal Access Token:', ui.ButtonSet.OK_CANCEL);
  if (token.getSelectedButton() !== ui.Button.OK) return;
  props.setProperty('GITHUB_TOKEN', token.getResponseText().trim());

  // Owner & Repo (hardcoded for safety)
  props.setProperty('GITHUB_OWNER', 'ceyre-boop');
  props.setProperty('GITHUB_REPO', 'TABOOST-Shop');

  // Sheet ID (auto-detected)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  props.setProperty('SHEET_ID', ss.getId());

  // Verify all required tabs exist
  var names = ss.getSheets().map(function(s) { return s.getName(); });
  var missing = SHEET_CONFIG.filter(function(cfg) {
    return !cfg.optional && names.indexOf(cfg.tabName) === -1;
  });

  if (missing.length > 0) {
    ui.alert('⚠️ Missing tabs: ' + missing.map(function(m) { return m.tabName; }).join(', ') +
             '\n\nFound tabs: ' + names.join(', '));
    return;
  }

  ui.alert('✅ Setup complete!\n\n' +
    'Will sync these tabs → GitHub:\n' +
    '• Totals → data/shop/totals.csv\n' +
    '• Current → data/shop/current.csv\n' +
    '• History → data/shop/history.csv\n' +
    '• TAP-Links → data/shop/tap-links.csv\n' +
    '• TAP-Products → data/shop/tap-products.csv\n\n' +
    'After CSV sync, shop-data.js is auto-regenerated.\n\n' +
    'Run testShopSync() to verify everything works.');
}

// ── TRIGGERS ────────────────────────────────────────────────────────────────
function createDailyTrigger() {
  deleteTriggers_();
  ScriptApp.newTrigger('syncShopSheetsToGitHub')
    .timeBased()
    .everyDays(1)
    .atHour(10)
    .nearMinute(0)
    .inTimezone('America/Los_Angeles')
    .create();
  SpreadsheetApp.getUi().alert('✅ Daily sync at 10:00 AM PT enabled');
}

function createHourlyTrigger() {
  deleteTriggers_();
  ScriptApp.newTrigger('syncShopSheetsToGitHub')
    .timeBased()
    .everyHours(1)
    .create();
  SpreadsheetApp.getUi().alert('✅ Hourly sync enabled');
}

function stopSync() {
  deleteTriggers_();
  SpreadsheetApp.getUi().alert('⏸️ Sync stopped');
}

function deleteTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncShopSheetsToGitHub') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

// ── LOGGING ─────────────────────────────────────────────────────────────────
function logResults_(results, duration) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var log = ss.getSheetByName('Sync Log');
    if (!log) {
      log = ss.insertSheet('Sync Log');
      log.appendRow(['Time', 'Duration', 'Sheet', 'Path', 'Status', 'Commit/Error']);
    }
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      log.appendRow([
        new Date().toISOString(),
        duration + 's',
        r.sheet,
        r.path,
        r.status,
        r.commit || r.error || ''
      ]);
    }
  } catch (e) {
    Logger.log('Logging failed: ' + e.message);
  }
}

// ── MENU ────────────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 SHOP SYNC')
    .addItem('⚡ Sync Now', 'syncShopSheetsToGitHub')
    .addItem('🔧 First Time Setup', 'setupShopSync')
    .addSeparator()
    .addItem('⏰ Daily Auto-Sync (10 AM PT)', 'createDailyTrigger')
    .addItem('⏰ Hourly Auto-Sync', 'createHourlyTrigger')
    .addItem('⏸️ Stop Auto-Sync', 'stopSync')
    .addToUi();
}
