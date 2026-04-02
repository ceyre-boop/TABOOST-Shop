/**
 * TABOOST Automated CSV Sync System
 * Google Sheets → GitHub → GitHub Pages
 * 
 * Setup:
 * 1. Create new Apps Script project from your Google Sheet (Extensions > Apps Script)
 * 2. Copy this entire file into Code.gs
 * 3. Run setupScriptProperties() to configure
 * 4. Run createDailyTrigger() to enable automation
 */

// ============================================
// CONFIGURATION (Set via Script Properties for security)
// ============================================

const CONFIG = {
  // GitHub Settings
  GITHUB_TOKEN: null,      // Set via Script Properties
  GITHUB_OWNER: null,      // e.g., "ceyre-boop"
  GITHUB_REPO: null,       // e.g., "TABOOST-Shop"
  GITHUB_BRANCH: 'main',
  
  // Sheet Settings
  SHEET_ID: null,          // From URL: .../d/SHEET_ID/edit
  TARGET_GID: null,        // From URL: ...gid=GID (specific tab)
  
  // File Paths
  CSV_PATH: 'data/auto-sync.csv',  // Where to save in repo
  
  // Trigger Settings
  TRIGGER_HOUR: 2,  // 2 AM daily (adjust as needed)
  TRIGGER_TIMEZONE: 'America/Los_Angeles'
};

// ============================================
// SETUP FUNCTIONS (Run once)
// ============================================

/**
 * Run this first to set up secure configuration
 * It will prompt for each value and store securely
 */
function setupScriptProperties() {
  const ui = SpreadsheetApp.getUi();
  
  // GitHub Token (PAT with repo scope)
  const tokenResponse = ui.prompt(
    'Setup: GitHub Token',
    'Enter your GitHub Personal Access Token (with repo scope):\n\nCreate one at: https://github.com/settings/tokens',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (tokenResponse.getSelectedButton() !== ui.Button.OK) return;
  PropertiesService.getScriptProperties().setProperty('GITHUB_TOKEN', tokenResponse.getResponseText().trim());
  
  // GitHub Owner
  const ownerResponse = ui.prompt(
    'Setup: GitHub Owner',
    'Enter the GitHub username or organization:\n(e.g., "ceyre-boop")',
    ui.ButtonSet.OK_CANCEL
  );
  if (ownerResponse.getSelectedButton() !== ui.Button.OK) return;
  PropertiesService.getScriptProperties().setProperty('GITHUB_OWNER', ownerResponse.getResponseText().trim());
  
  // GitHub Repo
  const repoResponse = ui.prompt(
    'Setup: GitHub Repository',
    'Enter the repository name:\n(e.g., "TABOOST-Shop")',
    ui.ButtonSet.OK_CANCEL
  );
  if (repoResponse.getSelectedButton() !== ui.Button.OK) return;
  PropertiesService.getScriptProperties().setProperty('GITHUB_REPO', repoResponse.getResponseText().trim());
  
  // Sheet ID (auto-detect current sheet)
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', spreadsheet.getId());
  
  // Target GID (ask for tab name)
  const sheets = spreadsheet.getSheets();
  const sheetNames = sheets.map(s => s.getName()).join(', ');
  const gidResponse = ui.prompt(
    'Setup: Sheet Tab',
    `Available tabs: ${sheetNames}\n\nEnter the EXACT name of the tab to export:`,
    ui.ButtonSet.OK_CANCEL
  );
  if (gidResponse.getSelectedButton() !== ui.Button.OK) return;
  
  const targetSheet = spreadsheet.getSheetByName(gidResponse.getResponseText().trim());
  if (!targetSheet) {
    ui.alert('Error: Sheet not found!');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('TARGET_GID', targetSheet.getSheetId().toString());
  
  // CSV Path
  const pathResponse = ui.prompt(
    'Setup: CSV File Path',
    'Where should the CSV be saved in the repo?\n(default: data/auto-sync.csv)',
    ui.ButtonSet.OK_CANCEL
  );
  const csvPath = pathResponse.getSelectedButton() === ui.Button.OK && pathResponse.getResponseText().trim() 
    ? pathResponse.getResponseText().trim() 
    : 'data/auto-sync.csv';
  PropertiesService.getScriptProperties().setProperty('CSV_PATH', csvPath);
  
  // Trigger Hour
  const hourResponse = ui.prompt(
    'Setup: Daily Sync Time',
    'What hour should the sync run daily? (0-23, 24h format)\nDefault: 2 (2 AM)',
    ui.ButtonSet.OK_CANCEL
  );
  const hour = hourResponse.getSelectedButton() === ui.Button.OK 
    ? parseInt(hourResponse.getResponseText()) || 2 
    : 2;
  PropertiesService.getScriptProperties().setProperty('TRIGGER_HOUR', hour.toString());
  
  ui.alert('✅ Setup complete! Run testSync() to verify, then createDailyTrigger() to enable automation.');
}

/**
 * Load configuration from secure properties
 */
function loadConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    GITHUB_TOKEN: props.getProperty('GITHUB_TOKEN'),
    GITHUB_OWNER: props.getProperty('GITHUB_OWNER'),
    GITHUB_REPO: props.getProperty('GITHUB_REPO'),
    GITHUB_BRANCH: 'main',
    SHEET_ID: props.getProperty('SHEET_ID'),
    TARGET_GID: props.getProperty('TARGET_GID'),
    CSV_PATH: props.getProperty('CSV_PATH') || 'data/auto-sync.csv',
    TRIGGER_HOUR: parseInt(props.getProperty('TRIGGER_HOUR')) || 2,
    TRIGGER_TIMEZONE: 'America/Los_Angeles'
  };
}

