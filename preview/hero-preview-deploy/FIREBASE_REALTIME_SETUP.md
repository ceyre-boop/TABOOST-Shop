# Firebase Real-time Setup for TABOOST Dashboard

## Quick Start

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Create Project"
3. Name it "taboost-dashboard" (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create"

### 2. Enable Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create Database"
3. Start in "Test Mode" (we'll secure it later)
4. Choose location closest to your users (us-central1 for US)

### 3. Get Firebase Config
1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click "</>" to add a web app
4. Name it "taboost-dashboard"
5. Copy the config object (you'll need apiKey, authDomain, projectId, etc.)

### 4. Update Dashboard
1. Open `js/firebase-realtime.js`
2. Replace `firebaseConfig` with your actual config from step 3
3. Save

### 5. Set Up Google Sheets Sync
1. Open your Google Sheet with creator data
2. Extensions → Apps Script
3. Delete any existing code
4. Copy contents from `scripts/google-apps-script-sync.js`
5. Replace `FIREBASE_URL` and `FIREBASE_SECRET`:
   - FIREBASE_URL: `https://your-project-default-rtdb.firebaseio.com`
   - FIREBASE_SECRET: Get from Firebase Console → Settings → Service Accounts → Database Secrets
6. Save the script
7. Click "Run" → "syncSheetToFirebase" to test
8. If it works, run "createSyncTrigger" to set up hourly auto-sync

### 6. Update Dashboard HTML
Add these lines to your `dashboard.html` before `</body>`:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

<!-- Real-time sync -->
<script src="js/firebase-realtime.js"></script>
```

### 7. Test It
1. Open dashboard.html in browser
2. Open browser console (F12)
3. You should see: "Starting Firebase real-time sync..."
4. Data should update automatically when Google Sheet changes

## Troubleshooting

**"Firebase not configured" error**
- Make sure you replaced the firebaseConfig with your actual values

**Data not updating**
- Check browser console for errors
- Verify the Google Apps Script ran successfully
- Check Firebase Console → Database to see if data was written

**403 Forbidden errors**
- Your Firebase database rules might be blocking access
- Go to Firebase Console → Firestore Database → Rules
- Temporarily set to `allow read, write: if true;` for testing

## Security (Do This Before Production!)

1. Update Firestore Rules to restrict access:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /creators/{creator} {
      allow read: if request.auth != null;
      allow write: if false; // Only server writes
    }
  }
}
```

2. Enable Firebase Authentication for your dashboard
3. Update Google Apps Script to use a service account instead of database secret