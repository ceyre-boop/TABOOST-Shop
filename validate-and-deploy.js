#!/usr/bin/env node
/**
 * Pre-flight validation script for TABOOST data updates
 * Run this BEFORE uploading new CSV files
 */

const fs = require('fs');
const path = require('path');

function validateRewardsCSV(filePath) {
    console.log('\n=== Validating Rewards CSV ===');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    // Check header
    const header = lines[0];
    const requiredCols = ['CID', 'TikTok', 'Type', 'Date', 'Plus', 'Minus'];
    const missing = requiredCols.filter(col => !header.includes(col));
    
    if (missing.length > 0) {
        console.error('❌ MISSING COLUMNS:', missing.join(', '));
        return false;
    }
    
    // Check data rows
    const dataRows = lines.slice(1).filter(l => l.trim());
    console.log(`✅ Header OK - Found ${dataRows.length} transactions`);
    
    // Sample check
    const sample = dataRows[0].split(',');
    if (sample.length < 6) {
        console.error('❌ Data rows have wrong column count');
        return false;
    }
    
    console.log('✅ Rewards CSV validation PASSED');
    return true;
}

function validateDailyCSV(filePath) {
    console.log('\n=== Validating Daily CSV ===');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    const header = lines[0].split(',');
    
    // Check critical columns exist
    const criticalCols = ['Host', 'Level', 'Score', 'Earned', 'Unlocked'];
    const headerStr = header.join(',');
    const missing = criticalCols.filter(col => !headerStr.toLowerCase().includes(col.toLowerCase()));
    
    if (missing.length > 0) {
        console.error('❌ MISSING CRITICAL COLUMNS:', missing.join(', '));
        return false;
    }
    
    // Check data
    const dataRows = lines.slice(1).filter(l => l.trim());
    console.log(`✅ Header OK - Found ${dataRows.length} creators`);
    
    // Check skylerclarkk exists
    const hasSkyler = dataRows.some(row => row.toLowerCase().includes('skylerclarkk'));
    if (!hasSkyler) {
        console.warn('⚠️  skylerclarkk not found in data');
    } else {
        console.log('✅ skylerclarkk found in data');
    }
    
    console.log('✅ Daily CSV validation PASSED');
    return true;
}

function updateCacheVersions() {
    console.log('\n=== Updating Cache Versions ===');
    
    const now = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 12);
    console.log(`New cache version: ${now}`);
    
    // Update creator-dashboard.js rewards cache version
    const dashboardPath = path.join(__dirname, 'js', 'creator-dashboard.js');
    let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Replace old cache version with new one
    dashboardContent = dashboardContent.replace(
        /rewards-history\.csv\?v=\d+/g,
        `rewards-history.csv?v=${now}`
    );
    
    fs.writeFileSync(dashboardPath, dashboardContent);
    console.log('✅ Updated rewards-history cache version in creator-dashboard.js');
    
    // Update HTML cache versions
    const htmlPath = path.join(__dirname, 'creator-dashboard.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    htmlContent = htmlContent.replace(
        /\.js\?v=\d+/g,
        `.js?v=${now}`
    );
    
    fs.writeFileSync(htmlPath, htmlContent);
    console.log('✅ Updated JS cache versions in creator-dashboard.html');
    
    return now;
}

// Main execution
console.log('TABOOST Pre-Flight Validation');
console.log('==============================');

const rewardsPath = process.argv[2] || 'data/rewards-history.csv';
const dailyPath = process.argv[3] || 'data/live-data-current.csv';

let allPassed = true;

if (fs.existsSync(rewardsPath)) {
    allPassed = validateRewardsCSV(rewardsPath) && allPassed;
} else {
    console.log('⚠️  Rewards CSV not found, skipping validation');
}

if (fs.existsSync(dailyPath)) {
    allPassed = validateDailyCSV(dailyPath) && allPassed;
} else {
    console.log('⚠️  Daily CSV not found, skipping validation');
}

if (allPassed) {
    const version = updateCacheVersions();
    console.log('\n✅✅✅ ALL CHECKS PASSED - READY TO DEPLOY ✅✅✅');
    console.log(`Cache version: ${version}`);
    process.exit(0);
} else {
    console.log('\n❌❌❌ VALIDATION FAILED - DO NOT DEPLOY ❌❌❌');
    process.exit(1);
}
