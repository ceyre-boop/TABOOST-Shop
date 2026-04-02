// ============================================================================
// GOOGLE APPS SCRIPT - Sync Google Sheets to Firebase Firestore
// ============================================================================
// 
// SETUP INSTRUCTIONS:
// 1. Open your Google Sheet
// 2. Go to Extensions → Apps Script
// 3. Delete any existing code
// 4. Paste this entire script
// 5. Update the CONFIG section below with your Firebase credentials
// 6. Click Save (disk icon)
// 7. Click "Run" → "syncSheetToFirebase" to test
// 8. Authorize when prompted
// 9. If it works, run "setupHourlyTrigger" for automatic updates
//
// ============================================================================

// ===================== CONFIG - UPDATE THESE VALUES =====================

// Get these from Firebase Console → Project Settings → General → Your apps → Web app
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBrApQHC1Fvbjm9EVTptt2kNG2mDb1PzXE",
  authDomain: "taboost-platform.firebaseapp.com",
  projectId: "taboost-platform",
  databaseURL: "https://taboost-platform-default-rtdb.firebaseio.com"
};

// Get this from Firebase Console → Project Settings → Service Accounts → Database Secrets
// OR use Firebase Admin SDK private key (more secure)
const FIREBASE_SECRET = "YOUR_DATABASE_SECRET"; 

// Name of your sheet tab (usually "Current month" or "Sheet1")
const SHEET_NAME = "Current month";

// ===================== MAIN FUNCTIONS =====================

/**
 * Main sync function - call this to manually sync
 */
function syncSheetToFirebase() {
  console.log('🚀 Starting sync...');
  
  try {
    // 1. Get data from Google Sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = sheet.getSheetByName(SHEET_NAME);
    
    if (!dataSheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found!`);
    }
    
    const data = dataSheet.getDataRange().getValues();
    const headers = data[0];
    
    console.log(`📊 Found ${data.length} rows, ${headers.length} columns`);
    
    // 2. Parse headers to find column indices
    const colIndex = {};
    headers.forEach((h, i) => {
      const cleanHeader = h.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      colIndex[cleanHeader] = i;
    });
    
    console.log('Columns:', Object.keys(colIndex).slice(0, 10), '...');
    
    // 3. Parse creators
    const creators = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row[1] || !row[2]) continue;
      
      const username = row[2].toString().trim();
      if (!username || username.includes('/') || username.includes('@')) continue;
      
      // Parse numbers (handle commas)
      const parseNum = (val) => {
        if (!val) return 0;
        const cleaned = val.toString().replace(/,/g, '').replace(/"/g, '');
        return parseInt(cleaned) || 0;
      };
      
      // Get manager and clean it
      let manager = row[8] ? row[8].toString().trim() : 'CARRINGTON';
      if (manager.includes('+')) manager = manager.split('+')[0].trim();
      if (!manager || manager.toLowerCase() === 'n/a') manager = 'CARRINGTON';
      
      // Calculate diamonds per hour
      const diamonds = parseNum(row[19]); // 💎 column
      const hours = parseNum(row[16]);
      const diamondsPerHour = hours > 0 ? Math.round(diamonds / hours) : 0;
      
      creators.push({
        creatorId: row[1].toString().trim(),
        username: username.toLowerCase(),
        name: username,
        email: `${username}@taboost.me`,
        status: row[3] ? row[3].toString().trim() : 'GO',
        level: parseNum(row[4]),
        month: parseNum(row[5]),
        manager: manager.toUpperCase(),
        agent: manager.toUpperCase(),
        claimed: false,
        score: parseNum(row[32]),
        diamonds: diamonds,
        diamondsGoal: parseNum(row[20]),
        diamondsPace: row[20] ? row[20].toString() : '',
        hours: hours,
        hoursGoal: parseNum(row[17]) || 40,
        tier: parseNum(row[21]),
        tierGoal: parseNum(row[22]),
        earned: parseNum(row[33]),
        gifted: parseNum(row[34]),
        diamondsPerHour: diamondsPerHour,
        updatedAt: new Date().toISOString()
      });
    }
    
    console.log(`✅ Parsed ${creators.length} creators`);
    
    // 4. Send to Firebase Firestore
    sendToFirestore(creators);
    
    // 5. Update summary stats
    updateSummary(creators);
    
    console.log('🎉 Sync complete!');
    
    // Return success message for UI
    return {
      success: true,
      count: creators.length,
      message: `Synced ${creators.length} creators to Firebase`
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

/**
 * Send creators to Firebase Firestore
 */
function sendToFirestore(creators) {
  const BATCH_SIZE = 500; // Firestore batch limit
  
  for (let i = 0; i < creators.length; i += BATCH_SIZE) {
    const batch = creators.slice(i, i + BATCH_SIZE);
    
    batch.forEach(creator => {
      // Use Firestore REST API
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/creators/${creator.username}?key=${FIREBASE_CONFIG.apiKey}`;
      
      const payload = {
        fields: {
          creatorId: { stringValue: creator.creatorId },
          username: { stringValue: creator.username },
          name: { stringValue: creator.name },
          email: { stringValue: creator.email },
          status: { stringValue: creator.status },
          level: { integerValue: creator.level },
          month: { integerValue: creator.month },
          manager: { stringValue: creator.manager },
          agent: { stringValue: creator.agent },
          claimed: { booleanValue: creator.claimed },
          score: { integerValue: creator.score },
          diamonds: { integerValue: creator.diamonds },
          diamondsGoal: { integerValue: creator.diamondsGoal },
          hours: { integerValue: creator.hours },
          hoursGoal: { integerValue: creator.hoursGoal },
          tier: { integerValue: creator.tier },
          tierGoal: { integerValue: creator.tierGoal },
          earned: { integerValue: creator.earned },
          gifted: { integerValue: creator.gifted },
          diamondsPerHour: { integerValue: creator.diamondsPerHour },
          updatedAt: { stringValue: creator.updatedAt }
        }
      };
      
      const options = {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify(payload)
      };
      
      try {
        UrlFetchApp.fetch(url, options);
      } catch (e) {
        console.error(`Error sending ${creator.username}:`, e);
      }
    });
    
    console.log(`📤 Sent ${Math.min(i + BATCH_SIZE, creators.length)}/${creators.length}`);
    
    // Rate limiting
    if (i + BATCH_SIZE < creators.length) {
      Utilities.sleep(1000);
    }
  }
}

