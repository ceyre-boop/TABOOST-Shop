# Firebase Auth Migration Guide

## Overview
This guide walks you through migrating from localStorage-based auth to Firebase Auth.

## Benefits of Firebase Auth
- ✅ Real security (not client-side)
- ✅ Cross-device login (works on phone + computer)
- ✅ Password reset emails
- ✅ Email verification
- ✅ Account lockout protection
- ✅ Audit logs
- ✅ Scales to unlimited users

## Migration Steps

### 1. Update Login Pages

Replace your login form handler with Firebase Auth:

**OLD CODE (localStorage):**
```javascript
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Check localStorage
    const storedPass = localStorage.getItem('password_' + username);
    if (password === storedPass) {
        localStorage.setItem('taboost_user', JSON.stringify({
            username: username,
            role: 'creator'
        }));
        window.location.href = 'creator-dashboard.html';
    }
});
```

**NEW CODE (Firebase):**
```javascript
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const user = await FirebaseAuth.signIn(email, password);
        
        // Redirect based on role
        if (user.role === 'admin') {
            window.location.href = 'dashboard.html';
        } else if (user.role === 'manager') {
            window.location.href = 'manager-dashboard.html';
        } else {
            window.location.href = 'creator-dashboard.html';
        }
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
});
```

### 2. Update Protected Pages

**OLD CODE:**
```javascript
const user = JSON.parse(localStorage.getItem('taboost_user'));
if (!user || user.role !== 'admin') {
    window.location.href = 'index.html';
}
```

**NEW CODE:**
```javascript
FirebaseAuth.requireAuth('admin').then(user => {
    if (!user) return; // Already redirected
    // Continue loading page
});
```

### 3. Update Signup Flow

**OLD CODE:**
```javascript
localStorage.setItem('password_' + username, password);
localStorage.setItem('taboost_user', JSON.stringify({
    username: username,
    role: 'creator'
}));
```

**NEW CODE:**
```javascript
try {
    const user = await FirebaseAuth.signUp(email, password, username);
    window.location.href = 'creator-dashboard.html';
} catch (error) {
    alert('Signup failed: ' + error.message);
}
```

### 4. Update Logout

**OLD CODE:**
```javascript
function logout() {
    localStorage.removeItem('taboost_user');
    window.location.href = 'index.html';
}
```

**NEW CODE:**
```javascript
async function logout() {
    await FirebaseAuth.signOut();
    window.location.href = 'index.html';
}
```

## Firestore Data Structure

### Collection: `users`
```javascript
{
    email: "creator@email.com",
    username: "creatorhandle",
    role: "creator", // or "admin" or "manager"
    name: "Creator Name",
    manager: "manager@email.com",
    createdAt: Timestamp,
    lastLogin: Timestamp
}
```

### Collection: `roster`
Pre-approved TikTok usernames that can sign up:
```javascript
{
    username: "creatorhandle",
    manager: "manager@email.com",
    approved: true,
    addedAt: Timestamp
}
```

### Collection: `signups`
Audit log of all signups:
```javascript
{
    username: "creatorhandle",
    email: "creator@email.com",
    uid: "firebase_auth_uid",
    timestamp: Timestamp,
    userAgent: "Mozilla/5.0..."
}
```

## Testing Checklist

- [ ] Can sign up with approved roster username
- [ ] Cannot sign up with unapproved username
- [ ] Can log in on multiple devices
- [ ] Password reset email works
- [ ] Admin can access admin dashboard
- [ ] Creator is redirected to creator dashboard
- [ ] Logout works properly
- [ ] Session persists across page refreshes
- [ ] Session expires correctly

## Troubleshooting

### "Firebase not defined"
Make sure Firebase SDK scripts are loaded before your auth code.

### "Permission denied"
Check Firestore security rules. Must be logged in to read/write.

### "User not found"
User might not exist in Firestore `users` collection. Check Firebase Console > Authentication.

### "Invalid email"
Firebase Auth requires email format. Use username@taboost.me format if needed.

## Support

Firebase Documentation: https://firebase.google.com/docs/auth
Firestore Documentation: https://firebase.google.com/docs/firestore
