// Firebase Configuration for TABOOST Platform
// Using Firebase Modular SDK v9

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc,
    addDoc,
    collection,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// User roles collection
const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    CREATOR: 'creator'
};

// Firebase Auth Helper Functions

/**
 * Sign in with email and password
 * Returns user data with role
 */
async function signInWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Get user role from Firestore (with fallback)
        let userData = null;
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            userData = userDoc.data();
        } catch (dbError) {
            console.warn('Could not read from Firestore, using Auth data:', dbError);
        }
        
        // Determine role from Firestore or default to creator
        let role = userData?.role || ROLES.CREATOR;
        
        // Admin email check (hardcoded for now until Firestore is fully set up)
        if (email.toLowerCase() === 'marco@taboost.me') {
            role = ROLES.ADMIN;
        }
        
        return {
            uid: user.uid,
            email: user.email,
            role: role,
            name: userData?.name || user.displayName || user.email.split('@')[0],
            username: userData?.username || user.displayName || null,
            manager: userData?.manager || null,
            loginTime: Date.now()
        };
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Sign up new creator
 */
async function signUpCreator(email, password, username, managerEmail = null) {
    try {
        // Check if username is in approved roster (skip if Firestore not ready)
        let rosterData = null;
        try {
            const rosterDoc = await getDoc(doc(db, 'roster', username.toLowerCase()));
            if (!rosterDoc.exists()) {
                throw new Error('Username not found in Taboost roster. Contact your manager.');
            }
            rosterData = rosterDoc.data();
        } catch (rosterError) {
            console.warn('Roster check failed, allowing signup anyway:', rosterError);
            // During setup, allow signups even if roster check fails
        }
        
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Set display name
        await updateProfile(user, { displayName: username });
        
        // Store user data in Firestore
        try {
            await setDoc(doc(db, 'users', user.uid), {
                email: email,
                username: username.toLowerCase(),
                role: ROLES.CREATOR,
                name: username,
                manager: managerEmail,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });
        } catch (dbError) {
            console.warn('Could not write to Firestore (permissions), continuing with auth:', dbError);
            // Continue - user is created in Auth even if Firestore fails
        }
        
        // Log signup (best effort)
        try {
            await addDoc(collection(db, 'signups'), {
                username: username.toLowerCase(),
                email: email,
                uid: user.uid,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent.substring(0, 100)
            });
        } catch (logError) {
            console.warn('Could not log signup:', logError);
        }
        
        return {
            uid: user.uid,
            email: email,
            role: ROLES.CREATOR,
            name: username,
            username: username.toLowerCase()
        };
    } catch (error) {
        console.error('Signup error:', error);
        throw error;
    }
}

/**
 * Sign out
 */
async function signOutUser() {
    try {
        await firebaseSignOut(auth);
        localStorage.removeItem('taboost_user');
        localStorage.removeItem('taboost_current_user');
        return true;
    } catch (error) {
        console.error('Signout error:', error);
        throw error;
    }
}

/**
 * Get current user with role
 */
async function getCurrentUser() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();
            
            if (user) {
                // Get user data from Firestore
                let userData = null;
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    userData = userDoc.data();
                } catch (e) {
                    console.warn('Could not fetch user data:', e);
                }
                
                // Check admin email
                let role = userData?.role || ROLES.CREATOR;
                if (user.email?.toLowerCase() === 'marco@taboost.me') {
                    role = ROLES.ADMIN;
                }
                
                resolve({
                    uid: user.uid,
                    email: user.email,
                    role: role,
                    name: userData?.name || user.displayName,
                    username: userData?.username || null,
                    manager: userData?.manager || null
                });
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * Check if user is authenticated and has required role
 */
async function requireAuth(requiredRole = null) {
    const user = await getCurrentUser();
    
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    
    if (requiredRole && user.role !== requiredRole) {
        // Redirect based on actual role
        if (user.role === ROLES.ADMIN) {
            window.location.href = 'dashboard.html';
        } else if (user.role === ROLES.MANAGER) {
            window.location.href = 'manager-dashboard.html';
        } else {
            window.location.href = 'creator-dashboard.html';
        }
        return null;
    }
    
    return user;
}

/**
 * Password reset
 */
async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return true;
    } catch (error) {
        console.error('Password reset error:', error);
        throw error;
    }
}

// Export for use in other files
export const FirebaseAuth = {
    signIn: signInWithEmail,
    signUp: signUpCreator,
    signOut: signOutUser,
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,
    resetPassword: resetPassword,
    ROLES: ROLES,
    auth: auth,
    db: db
};

// Also expose to window for legacy compatibility
window.FirebaseAuth = FirebaseAuth;
