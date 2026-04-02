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
  { tabName: 'TAP-Products', outputPath: 'data/shop/tap-products.csv' }
];

// ── MAIN SYNC ───────────────────────────────────────────────────────────────
function syncShopSheetsToGitHub() {
  var config = loadConfig_();
  var startTime = new Date();
  var results = [];

  Logger.log('🚀 Starting Shop sync at ' + startTime.toISOString());

  for (var s = 0; s < SHEET_CONFIG.length; s++) {
    var sheet = SHEET_CONFIG[s];
    try {
      Logger.log('📊 Processing: ' + sheet.tabName);

      // Get GID for this tab
      var gid = getGidForSheet_(sheet.tabName);
      if (gid === null) {
        throw new Error('Sheet tab "' + sheet.tabName + '" not found in this spreadsheet');
      }

      // Export raw CSV directly from Google
      var csvContent = exportSheetAsCSV_(config.SHEET_ID, gid);
      Logger.log('✅ Exported ' + csvContent.length + ' chars from ' + sheet.tabName);

      // Push to GitHub
      var result = pushToGitHub_(csvContent, config, sheet.outputPath, sheet.tabName);

      results.push({
        sheet: sheet.tabName,
        path: sheet.outputPath,
        status: 'success',
        commit: result.commit.sha.substring(0, 7)
      });

    } catch (error) {
      Logger.log('❌ Failed ' + sheet.tabName + ': ' + error.message);
      results.push({
        sheet: sheet.tabName,
        path: sheet.outputPath,
        status: 'error',
        error: error.message
      });
    }
  }

  var duration = (new Date() - startTime) / 1000;
  var successCount = 0;
  for (var r = 0; r < results.length; r++) {
    if (results[r].status === 'success') successCount++;
  }

  Logger.log('✅ Done: ' + successCount + '/' + SHEET_CONFIG.length + ' sheets in ' + duration + 's');
  logResults_(results, duration);

  // After CSV push succeeds, regenerate shop-data.js from the new CSVs
  if (successCount >= 2) { // At minimum need Totals + Current
    try {
      Logger.log('🔄 Regenerating shop-data.js from fresh CSVs...');
      regenerateShopDataJS_(config);
      Logger.log('✅ shop-data.js pushed to GitHub');
    } catch (e) {
      Logger.log('⚠️ shop-data.js regeneration failed: ' + e.message);
    }
  }

  return {
    success: successCount === SHEET_CONFIG.length,
    timestamp: new Date().toISOString(),
    duration: duration,
    results: results
  };
}

// ── TEST ────────────────────────────────────────────────────────────────────
function testShopSync() {
  return syncShopSheetsToGitHub();
}

// ── EXPORT CSV (raw from Google, preserves all formatting) ──────────────────
function exportSheetAsCSV_(sheetId, gid) {
  // Add cache buster to prevent Google Sheets from serving a stale CSV
  var cacheBuster = '&t=' + new Date().getTime();
  var exportUrl = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/export?format=csv&gid=' + gid + cacheBuster;

  var response = UrlFetchApp.fetch(exportUrl, {
    headers: {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Export failed (HTTP ' + response.getResponseCode() + '): ' + response.getContentText().substring(0, 200));
  }

  return response.getContentText();
}

// ── GITHUB PUSH ─────────────────────────────────────────────────────────────
function pushToGitHub_(content, config, path, sheetName) {
  var apiUrl = 'https://api.github.com/repos/' + config.GITHUB_OWNER + '/' + config.GITHUB_REPO + '/contents/' + path;

  // Check if file already exists (need SHA to update)
  var sha = null;
  try {
    var check = UrlFetchApp.fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'token ' + config.GITHUB_TOKEN,
        'Accept': 'application/vnd.github.v3+json'
      },
      muteHttpExceptions: true
    });
    if (check.getResponseCode() === 200) {
      sha = JSON.parse(check.getContentText()).sha;
    }
  } catch (e) {
    // File doesn't exist yet — that's fine
  }

  // Build payload
  var timestamp = new Date().toISOString();
  var payload = {
    message: 'Auto-sync: ' + sheetName + ' @ ' + timestamp,
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: 'main'
  };
  if (sha) payload.sha = sha;

  // Upload
  var upload = UrlFetchApp.fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': 'token ' + config.GITHUB_TOKEN,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = upload.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('GitHub PUT error ' + code + ': ' + upload.getContentText().substring(0, 300));
  }

  return JSON.parse(upload.getContentText());
}