// ============================================
// MAIN SYNC FUNCTION
// ============================================

/**
 * Main function - exports sheet to CSV and pushes to GitHub
 * Can be run manually or triggered automatically
 */
function syncSheetToGitHub() {
  const config = loadConfig();
  const startTime = new Date();
  
  try {
    // Validate config
    if (!config.GITHUB_TOKEN || !config.GITHUB_OWNER || !config.GITHUB_REPO) {
      throw new Error('Configuration incomplete. Run setupScriptProperties() first.');
    }
    
    console.log(`🚀 Starting sync at ${startTime.toISOString()}`);
    
    // Step 1: Export sheet to CSV
    console.log('📊 Exporting sheet data...');
    const csvContent = exportSheetToCSV(config.SHEET_ID, config.TARGET_GID);
    console.log(`✅ Exported ${csvContent.length} characters`);
    
    // Step 2: Push to GitHub
    console.log('📤 Pushing to GitHub...');
    const result = pushToGitHub(csvContent, config);
    
    // Step 3: Log success
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Sync complete in ${duration}s`);
    console.log(`📁 File: ${config.CSV_PATH}`);
    console.log(`🔀 Commit: ${result.commit.sha.substring(0, 7)}`);
    
    return {
      success: true,
      timestamp: endTime.toISOString(),
      duration: duration,
      commit: result.commit.sha,
      filePath: config.CSV_PATH
    };
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    console.error(error.stack);
    
    // Send error notification (optional - can integrate with email/Slack)
    sendErrorNotification(error.message);
    
    throw error;
  }
}

// Alias for manual runs
function testSync() {
  return syncSheetToGitHub();
}

// ============================================
// SHEET EXPORT
// ============================================

/**
 * Export Google Sheet to CSV using the export endpoint
 */
function exportSheetToCSV(sheetId, gid) {
  if (!sheetId) {
    // Use active spreadsheet if no ID provided
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    sheetId = spreadsheet.getId();
  }
  
  if (!gid) {
    // Use first sheet if no GID provided
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    gid = spreadsheet.getSheets()[0].getSheetId();
  }
  
  // Build export URL
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  
  // Fetch with OAuth token
  const response = UrlFetchApp.fetch(exportUrl, {
    headers: {
      'Authorization': `Bearer ${ScriptApp.getOAuthToken()}`
    },
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`Export failed: ${response.getContentText()}`);
  }
  
  return response.getContentText();
}

// ============================================
// GITHUB INTEGRATION
// ============================================

/**
 * Push CSV content to GitHub repository
 */
function pushToGitHub(csvContent, config) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, CSV_PATH } = config;
  
  // GitHub API base URL
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CSV_PATH}`;
  
  // Step 1: Check if file exists (get SHA for update)
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
      console.log(`📝 File exists, SHA: ${existingSha.substring(0, 7)}`);
    }
  } catch (e) {
    console.log('📝 File does not exist yet (will create)');
  }
  
  // Step 2: Prepare commit data
  const timestamp = new Date().toISOString();
  const commitMessage = `Auto-sync: ${CSV_PATH} @ ${timestamp}`;
  
  const payload = {
    message: commitMessage,
    content: Utilities.base64Encode(csvContent),
    branch: GITHUB_BRANCH
  };
  
  // Include SHA if updating existing file
  if (existingSha) {
    payload.sha = existingSha;
  }
  
  // Step 3: Upload file
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
    const errorText = uploadResponse.getContentText();
    throw new Error(`GitHub upload failed (${uploadResponse.getResponseCode()}): ${errorText}`);
  }
  
  return JSON.parse(uploadResponse.getContentText());
}

