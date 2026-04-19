/**
 * TABOOST-Shop Authentication Service
 * Handles shared password login and session persistence.
 */

const AUTH_CONFIG = {
    sharedPassword: 'taboost2025',
    sessionKey: 'shop_user',
    loginPage: 'login.html',
    defaultProfilePage: 'profile.html'
};

const authService = {
    /**
     * Attempts to log in a user by matching their name/email in the dataset.
     * @param {string} identifier - Name or Email from the CSV
     * @param {string} password - The shared password
     * @returns {Object|null} - The creator object if successful, null otherwise
     */
    login: function(identifier, password) {
        if (password !== AUTH_CONFIG.sharedPassword) {
            console.error('Auth: Invalid password');
            return null;
        }

        if (typeof allShopData === 'undefined') {
            console.error('Auth: allShopData not loaded. Ensure shop-data.js is included.');
            return null;
        }

        // Search for the user in the compiled dataset
        // Match by username (User column) or Name
        const idClean = identifier.toLowerCase().trim();
        const creator = allShopData.find(c => 
            (c.username && c.username.toLowerCase().trim() === idClean) || 
            (c.name && c.name.toLowerCase().trim() === idClean)
        );

        if (creator) {
            localStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(creator));
            return creator;
        }

        console.warn('Auth: User not found in database:', identifier);
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