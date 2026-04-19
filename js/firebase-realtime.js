// Firebase Real-time Dashboard Integration
// Add this to your dashboard.html before </body>

// Firebase Configuration - Using existing TABOOST Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBrApQHC1Fvbjm9EVTptt2kNG2mDb1PzXE",
  authDomain: "taboost-platform.firebaseapp.com",
  databaseURL: "https://taboost-platform-default-rtdb.firebaseio.com",
  projectId: "taboost-platform",
  storageBucket: "taboost-platform.firebasestorage.app",
  messagingSenderId: "379293685859",
  appId: "1:379293685859:web:d89592adbf67360b574056"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Real-time data listener
let creatorsData = [];
let unsubscribe = null;

function startRealtimeSync() {
  console.log('Starting Firebase real-time sync...');
  
  // Listen to creators collection
  unsubscribe = db.collection('creators')
    .orderBy('diamonds', 'desc')
    .onSnapshot((snapshot) => {
      creatorsData = [];
      snapshot.forEach((doc) => {
        creatorsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`Loaded ${creatorsData.length} creators from Firebase`);
      updateDashboard(creatorsData);
    }, (error) => {
      console.error('Firebase sync error:', error);
      // Fallback to JSON file if Firebase fails
      loadFromJSON();
    });
}

function stopRealtimeSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

function updateDashboard(creators) {
  // Update total counts
  const totalCreators = creators.length;
  const totalDiamonds = creators.reduce((sum, c) => sum + (c.diamonds || 0), 0);
  const activeCreators = creators.filter(c => (c.hours || 0) > 0).length;
  
  // Update DOM elements
  const totalEl = document.getElementById('total-creators');
  const diamondsEl = document.getElementById('total-diamonds');
  const activeEl = document.getElementById('active-creators');
  
  if (totalEl) totalEl.textContent = totalCreators.toLocaleString();
  if (diamondsEl) diamondsEl.textContent = formatNumber(totalDiamonds);
  if (activeEl) activeEl.textContent = activeCreators.toLocaleString();
  
  // Update creator tables
  updateCreatorTables(creators);
  
  // Update charts if they exist
  if (window.updateCharts) {
    window.updateCharts(creators);
  }
}

function updateCreatorTables(creators) {
  // Find all tables that need updating
  const tables = document.querySelectorAll('table tbody');
  
  tables.forEach(tbody => {
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Add creator rows
    creators.slice(0, 50).forEach((creator, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${creator.username || 'Unknown'}</td>
        <td>${creator.agent || '-'}</td>
        <td>${creator.tier || '-'}</td>
        <td>${formatNumber(creator.diamonds)}</td>
        <td>${formatNumber(creator.rewards)}</td>
        <td>${creator.hours || 0}</td>
        <td>${creator.score || '-'}</td>
      `;
      tbody.appendChild(row);
    });
  });
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function loadFromJSON() {
  console.log('Loading from JSON fallback...');
  fetch('data/creators_full.json?v=' + Date.now())
    .then(r => r.json())
    .then(data => {
      creatorsData = data;
      updateDashboard(data);
    })
    .catch(err => console.error('JSON load error:', err));
}

// Auto-start when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Check if Firebase is available
  if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
    startRealtimeSync();
  } else {
    console.log('Firebase not configured, using JSON fallback');
    loadFromJSON();
  }
});

// Export for global access
window.creatorsData = creatorsData;
window.startRealtimeSync = startRealtimeSync;
window.stopRealtimeSync = stopRealtimeSync;
window.refreshData = () => {
  if (unsubscribe) {
    stopRealtimeSync();
    startRealtimeSync();
  } else {
    loadFromJSON();
  }
};