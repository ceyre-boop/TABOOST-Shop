#!/usr/bin/env node
/**
 * Stamp the ?v= cache-bust tag on every <script src="js/shop-data.js"> reference.
 *
 * Why this exists: the rebuild workflow regenerates js/shop-data.js, but the HTML
 * kept pointing at an old ?v= value. Browsers and the CDN key their cache on that
 * URL, so a freshly rebuilt data file was never actually fetched — the dashboard
 * showed stale numbers even though the server had current data. (2026-08-17: the
 * site served Aug 13 figures for hours after Aug 16 data had landed.)
 *
 * The stamp is a content hash, not a timestamp, so it only changes when the data
 * actually changes — reruns stay no-ops instead of churning commits. Mirrors the
 * approach build-product-data.js already uses for js/product-data.js.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataFile = path.join(__dirname, 'js', 'shop-data.js');

if (!fs.existsSync(dataFile)) {
    console.error('❌ js/shop-data.js not found — run build-shop-data.js first.');
    process.exit(1);
}

// Exclude the "Generated:" timestamp line so an unchanged dataset hashes the same
// on every run. Without this the stamp would churn on every workflow execution.
const body = fs.readFileSync(dataFile, 'utf8');
const stableBody = body.replace(/^\/\/ Generated:.*$/m, '// Generated:');
const stamp = crypto.createHash('sha1').update(stableBody).digest('hex').slice(0, 8);

// Every page that loads shop-data.js. shop-creator-dashboard.html was stuck on an
// April stamp for months precisely because only shop-dashboard.html was maintained.
const targets = ['shop-dashboard.html', 'shop-creator-dashboard.html'];

let changed = 0;
let matched = 0;

for (const name of targets) {
    const file = path.join(__dirname, name);
    if (!fs.existsSync(file)) {
        console.log(`⏭️  ${name} not present — skipping`);
        continue;
    }

    const html = fs.readFileSync(file, 'utf8');
    const pattern = /src=(["'])js\/shop-data\.js(?:\?v=[^"']*)?\1/g;

    if (!pattern.test(html)) {
        console.log(`⚠️  ${name}: no js/shop-data.js script tag found`);
        continue;
    }
    matched++;

    const updated = html.replace(pattern, `src="js/shop-data.js?v=${stamp}"`);
    if (updated !== html) {
        fs.writeFileSync(file, updated, 'utf8');
        console.log(`✅ ${name} → shop-data.js?v=${stamp}`);
        changed++;
    } else {
        console.log(`✓  ${name} already at ${stamp}`);
    }
}

// A rebuild that stamps nothing means the script tags moved or were renamed; that
// would silently reintroduce the stale-cache bug, so fail loudly instead.
if (matched === 0) {
    console.error('❌ No shop-data.js script tags found in any target page.');
    process.exit(1);
}

console.log(`\nCache stamp: ${stamp} (${changed} file(s) updated)`);