// ============================================
// AUTOMATION (TRIGGERS)
// ============================================

/**
 * Create daily trigger - RUN THIS ONCE after setup
 */
function createDailyTrigger() {
  // Remove any existing triggers first
  deleteExistingTriggers();
  
  const config = loadConfig();
  
  // Create new daily trigger
  ScriptApp.newTrigger('syncSheetToGitHub')
    .timeBased()
    .everyDays(1)
    .atHour(config.TRIGGER_HOUR)
    .nearMinute(0)
    .inTimezone(config.TRIGGER_TIMEZONE)
    .create();
  
  console.log(`✅ Daily trigger created! Will run at ${config.TRIGGER_HOUR}:00 ${config.TRIGGER_TIMEZONE}`);
  SpreadsheetApp.getUi().alert(`✅ Daily sync scheduled for ${config.TRIGGER_HOUR}:00 ${config.TRIGGER_TIMEZONE}`);
}

/**
 * Remove all existing triggers for this function
 */
function deleteExistingTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let deleted = 0;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncSheetToGitHub') {
      ScriptApp.deleteTrigger(trigger);
      deleted++;
    }
  });
  
  if (deleted > 0) {
    console.log(`🗑️ Removed ${deleted} existing trigger(s)`);
  }
}

/**
 * Stop all automation - run if you need to pause
 */
function stopAutomation() {
  deleteExistingTriggers();
  SpreadsheetApp.getUi().alert('⏸️ Automation stopped. Run createDailyTrigger() to resume.');
}

// ============================================
// UTILITIES
// ============================================

/**
 * Send error notification (customize as needed)
 */
function sendErrorNotification(errorMessage) {
  // Option 1: Email (add your email)
  // MailApp.sendEmail('your-email@example.com', 'TABOOST Sync Error', errorMessage);
  
  // Option 2: Log to sheet
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('Sync Log');
    if (!logSheet) {
      logSheet = ss.insertSheet('Sync Log');
      logSheet.appendRow(['Timestamp', 'Status', 'Message']);
    }
    logSheet.appendRow([new Date().toISOString(), 'ERROR', errorMessage]);
  } catch (e) {
    console.log('Could not write to log sheet:', e.message);
  }
}

/**
 * View current configuration (for debugging)
 */
function viewConfig() {
  const config = loadConfig();
  const safeConfig = {
    ...config,
    GITHUB_TOKEN: config.GITHUB_TOKEN ? '***' + config.GITHUB_TOKEN.slice(-4) : 'NOT SET'
  };
  console.log('Current configuration:', JSON.stringify(safeConfig, null, 2));
  return safeConfig;
}

/**
 * Manual trigger for testing - adds button to sheet menu
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('TABOOST Sync')
    .addItem('⚡ Sync Now', 'syncSheetToGitHub')
    .addItem('🔧 Setup', 'setupScriptProperties')
    .addItem('⏰ Enable Daily Sync', 'createDailyTrigger')
    .addItem('⏸️ Stop Daily Sync', 'stopAutomation')
    .addItem('🧪 Test Config', 'viewConfig')
    .addToUi();
}

// ============================================
// WEBHOOK ENDPOINT (Optional - for real-time triggers)
// ============================================

/**
 * DoGet handler for webhook triggering
 * Deploy as web app to get URL for external triggers
 */
function doGet(e) {
  const secret = e.parameter.secret;
  const config = loadConfig();
  
  // Simple secret validation (set GITHUB_TOKEN as secret param)
  if (secret !== config.GITHUB_TOKEN) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid secret'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    const result = syncSheetToGitHub();
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