/**
 * Update summary document
 */
function updateSummary(creators) {
  const summary = {
    totalCreators: creators.length,
    totalDiamonds: creators.reduce((sum, c) => sum + c.diamonds, 0),
    totalRewards: creators.reduce((sum, c) => sum + c.earned, 0),
    totalHours: creators.reduce((sum, c) => sum + c.hours, 0),
    activeCreators: creators.filter(c => c.hours > 0).length,
    lastUpdate: new Date().toISOString()
  };
  
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/summary/dashboard?key=${FIREBASE_CONFIG.apiKey}`;
  
  const payload = {
    fields: {
      totalCreators: { integerValue: summary.totalCreators },
      totalDiamonds: { integerValue: summary.totalDiamonds },
      totalRewards: { integerValue: summary.totalRewards },
      totalHours: { integerValue: summary.totalHours },
      activeCreators: { integerValue: summary.activeCreators },
      lastUpdate: { stringValue: summary.lastUpdate }
    }
  };
  
  const options = {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload)
  };
  
  UrlFetchApp.fetch(url, options);
  console.log('📊 Summary updated');
}

/**
 * Set up automatic hourly sync
 */
function setupHourlyTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncSheetToFirebase') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new hourly trigger
  ScriptApp.newTrigger('syncSheetToFirebase')
    .timeBased()
    .everyHours(1)
    .create();
  
  console.log('⏰ Hourly sync trigger created!');
}

/**
 * Delete all triggers (use to stop auto-sync)
 */
function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  console.log('🛑 All triggers deleted');
}

/**
 * Test function - run this first to verify setup
 */
function testConnection() {
  try {
    console.log('Testing Firebase connection...');
    
    // Test Firestore access
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/test/test?key=${FIREBASE_CONFIG.apiKey}`;
    
    const payload = {
      fields: {
        test: { stringValue: 'Hello from Google Apps Script!' },
        timestamp: { stringValue: new Date().toISOString() }
      }
    };
    
    const options = {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload)
    };
    
    const response = UrlFetchApp.fetch(url, options);
    console.log('✅ Firebase connection successful!');
    console.log('Response:', response.getContentText());
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
}