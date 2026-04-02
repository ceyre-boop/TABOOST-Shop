/**
 * TABOOST Multi-Tab CSV Sync System
 * Google Sheets → GitHub → GitHub Pages
 * 
 * Exports 3 tabs to 3 CSVs automatically
 * 
 * Setup:
 * 1. Copy this into Apps Script
 * 2. Run setupMultiTabSync()
 * 3. Run createDailyTrigger()
 */

// ============================================
// MULTI-TAB CONFIGURATION
// ============================================

/**
 * Define your tabs here
 * Format: { tabName: 'Sheet Tab Name', outputPath: 'data/filename.csv' }
 */
const MULTI_TAB_CONFIG = [
  { tabName: 'Totals', outputPath: 'data/totals.csv' },
  { tabName: 'Current', outputPath: 'data/current.csv' },
  { tabName: 'History', outputPath: 'data/history.csv' },
  { tabName: 'TAP-Links', outputPath: 'data/tap-links.csv' },
  { tabName: 'TAP-Products', outputPath: 'data/tap-products.csv' }
];

// ============================================
// MAIN SYNC FUNCTION (Multi-Tab)
// ============================================

/**
 * Sync all 3 tabs to GitHub
 */
function syncAllTabsToGitHub() {
  const config = loadConfig();
  const startTime = new Date();
  const results = [];
  
  try {
    console.log(`🚀 Starting multi-tab sync at ${startTime.toISOString()}`);
    
    // Process each tab
    for (const tabConfig of MULTI_TAB_CONFIG) {
      try {
        console.log(`\n📊 Processing tab: ${tabConfig.tabName}`);
        
        // Get GID for this tab
        const gid = getGidForTabName(tabConfig.tabName);
        if (!gid) {
          throw new Error(`Tab "${tabConfig.tabName}" not found in spreadsheet`);
        }
        
        // Export to CSV
        const csvContent = exportSheetToCSV(config.SHEET_ID, gid);
        console.log(`✅ Exported ${csvContent.length} chars from ${tabConfig.tabName}`);
        
        // Push to GitHub
        const result = pushToGitHub(csvContent, {
          ...config,
          CSV_PATH: tabConfig.outputPath
        }, tabConfig.tabName);
        
        results.push({
          tab: tabConfig.tabName,
          path: tabConfig.outputPath,
          status: 'success',
          commit: result.commit.sha.substring(0, 7)
        });
        
      } catch (tabError) {
        console.error(`❌ Failed to sync ${tabConfig.tabName}:`, tabError.message);
        results.push({
          tab: tabConfig.tabName,
          path: tabConfig.outputPath,
          status: 'error',
          error: tabError.message
        });
      }
    }
    
    // Summary
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    const successCount = results.filter(r => r.status === 'success').length;
    
    console.log(`\n✅ Multi-tab sync complete in ${duration}s`);
    console.log(`📊 ${successCount}/${MULTI_TAB_CONFIG.length} tabs synced`);
    
    // Log to sheet
    logSyncResults(results, duration);
    
    return {
      success: successCount === MULTI_TAB_CONFIG.length,
      timestamp: endTime.toISOString(),
      duration: duration,
      results: results
    };
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    sendErrorNotification(error.message);
    throw error;
  }
}

// Alias for manual runs
function testMultiTabSync() {
  return syncAllTabsToGitHub();
}

// ============================================
// SETUP FUNCTIONS
// ============================================

/**
 * Setup for multi-tab sync
 */
