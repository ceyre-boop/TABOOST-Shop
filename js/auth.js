/**
 * TABOOST-Shop Authentication Service
 * Handles shared password login and session persistence.
 */

// RETIRED 2026-08-31: this file used to hold a single shared password that logged
// anyone in as any creator in shop-data.js. It is public source, so the password was
// public too. Sign-in now happens only in shop-login.html via Firebase Auth.
// What remains here is session *reading* for the legacy profile.html view; there is
// deliberately no login() any more.
const AUTH_CONFIG = {
    sessionKey: 'shop_user',
    loginPage: 'shop-login.html',
    defaultProfilePage: 'profile.html'
};

const authService = {
    /**
     * Removed. Sign-in is Firebase Auth via shop-login.html only.
     * Kept as a hard failure so any forgotten caller breaks loudly at the login
     * step rather than silently re-enabling shared-password access.
     */
    login: function() {
        console.error('authService.login() is retired. Use shop-login.html (Firebase Auth).');
        window.location.replace(AUTH_CONFIG.loginPage);
        return null;
    },

    /**
     * Removes the current session.
     */
    logout: function() {
        localStorage.removeItem(AUTH_CONFIG.sessionKey);
        window.location.href = AUTH_CONFIG.loginPage;
    },

    /**
     * Returns the currently logged-in user object.
     */
    getCurrentUser: function() {
        const session = localStorage.getItem(AUTH_CONFIG.sessionKey);
        return session ? JSON.parse(session) : null;
    },

    /**
     * Protects a page by redirecting to login if no session exists.
     */
    protectPage: function() {
        if (!this.getCurrentUser()) {
            window.location.href = AUTH_CONFIG.loginPage;
        }
    },

    /**
     * Redirects to the profile page if already logged in.
     */
    checkLoggedIn: function() {
        const user = this.getCurrentUser();
        if (user) {
            window.location.href = `${AUTH_CONFIG.defaultProfilePage}?id=${user.creatorId || user.id}`;
        }
    }
};

// Auto-protect pages if they have the 'protected' attribute on <body>
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.hasAttribute('data-protected')) {
        authService.protectPage();
    }
});