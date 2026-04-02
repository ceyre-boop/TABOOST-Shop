// Google Apps Script - Sync Google Sheets to Firebase Firestore
// 1. Open your Google Sheet
// 2. Extensions → Apps Script
// 3. Paste this code
// 4. Replace FIREBASE_URL and FIREBASE_SECRET with your values
// 5. Set up a trigger to run every hour

const FIREBASE_URL = 'https://your-project-default-rtdb.firebaseio.com';
const FIREBASE_SECRET = 'your-database-secret';

function syncSheetToFirebase() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const creatorsSheet = sheet.getSheetByName('Current month'); // Change if your sheet has a different name
  
  if (!creatorsSheet) {
    console.error('Sheet "Current month" not found');
    return;
  }
  
  const data = creatorsSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Map column names to indices
  const colMap = {};
  headers.forEach((h, i) => {
    colMap[h.toString().toLowerCase().replace(/\s+/g, '_')] = i;
  });
  
  console.log('Found columns:', Object.keys(colMap));
  
  const creators = [];
  
  // Process each row (skip header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Skip empty rows
    if (!row[0]) continue;
    
    const creator = {
      creatorId: row[colMap.creator_id || colMap.id || 0]?.toString() || '',
      username: row[colMap.username || colMap.creator || 1]?.toString() || '',
      agent: row[colMap.agent || colMap.manager || 2]?.toString() || '',
      tier: parseInt(row[colMap.tier || colMap.level || 3]) || 0,
      diamonds: parseInt(row[colMap.diamonds || colMap.total_diamonds || 4]) || 0,
      rewards: parseInt(row[colMap.rewards || colMap.total_rewards || 5]) || 0,
      hours: parseInt(row[colMap.hours || colMap.hours_streamed || 6]) || 0,
      score: parseInt(row[colMap.score || colMap.creator_score || 7]) || 0,
      lastUpdated: new Date().toISOString()
    };
    
    // Calculate derived fields
    creator.diamondsPerHour = creator.hours > 0 ? Math.round(creator.diamonds / creator.hours) : 0;
    
    creators.push(creator);
  }
  
  console.log(`Processing ${creators.length} creators...`);
  
  // Send to Firebase Firestore in batches
  const batchSize = 500;
  for (let i = 0; i < creators.length; i += batchSize) {
    const batch = creators.slice(i, i + batchSize);
    sendBatchToFirebase(batch);
    Utilities.sleep(1000); // Rate limiting
  }
  
  console.log('Sync complete!');
  
  // Send summary to analytics collection
  sendSummary(creators);
}

function sendBatchToFirebase(creators) {
  creators.forEach(creator => {
    const url = `${FIREBASE_URL}/creators/${creator.creatorId}.json?auth=${FIREBASE_SECRET}`;
    
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(creator)
    };
    
    try {
      UrlFetchApp.fetch(url, options);
    } catch (e) {
      console.error('Error sending creator:', creator.username, e);
    }
  });
}

function sendSummary(creators) {
  const summary = {
    totalCreators: creators.length,
    totalDiamonds: creators.reduce((sum, c) => sum + c.diamonds, 0),
    totalRewards: creators.reduce((sum, c) => sum + c.rewards, 0),
    totalHours: creators.reduce((sum, c) => sum + c.hours, 0),
    activeCreators: creators.filter(c => c.hours > 0).length,
    lastSync: new Date().toISOString()
  };
  
  const url = `${FIREBASE_URL}/summary.json?auth=${FIREBASE_SECRET}`;
  
  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(summary)
  };
  
  UrlFetchApp.fetch(url, options);
  console.log('Summary sent:', summary);
}

// Trigger function - run this to set up automatic sync
function createSyncTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'syncSheetToFirebase') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // Create new hourly trigger
  ScriptApp.newTrigger('syncSheetToFirebase')
    .timeBased()
    .everyHours(1)
    .create();
  
  console.log('Hourly sync trigger created!');
}

// Manual run for testing
function testSync() {
  syncSheetToFirebase();
}