function setupMultiTabSync() {
  const ui = SpreadsheetApp.getUi();
  
  // GitHub Token
  const tokenResponse = ui.prompt(
    'Multi-Tab Setup: GitHub Token',
    'Enter your GitHub Personal Access Token (with repo scope):',
    ui.ButtonSet.OK_CANCEL
  );
  if (tokenResponse.getSelectedButton() !== ui.Button.OK) return;
  PropertiesService.getScriptProperties().setProperty('GITHUB_TOKEN', tokenResponse.getResponseText().trim());
  
  // GitHub Owner
  const ownerResponse = ui.prompt(
    'Setup: GitHub Owner',
    'Enter the GitHub username or organization:',
    ui.ButtonSet.OK_CANCEL
  );
  if (ownerResponse.getSelectedButton() !== ui.Button.OK) return;
  PropertiesService.getScriptProperties().setProperty('GITHUB_OWNER', ownerResponse.getResponseText().trim());
  
  // GitHub Repo
  const repoResponse = ui.prompt(
    'Setup: GitHub Repository',
    'Enter the repository name:',
    ui.ButtonSet.OK_CANCEL
  );
  if (repoResponse.getSelectedButton() !== ui.Button.OK) return;
  PropertiesService.getScriptProperties().setProperty('GITHUB_REPO', repoResponse.getResponseText().trim());
  
  // Sheet ID (auto)
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', spreadsheet.getId());
  
  // Verify tabs exist
  const sheetNames = spreadsheet.getSheets().map(s => s.getName());
  const missingTabs = MULTI_TAB_CONFIG.filter(cfg => !sheetNames.includes(cfg.tabName));
  
  if (missingTabs.length > 0) {
    ui.alert(`⚠️ Warning: These tabs not found: ${missingTabs.map(t => t.tabName).join(', ')}\n\nAvailable tabs: ${sheetNames.join(', ')}`);
    return;
  }
  
  // Trigger Hour - Default 10 AM PT
  const hourResponse = ui.prompt(
    'Setup: Daily Sync Time',
    'What hour should the sync run daily? (0-23)\nDefault: 10 (10 AM PT)',
    ui.ButtonSet.OK_CANCEL
  );
  const hour = hourResponse.getSelectedButton() === ui.Button.OK 
    ? parseInt(hourResponse.getResponseText()) || 10 
    : 10;
  PropertiesService.getScriptProperties().setProperty('TRIGGER_HOUR', hour.toString());
  
  ui.alert('✅ Multi-tab setup complete!\n\nTabs to sync:\n' + 
    MULTI_TAB_CONFIG.map(t => `• ${t.tabName} → ${t.outputPath}`).join('\n') +
    '\n\nRun testMultiTabSync() to verify, then createDailyTrigger() to enable automation.');
}

/**
 * Get GID for a tab name
 */
function getGidForTabName(tabName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(tabName);
  return sheet ? sheet.getSheetId().toString() : null;
}

/**
 * Load configuration
 */
function loadConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    GITHUB_TOKEN: props.getProperty('GITHUB_TOKEN'),
    GITHUB_OWNER: props.getProperty('GITHUB_OWNER'),
    GITHUB_REPO: props.getProperty('GITHUB_REPO'),
    GITHUB_BRANCH: 'main',
    SHEET_ID: props.getProperty('SHEET_ID'),
    TRIGGER_HOUR: parseInt(props.getProperty('TRIGGER_HOUR')) || 10,
    TRIGGER_TIMEZONE: 'America/Los_Angeles'
  };
}

// ============================================
// SHEET EXPORT (Same as v1)
// ============================================

function exportSheetToCSV(sheetId, gid) {
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  
  const response = UrlFetchApp.fetch(exportUrl, {
    headers: { 'Authorization': `Bearer ${ScriptApp.getOAuthToken()}` },
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`Export failed: ${response.getContentText()}`);
  }
  
  return response.getContentText();
}

// ============================================
// GITHUB INTEGRATION (Modified for multi-tab)
// ============================================

