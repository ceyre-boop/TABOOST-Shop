# Bulk Import Instructions

## Step 1: Deploy Temporary Import Rules

Run this in Cloud Shell:

```bash
cd ~/taboost-rules

cat > firestore.rules << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // TEMPORARY: Allow any authenticated user to write
    match /{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}
EOF

firebase deploy --only firestore:rules --project taboost-platform
```

## Step 2: Import Creators

1. Go to: `https://live.taboost.me/admin-import.html`
2. Log in with your admin account (marco@taboost.me)
3. Click "Import All Creators"
4. Wait for import to complete

## Step 3: Restore Secure Rules

After import is complete, run:

```bash
cd ~/taboost-rules

cat > firestore.rules << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    function isAdmin() {
      return isAuthenticated() && getUserRole() == 'admin';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && isOwner(userId);
      allow update: if isAuthenticated() 
        && isOwner(userId)
        && request.resource.data.role == resource.data.role;
      allow create: if isAuthenticated() 
        && isOwner(userId)
        && request.resource.data.role == 'creator';
      allow read: if isAdmin();
      allow create: if isAdmin();
    }
    
    // Creator roster
    match /creatorRoster/{username} {
      allow read: if true;
      allow create: if isAdmin();
      allow update: if isAuthenticated()
        && resource.data.claimed == false
        && request.resource.data.claimed == true
        && request.resource.data.uid == request.auth.uid;
      allow delete: if isAdmin();
    }
    
    // Creator data
    match /creators/{cid} {
      allow read: if isAuthenticated() 
        && resource.data.uid == request.auth.uid;
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
    
    // Admin collection
    match /admins/{adminId} {
      allow read: if isAuthenticated() && request.auth.uid == adminId;
      allow read: if isAdmin();
    }
    
    // Signup audit log
    match /signups/{docId} {
      allow create: if isAuthenticated();
      allow read: if isAdmin();
    }
  }
}
EOF

firebase deploy --only firestore:rules --project taboost-platform
```

## Alternative: Import via Cloud Shell (More Reliable)

If the web import fails, use this Node.js script in Cloud Shell:

```bash
# Install Firebase Admin SDK
npm install firebase-admin

# Create import script
cat > import-creators.js << 'EOF'
const admin = require('firebase-admin');

// Initialize with service account
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'taboost-platform'
});

const db = admin.firestore();

const creators = [
  // Paste the creators array here from bulk-import-creators.js
];

async function importAll() {
  const batch = db.batch();
  let count = 0;
  
  for (const creator of creators) {
    const ref = db.collection('creatorRoster').doc(creator.username.toLowerCase());
    batch.set(ref, {
      cid: creator.cid,
      tiktokUsername: creator.username.toLowerCase(),
      claimed: creator.claimed || false,
      manager: creator.manager.toUpperCase(),
      importedAt: new Date()
    });
    count++;
  }
  
  await batch.commit();
  console.log(`✅ Imported ${count} creators!`);
}

importAll().catch(console.error);
EOF

# Run the import
node import-creators.js
```

## Important!

⚠️ **Always restore secure rules after importing!**

The temporary rules allow any authenticated user to write to any collection. This is ONLY for the import process.
