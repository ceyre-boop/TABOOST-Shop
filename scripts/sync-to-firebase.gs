// Google Apps Script for TABOOST - Sync Google Sheets to Firebase
// This goes in your Google Sheet: Extensions → Apps Script

// CONFIG - Update these with your Firebase details
const FIREBASE_PROJECT_ID = 'taboost-platform';
const FIREBASE_API_KEY = 'AIzaSyBrApQHC1Fvbjm9EVTptt2kNG2mDb1PzXE';

// Firestore REST API base URL
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

function syncToFirebase() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = sheet.getSheetByName('Current month');
  
  if (!dataSheet) {
    console.error('Sheet "Current month" not found!');
    return;
  }
  
  const data = dataSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find column indices - map actual column names to fields
  const colIndex = {};
  headers.forEach((h, i) => {
    colIndex[h.toString().trim().toLowerCase().replace(/[💎\s]+/g, '_').replace(/_+/g, '_').replace(/^_/, '')] = i;
  });
  
  console.log('Columns found:', Object.keys(colIndex));
  
  // Process creators
  const creators = [];
  const batchSize = 500; // Firestore batch limit
  let batch = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue; // Skip empty rows (creator ID is in column 1)
    
    // Parse numbers with commas
    const parseNum = (val) => {
      if (!val) return 0;
      const cleaned = val.toString().replace(/,/g, '');
      return parseInt(cleaned) || 0;
    };
    
    const creator = {
      creatorId: row[1]?.toString() || `row_${i}`, // Host column
      username: row[2]?.toString() || '', // 3/14 column (seems to be username)
      agent: row[8]?.toString() || '', // Agent column
      tier: parseInt(row[4]) || 0, // Level column
      diamonds: parseNum(row[18]), // 💎 column (diamonds)
      rewards: parseNum(row[40]), // Rewards Month column
      hours: parseInt(row[16]) || 0, // Hours column
      score: parseInt(row[32]) || 0, // Score column
      hoursGoal: parseInt(row[17]) || 40, // Hrs Goal
      tierGoal: parseNum(row[21]), // Tier Goal
      updatedAt: new Date().toISOString()
    };
    
    // Calculate efficiency
    creator.diamondsPerHour = creator.hours > 0 ? Math.round(creator.diamonds / creator.hours) : 0;
    
    batch.push(creator);
    
    // Send batch when full
    if (batch.length >= batchSize) {
      sendBatchToFirestore(batch);
      batch = [];
      Utilities.sleep(1000); // Rate limiting
    }
  }
  
  // Send remaining
  if (batch.length > 0) {
    sendBatchToFirestore(batch);
  }
  
  // Update summary
  updateSummary(creators);
  
  console.log(`Synced ${creators.length} creators to Firebase`);
}

function sendBatchToFirestore(creators) {
  creators.forEach(creator => {
    const url = `${FIRESTORE_BASE_URL}/creators/${creator.creatorId}?key=${FIREBASE_API_KEY}`;
    
    const payload = {
      fields: {
        creatorId: { stringValue: creator.creatorId },
        username: { stringValue: creator.username },
        agent: { stringValue: creator.agent },
        tier: { integerValue: creator.tier },
        diamonds: { integerValue: creator.diamonds },
        rewards: { integerValue: creator.rewards },
        hours: { integerValue: creator.hours },
        score: { integerValue: creator.score },
        hoursGoal: { integerValue: creator.hoursGoal },
        tierGoal: { integerValue: creator.tierGoal },
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
}

function updateSummary(creators) {
  const summary = {
    totalCreators: creators.length,
    totalDiamonds: creators.reduce((sum, c) => sum + c.diamonds, 0),
    totalRewards: creators.reduce((sum, c) => sum + c.rewards, 0),
    totalHours: creators.reduce((sum, c) => sum + c.hours, 0),
    activeCreators: creators.filter(c => c.hours > 0).length,
    lastUpdate: new Date().toISOString()
  };
  
  const url = `${FIRESTORE_BASE_URL}/summary/dashboard?key=${FIREBASE_API_KEY}`;
  
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
}

// Set up hourly auto-sync
function createHourlyTrigger() {
  // Delete existing triggers
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncToFirebase') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // Create new hourly trigger
  ScriptApp.newTrigger('syncToFirebase')
    .timeBased()
    .everyHours(1)
    .create();
  
  console.log('Hourly sync trigger created!');
}

// Run this once to authorize and test
function testSync() {
  syncToFirebase();
}