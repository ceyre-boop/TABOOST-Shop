/**
 * build-dual-products.js
 * Builds both midmonth and monthend product data files
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building dual product datasets...\n');

// Build midmonth version
console.log('=== Building MIDMONTH products ===');
execSync('node build-product-data.js data/shop midmonth', { stdio: 'inherit' });

// Rename to midmonth
const productFile = 'js/product-data.js';
const midmonthFile = 'js/product-data-midmonth.js';
if (fs.existsSync(productFile)) {
    fs.copyFileSync(productFile, midmonthFile);
    console.log(`✓ Saved midmonth version to ${midmonthFile}\n`);
}

// Temporarily rename monthend products for build
console.log('=== Building MONTHEND products ===');
const suggCurrent = 'data/shop/sugg-products.csv';
const topCurrent = 'data/shop/top-products.csv';
const suggMonthend = 'data/shop/sugg-products-monthend.csv';
const topMonthend = 'data/shop/top-products-monthend.csv';

if (fs.existsSync(suggMonthend) && fs.existsSync(topMonthend)) {
    // Swap files temporarily
    fs.renameSync(suggCurrent, suggCurrent + '.bak');
    fs.renameSync(topCurrent, topCurrent + '.bak');
    fs.copyFileSync(suggMonthend, suggCurrent);
    fs.copyFileSync(topMonthend, topCurrent);

    // Build monthend version
    execSync('node build-product-data.js data/shop monthend', { stdio: 'inherit' });

    // Restore original files
    fs.unlinkSync(suggCurrent);
    fs.unlinkSync(topCurrent);
    fs.renameSync(suggCurrent + '.bak', suggCurrent);
    fs.renameSync(topCurrent + '.bak', topCurrent);

    // NOTE: do NOT copy js/product-data.js over js/product-data-monthend.js here.
    // build-product-data.js already writes js/product-data-monthend.js directly when
    // given the 'monthend' argument (see its outputFile switch), and only that path
    // emits the window.*_MONTHEND variable names index.html reads. js/product-data.js
    // still holds the MIDMONTH build from the step above, so copying it over the
    // month-end bundle silently replaced month-end data with mid-month data and
    // dropped the _MONTHEND suffix — leaving window.PRODUCT_DATA_MONTHEND undefined
    // and the storefront's month-end view empty.
    console.log('✓ Saved monthend version to js/product-data-monthend.js\n');
} else {
    console.warn('⚠ Monthend product files not found. Skipping monthend build.');
}

// Cache-bust the two script tags in index.html from a hash of the bundles.
// build-product-data.js has its own stamper, but it looks for a `product-data.js`
// tag — index.html loads the -midmonth and -monthend files instead, so that
// stamper silently no-ops ("index.html product-data script tag not found") and
// the tags sat at a stale ?v= for weeks while the bundles changed underneath.
const indexPath = 'index.html';
if (fs.existsSync(indexPath) && fs.existsSync(midmonthFile)) {
    // Hash the DATA, not the raw bytes: every bundle carries a `// Generated: <ISO>`
    // line, so hashing the file as-is produces a new ?v= on every run and makes
    // browsers re-download two ~4MB bundles that did not actually change.
    const stripGenerated = f => fs.readFileSync(f, 'utf8').replace(/^\/\/ Generated:.*$/m, '');
    const version = require('crypto').createHash('sha256')
        .update(stripGenerated(midmonthFile))
        .update(stripGenerated('js/product-data-monthend.js'))
        .digest('hex').slice(0, 8);
    const before = fs.readFileSync(indexPath, 'utf8');
    const after = before.replace(
        /(product-data-(?:midmonth|monthend)\.js\?v=)[a-f0-9]+/g,
        `$1${version}`
    );
    if (after !== before) {
        fs.writeFileSync(indexPath, after);
        console.log(`✓ Stamped index.html product bundles with ?v=${version}`);
    } else {
        console.log(`✓ index.html already at ?v=${version} (bundles unchanged)`);
    }
}

console.log('✓ Dual product build complete!');
console.log('Ready to push: product-data-midmonth.js + product-data-monthend.js');
