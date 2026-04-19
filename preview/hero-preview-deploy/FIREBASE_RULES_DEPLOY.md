# Firebase Security Rules Deployment

## Quick Deploy from Cloud Shell

### Step 1: Navigate to your project
```bash
cd ~
mkdir -p taboost-rules
cd taboost-rules
```

### Step 2: Create the rules file
```bash
cat > firestore.rules << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow write: if false;
    }
    
    // Roster collection
    match /roster/{username} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Signups log
    match /signups/{docId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if request.auth != null;
    }
  }
}
EOF
```

### Step 3: Deploy the rules
```bash
firebase deploy --only firestore:rules --project taboost-platform
```

Or use gcloud:
```bash
gcloud firestore firestore.rules update firestore.rules --project=taboost-platform
```

## Alternative: Deploy via Firebase Console

1. Go to: https://console.firebase.google.com/project/taboost-platform/firestore/rules
2. Click "Edit rules"
3. Paste the rules from above
4. Click "Publish"

## Test Mode Rules (For Development Only)

If you want to skip auth during testing:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **WARNING**: Never use test mode rules in production!
