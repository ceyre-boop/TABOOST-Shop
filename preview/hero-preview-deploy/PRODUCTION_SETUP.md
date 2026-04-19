# TABOOST Firebase Production Setup Guide

## Overview
This guide sets up a secure, production-ready Firebase authentication system for TABOOST.

## Architecture

```
┌─────────────────────────────────────────┐
│  Firebase Auth                          │
│  - Email/password authentication        │
│  - Password resets                      │
│  - Session management                   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Firestore Database                     │
│                                         │
│  users/{uid}        - User accounts     │
│  creatorRoster/{username} - Approved    │
│  creators/{cid}     - Performance data  │
│  admins/{uid}       - Admin access      │
│  signups/{id}       - Audit log         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Security Rules                         │
│  - Users only access own data           │
│  - Admins isolated from creators        │
│  - No role escalation possible          │
└─────────────────────────────────────────┘
```

## Setup Steps

### 1. Firebase Console Setup

#### Enable Authentication
1. Go to: https://console.firebase.google.com/project/taboost-platform/authentication
2. Click "Get started"
3. Enable "Email/Password" provider
4. Save

#### Create Firestore Database
1. Go to: https://console.firebase.google.com/project/taboost-platform/firestore
2. Click "Create database"
3. Choose "Production mode" (or start in test mode for setup)
4. Select location: `us-central`
5. Enable

#### Add Authorized Domains
1. Go to: https://console.firebase.google.com/project/taboost-platform/authentication/settings
2. Under "Authorized domains", add:
   - `live.taboost.me` ⬅️ CRITICAL
   - `taboost.me`
   - `ceyre-boop.github.io`
3. Save

### 2. Deploy Security Rules

In Cloud Shell:

```bash
cd ~/taboost-rules

# Create production rules file
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
      allow read: if isAdmin();
      allow create: if isAdmin();
    }
    
    // Creator roster
    match /creatorRoster/{username} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Creator data
    match /creators/{cid} {
      allow read: if isAuthenticated() 
        && resource.data.uid == request.auth.uid;
      allow read, write: if isAdmin();
    }
    
    // Admin collection
    match /admins/{adminId} {
      allow read: if isAuthenticated() && request.auth.uid == adminId;
      allow read: if isAdmin();
    }
    
    // Signup log
    match /signups/{docId} {
      allow create: if isAuthenticated();
      allow read: if isAdmin();
    }
  }
}
EOF

# Deploy
firebase deploy --only firestore:rules --project taboost-platform
```

### 3. Create Admin User

#### Step 1: Create Authentication User
1. Go to: https://console.firebase.google.com/project/taboost-platform/authentication/users
2. Click "Add user"
3. Email: `marco@taboost.me`
4. Password: (create strong password, save it!)
5. Click "Add user"
6. **Copy the UID** that appears (e.g., `XjD4aZVLhKVio5QTYEIcCbY0v0g2`)

#### Step 2: Add to Firestore
1. Go to: https://console.firebase.google.com/project/taboost-platform/firestore
2. Click "Start collection"
3. Collection ID: `users`
4. Document ID: (paste the UID from Step 1)
5. Add fields:
   - `email` (string): "marco@taboost.me"
   - `role` (string): "admin"
   - `name` (string): "Marco"

#### Step 3: Add to Admin Collection
1. Create collection: `admins`
2. Document ID: (same UID)
3. Add fields:
   - `email` (string): "marco@taboost.me"
   - `role` (string): "admin"

### 4. Import Creator Roster

#### From Google Sheets to Firestore

For each creator in your roster:

1. Go to: https://console.firebase.google.com/project/taboost-platform/firestore
2. Collection: `creatorRoster`
3. Document ID: (TikTok username, lowercase)
4. Fields:
   - `cid` (string): "C2041" (from your sheet)
   - `tiktokUsername` (string): "skylerclarkk"
   - `claimed` (boolean): false
   - `manager` (string): "carrington" (optional)

Example document:
```json
{
  "cid": "C2041",
  "tiktokUsername": "skylerclarkk",
  "claimed": false,
  "manager": "carrington"
}
```

#### Bulk Import via Script (if many creators)

```javascript
// Use Firebase Admin SDK or Firestore REST API
const creators = [
  { cid: "C2041", username: "skylerclarkk", manager: "carrington" },
  { cid: "C2042", username: "samanthasingsit", manager: "carrington" },
  // ... more
];

creators.forEach(async (creator) => {
  await db.collection('creatorRoster').doc(creator.username).set({
    cid: creator.cid,
    tiktokUsername: creator.username,
    claimed: false,
    manager: creator.manager
  });
});
```

### 5. Import Creator Performance Data

For each creator, create a document in `creators` collection:

```json
{
  "uid": "(Firebase UID after they claim)",
  "cid": "C2041",
  "username": "skylerclarkk",
  "diamonds": 1064591,
  "diamondsGoal": 3000000,
  "hours": 17,
  "hoursGoal": 20,
  "validLiveDays": 7,
  "daysGoal": 8,
  "tier": 6,
  "score": 81,
  "manager": "carrington"
}
```

Note: `uid` field will be populated when creator claims their account.

### 6. Test the Flow

#### Test Signup
1. Go to: `https://live.taboost.me/signup.html`
2. Enter TikTok username from roster
3. Verify it finds the CID
4. Enter email and password
5. Submit
6. Should show success and redirect to login

#### Test Login
1. Go to: `https://live.taboost.me/firebase-login.html`
2. Enter email and password
3. Should redirect to creator dashboard
4. Verify correct data loads

#### Test Admin Login
1. Login as marco@taboost.me
2. Should redirect to admin dashboard
3. Verify you can see all creators

### 7. Files Deployed

| File | Purpose |
|------|---------|
| `signup.html` | New creators claim their account |
| `firebase-login.html` | Login for existing users |
| `creator-dashboard.html` | Creator view (personal data only) |
| `dashboard.html` | Admin view (all data) |
| `firestore-production.rules` | Security rules |

### 8. Security Features

✅ **Creators can only see their own data**
- Firestore rules verify `request.auth.uid` matches document
- No cross-account access possible

✅ **Admin isolation**
- Admin data in separate collection
- Admins can't be impersonated

✅ **No role escalation**
- Users cannot change their own role
- Role changes only by admin

✅ **Roster verification**
- Only pre-approved TikTok usernames can create accounts
- Prevents random signups

### 9. Troubleshooting

#### "Missing or insufficient permissions"
- Firestore rules not deployed
- Run: `firebase deploy --only firestore:rules --project taboost-platform`

#### "User not found"
- Creator not in roster
- Add to `creatorRoster` collection first

#### Redirects to wrong dashboard
- Check `users/{uid}` document has correct `role` field
- Admin should have `role: "admin"`
- Creators should have `role: "creator"`

#### Can't claim account
- Verify `claimed: false` in roster
- Check username matches exactly (case sensitive)

### 10. Next Steps

1. ✅ Complete setup above
2. ✅ Test with one creator
3. ✅ Import all creators to roster
4. ✅ Import all creator data
5. ✅ Set `uid` fields when creators claim accounts
6. ✅ Share signup link with creators
7. ✅ Monitor signups in Firestore

---

## Support

Firebase Docs: https://firebase.google.com/docs
Firestore Rules: https://firebase.google.com/docs/firestore/security/get-started
