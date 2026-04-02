#!/usr/bin/env node
/**
 * Pre-flight validation script for TABOOST SHOP data updates
 * Run this BEFORE uploading new CSV files
 */

const fs = require('fs');
const path = require('path');

function validateRecentOrdersCSV(filePath) {
    console.log('\n=== Validating Recent Orders CSV ===');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    const header = lines[0];
    const requiredCols = ['CID', 'Shop', 'Type', 'Date', 'Sales', 'Cost'];
    const missing = requiredCols.filter(col => !header.includes(col));
    
    if (missing.length > 0) {
        console.error('❌ MISSING COLUMNS:', missing.join(', '));
        return false;
    }
    
    const dataRows = lines.slice(1).filter(l => l.trim());
    console.log(`✅ Header OK - Found ${dataRows.length} transactions`);
    
    console.log('✅ Recent Orders CSV validation PASSED');
    return true;
}

function validateShopDailyCSV(filePath) {
    console.log('\n=== Validating Shop Daily CSV ===');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    const header = lines[0].toLowerCase();
    
    // Check critical columns exist for Shop metrics
    const criticalCols = ['name', 'user', 'total gmv', 'sold'];
    const missing = criticalCols.filter(col => !header.includes(col));
    
    if (missing.length > 0) {
        console.error('❌ MISSING CRITICAL COLUMNS:', missing.join(', '));
        return false;
    }
    
    const dataRows = lines.slice(1).filter(l => l.trim());
    console.log(`✅ Header OK - Found ${dataRows.length} shops`);
    console.log('✅ Shop Daily CSV validation PASSED');
    return true;
}

function updateCacheVersions() {
    console.log('\n=== Updating Shop Cache Versions ===');
    
    const now = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 12);
    console.log(`New cache version: ${now}`);
    
    // Update shop-dashboard.js cache for recent-orders.csv
    const dashboardJsPath = path.join(__dirname, 'js', 'shop-dashboard.js');
    if (fs.existsSync(dashboardJsPath)) {
        let dashboardContent = fs.readFileSync(dashboardJsPath, 'utf8');
        dashboardContent = dashboardContent.replace(
            /recent-orders\.csv\?v=\d+/g,
            `recent-orders.csv?v=${now}`
        );
        fs.writeFileSync(dashboardJsPath, dashboardContent);
        console.log('✅ Updated recent-orders history cache version in shop-dashboard.js');
    }
    
    // Update HTML cache versions
    const htmlPath = path.join(__dirname, 'shop-dashboard.html');
    if (fs.existsSync(htmlPath)) {
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        htmlContent = htmlContent.replace(
            /\.js\?v=\d+/g,
            `.js?v=${now}`
        );
        fs.writeFileSync(htmlPath, htmlContent);
        console.log('✅ Updated JS cache versions in shop-dashboard.html');
    }
    
    return now;
}

console.log('TABOOST SHOP Pre-Flight Validation');
console.log('===================================');

const ordersPath = process.argv[2] || 'data/recent-orders.csv';
const dailyPath = process.argv[3] || 'data/shop-live-data.csv';

let allPassed = true;

if (fs.existsSync(ordersPath)) {
    allPassed = validateRecentOrdersCSV(ordersPath) && allPassed;
} else {
    console.log('⚠️  Recent Orders CSV not found, skipping validation');
}

if (fs.existsSync(dailyPath)) {
    allPassed = validateShopDailyCSV(dailyPath) && allPassed;
} else {
    console.log('⚠️  Shop Daily CSV not found, skipping validation');
}

if (allPassed) {
    const version = updateCacheVersions();
    console.log('\n✅✅✅ ALL SHOP CHECKS PASSED - READY TO DEPLOY ✅✅✅');
    console.log(`Cache version: ${version}`);
    process.exit(0);
} else {
    console.log('\n❌❌❌ VALIDATION FAILED - DO NOT DEPLOY ❌❌❌');
    process.exit(1);
}
