/**
 * Shared config for the creator preview tool (preview.html + shop-dashboard.html) — Shop platform.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ TO ROTATE THE PASSKEY                                                 │
 * │  1. change PASSKEY below                                              │
 * │  2. bump the ?v= on the <script src="js/preview-config.js?v=..."> tag │
 * │     in BOTH preview.html and shop-dashboard.html to the same new   │
 * │     value — otherwise a browser keeps serving the cached old passkey  │
 * │  3. commit and push                                                   │
 * │ Every already-unlocked session is then revoked immediately: a session │
 * │ is stamped with a fingerprint of the passkey that created it, and     │
 * │ shop-dashboard.html rejects any stamp that doesn't match the       │
 * │ current one. No waiting for the 12h expiry.                           │
 * │                                                                       │
 * │ If the two ?v= values ever drift apart, the pages disagree and access │
 * │ is DENIED rather than granted — safe direction, but it looks like     │
 * │ "the preview stopped working", so keep them identical.                │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * This passkey is NOT a secret — it ships in public page source and anyone can
 * read it. It keeps the tool tidy and out of the way; it is not a security
 * boundary. Preview mode renders only js/shop-data.js, which is already served
 * publicly and unauthenticated, and is blocked from every Firestore write
 * (window.__tapFirestore.uid stays null on every preview path).
 */
(function () {
  'use strict';

  var PASSKEY = 'SHOP2026';

  // Non-cryptographic change-detector (FNV-1a). The passkey is public, so this
  // is not hiding anything — it exists purely so a rotated passkey produces a
  // different stamp and instantly invalidates old sessions.
  function fingerprint(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(36);
  }

  window.TB_PREVIEW = {
    STORAGE_KEY: 'tb_shop_preview',
    SESSION_HOURS: 12,

    matches: function (entered) { return entered === PASSKEY; },
    stamp: function () { return fingerprint(PASSKEY); },

    // True only for a session that is unexpired AND was created with the
    // passkey currently in this file. Fails closed on anything unparseable.
    valid: function () {
      try {
        var s = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null');
        if (!s || !s.exp || !s.k) return false;
        if (Date.now() >= s.exp) { this.clear(); return false; }
        if (s.k !== this.stamp()) { this.clear(); return false; }  // passkey rotated
        return true;
      } catch (e) { return false; }
    },

    open: function () {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
          k: this.stamp(),
          exp: Date.now() + this.SESSION_HOURS * 3600 * 1000
        }));
      } catch (e) {}
    },

    clear: function () {
      try { localStorage.removeItem(this.STORAGE_KEY); } catch (e) {}
    }
  };
})();