function pushToGitHub(csvContent, config, tabName) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, CSV_PATH } = config;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CSV_PATH}`;
  
  // Check if file exists
  let existingSha = null;
  try {
    const checkResponse = UrlFetchApp.fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      muteHttpExceptions: true
    });
    
    if (checkResponse.getResponseCode() === 200) {
      const fileData = JSON.parse(checkResponse.getContentText());
      existingSha = fileData.sha;
    }
  } catch (e) {}
  
  // Upload
  const timestamp = new Date().toISOString();
  const commitMessage = `Auto-sync: ${tabName} → ${CSV_PATH} @ ${timestamp}`;
  
  const payload = {
    message: commitMessage,
    content: Utilities.base64Encode(csvContent),
    branch: GITHUB_BRANCH
  };
  
  if (existingSha) {
    payload.sha = existingSha;
  }
  
  const uploadResponse = UrlFetchApp.fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  if (uploadResponse.getResponseCode() !== 200 && uploadResponse.getResponseCode() !== 201) {
    throw new Error(`GitHub upload failed: ${uploadResponse.getContentText()}`);
  }
  
  return JSON.parse(uploadResponse.getContentText());
}

// ============================================
// TRIGGERS & UTILITIES
// ============================================

function createDailyTrigger() {
  deleteExistingTriggers();
  const config = loadConfig();
  
  ScriptApp.newTrigger('syncAllTabsToGitHub')
    .timeBased()
    .everyDays(1)
    .atHour(config.TRIGGER_HOUR)
    .nearMinute(0)
    .inTimezone(config.TRIGGER_TIMEZONE)
    .create();
  
  SpreadsheetApp.getUi().alert(`✅ Daily sync scheduled for ${config.TRIGGER_HOUR}:00 ${config.TRIGGER_TIMEZONE}\n\nSyncing tabs:\n${MULTI_TAB_CONFIG.map(t => `• ${t.tabName}`).join('\n')}`);
}

function deleteExistingTriggers() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncAllTabsToGitHub') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function stopAutomation() {
  deleteExistingTriggers();
  SpreadsheetApp.getUi().alert('⏸️ Automation stopped.');
}

function logSyncResults(results, duration) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('Sync Log');
    if (!logSheet) {
      logSheet = ss.insertSheet('Sync Log');
      logSheet.appendRow(['Timestamp', 'Duration', 'Tab', 'Path', 'Status', 'Commit/Error']);
    }
    
    results.forEach(result => {
      logSheet.appendRow([
        new Date().toISOString(),
        duration + 's',
        result.tab,
        result.path,
        result.status,
        result.commit || result.error
      ]);
    });
  } catch (e) {}
}

function sendErrorNotification(errorMessage) {
  // Same as v1 - logs to sheet
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('TABOOST Multi-Sync')
    .addItem('⚡ Sync All Tabs Now', 'syncAllTabsToGitHub')
    .addItem('🔧 Setup', 'setupMultiTabSync')
    .addItem('⏰ Enable Daily Sync', 'createDailyTrigger')
    .addItem('⏸️ Stop Daily Sync', 'stopAutomation')
    .addToUi();
}

// Keep old function for backward compatibility
function syncSheetToGitHub() {
  // If single tab config exists, use it, otherwise use multi
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('TARGET_GID')) {
    // Use single-tab version from v1
    return syncSingleTab(props);
  }
  return syncAllTabsToGitHub();
}

function syncSingleTab(props) {
  // Legacy single-tab sync
  const config = {
    GITHUB_TOKEN: props.getProperty('GITHUB_TOKEN'),
    GITHUB_OWNER: props.getProperty('GITHUB_OWNER'),
    GITHUB_REPO: props.getProperty('GITHUB_REPO'),
    GITHUB_BRANCH: 'main',
    SHEET_ID: props.getProperty('SHEET_ID'),
    TARGET_GID: props.getProperty('TARGET_GID'),
    CSV_PATH: props.getProperty('CSV_PATH') || 'data/auto-sync.csv',
    TRIGGER_HOUR: parseInt(props.getProperty('TRIGGER_HOUR')) || 10,
    TRIGGER_TIMEZONE: 'America/Los_Angeles'
  };
  
  const csvContent = exportSheetToCSV(config.SHEET_ID, config.TARGET_GID);
  return pushToGitHub(csvContent, config, 'Single Tab');
}
