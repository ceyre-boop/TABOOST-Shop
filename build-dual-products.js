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

console.log('✓ Dual product build complete!');
console.log('Ready to push: product-data-midmonth.js + product-data-monthend.js');