// ── REGENERATE shop-data.js ─────────────────────────────────────────────────
// This reads the freshly-pushed CSVs from GitHub and builds the merged JS file
// so the dashboard always has up-to-date data without needing to run Python locally.
function regenerateShopDataJS_(config) {
  // Fetch the fresh CSVs directly from GitHub raw content
  var baseUrl = 'https://raw.githubusercontent.com/' + config.GITHUB_OWNER + '/' + config.GITHUB_REPO + '/main/';
  
  var totalsCsv = fetchRawFile_(baseUrl + 'data/shop/totals.csv');
  var currentCsv = fetchRawFile_(baseUrl + 'data/shop/current.csv');
  var historyCsv = fetchRawFile_(baseUrl + 'data/shop/history.csv');
  
  // Parse CSVs
  var totalsRows = parseCsv_(totalsCsv);
  var currentRows = parseCsv_(currentCsv);
  var historyRows = parseCsv_(historyCsv);
  
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
  
  // 3. Process history.csv
  for (var h = 0; h < historyRows.length; h++) {
    // History is index-based, skip header processing (already done by parseCsv_)
    // We'll handle this with raw CSV parsing instead
  }
  // For history, use raw row parsing since it's index-based
  var histLines = historyCsv.split('\n');
  if (histLines.length > 1) {
    var histHeaders = parseCSVLine_(histLines[0]);
    for (var h = 1; h < histLines.length; h++) {
      if (!histLines[h].trim()) continue;
      var cols = parseCSVLine_(histLines[h]);
      if (cols.length < 9) continue;
      var email = cols[0].toLowerCase().trim();
      if (!creatorsMap[email]) continue;
      
      var cr = creatorsMap[email];
      var handle = cols[1];
      
      // GMV: cols D-I (indices 3-8, reversed for chronological order)
      var gmvArr = [];
      for (var i = 8; i >= 3; i--) { gmvArr.push(toNum_(cols[i] || '0')); }
      cr.accountsHistory.push({ handle: handle, gmv: gmvArr });
      
      // History months (store once)
      if (!cr.historyMonths) {
        var rawLabels = [];
        for (var i = 8; i >= 3; i--) { rawLabels.push(histHeaders[i] || ''); }
        cr.historyMonths = rawLabels;
      }
      
      // TAP: indices 11-16 (Feb thru Sep TAP data; index 10 is the "TAP" label)
      if (cols.length > 16) {
        var tapArr = [];
        for (var i = 16; i >= 11; i--) { tapArr.push(toNum_(cols[i] || '0')); }
        if (!cr.tapHistory || cr.tapHistory.length === 0) {
          cr.tapHistory = tapArr;
        } else {
          for (var i = 0; i < tapArr.length; i++) { cr.tapHistory[i] = (cr.tapHistory[i] || 0) + tapArr[i]; }
        }
      }
      
      // COMM: cols T-Y (indices 19-24)
      if (cols.length > 24) {
        var commArr = [];
        for (var i = 24; i >= 19; i--) { commArr.push(toNum_(cols[i] || '0')); }
        if (!cr.commHistory) {
          cr.commHistory = commArr;
        } else {
          for (var i = 0; i < commArr.length; i++) { cr.commHistory[i] = (cr.commHistory[i] || 0) + commArr[i]; }
        }
      }
      
      // BONUS: cols AB-AG (indices 27-32)
      if (cols.length > 32) {
        var bonusArr = [];
        for (var i = 32; i >= 27; i--) { bonusArr.push(toNum_(cols[i] || '0')); }
        if (!cr.bonusHistory) {
          cr.bonusHistory = bonusArr;
        } else {
          for (var i = 0; i < bonusArr.length; i++) { cr.bonusHistory[i] = (cr.bonusHistory[i] || 0) + bonusArr[i]; }
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
  
  // Generate JS content
  var now = new Date().toISOString();
  var jsContent = '// Taboost Agency - Multi-Sheet Merged Shop Data\n';
  jsContent += '// Generated: ' + now + '\n';
  jsContent += '// Total Mapped: ' + allCreators.length + ' unique shop creators\n\n';
  jsContent += 'const allShopData = ' + JSON.stringify(allCreators, null, 2) + ';\n\n';
  jsContent += 'if (typeof window !== "undefined") {\n';
  jsContent += '    window.TABOOST_SHOP_DATA = allShopData;\n';
  jsContent += '}\n';
  jsContent += 'if (typeof module !== "undefined") {\n';
  jsContent += '    module.exports = allShopData;\n';
  jsContent += '}\n';
  
  // Push shop-data.js to GitHub
  pushToGitHub_(jsContent, config, 'js/shop-data.js', 'shop-data.js');
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
  return {
    GITHUB_TOKEN: props.getProperty('GITHUB_TOKEN'),
    GITHUB_OWNER: props.getProperty('GITHUB_OWNER') || 'ceyre-boop',
    GITHUB_REPO: props.getProperty('GITHUB_REPO') || 'TABOOST-Shop',
    SHEET_ID: props.getProperty('SHEET_ID')
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
  var missing = SHEET_CONFIG.filter(function(cfg) { return names.indexOf(cfg.tabName) === -1; });

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
