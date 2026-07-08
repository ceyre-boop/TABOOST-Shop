/**
 * tap-bonus-email.gs — Apps Script web app that emails marco@taboost.me when a
 * creator claims a TAP bonus milestone on the Shop dashboard.
 *
 * This exists because the Shop Platform is intentionally a static site with no
 * backend server (see CLAUDE.md non-negotiable #4). Google Apps Script, deployed
 * as a web app, is Google-hosted and requires no server of our own — it's the
 * same pattern already used by scripts/apps-script-sync.gs (see its doGet()).
 *
 * SETUP (one-time, in the Google account that should send these emails):
 *   1. script.google.com -> New project -> paste this file's contents in.
 *   2. Run setupTapBonusSecret() once from the Apps Script editor (▶ button) to
 *      set a shared secret in Script Properties. Pick any long random string.
 *   3. Deploy -> New deployment -> type "Web app" -> Execute as "Me" ->
 *      Who has access "Anyone" -> Deploy. Copy the resulting web app URL.
 *   4. Paste that URL into TAP_BONUS_WEBHOOK_URL in js/shop-dashboard.js, and
 *      paste the SAME secret from step 2 into TAP_BONUS_WEBHOOK_SECRET there.
 *
 * The bonus dollar amount is looked up from TIER_AMOUNTS below — it is never
 * trusted from the incoming request, so a tampered client request can name a
 * tier but can't fabricate a dollar amount.
 */

var RECIPIENT = 'marco@taboost.me';

var TIER_AMOUNTS = {
  tier1: { amount: 500, label: 'Goal 1 ($100K TAP GMV)' },
  tier2: { amount: 1000, label: 'Goal 2 ($250K TAP GMV)' },
  tier3: { amount: 1500, label: 'Goal 3 ($1M TAP GMV)' }
};

/** Run this once from the Apps Script editor to set the shared secret. */
function setupTapBonusSecret() {
  var ui = SpreadsheetApp.getUi ? null : null; // no UI available outside a bound sheet; use a prompt via Logger instead
  var secret = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('TAP_BONUS_SECRET', secret);
  Logger.log('TAP bonus shared secret set. Copy this into TAP_BONUS_WEBHOOK_SECRET in js/shop-dashboard.js:');
  Logger.log(secret);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('TAP_BONUS_SECRET');

    if (!expectedSecret || body.secret !== expectedSecret) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid secret' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var tierInfo = TIER_AMOUNTS[body.tier];
    if (!tierInfo) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown tier' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var creatorName = String(body.creatorName || 'Unknown creator');
    var subject = 'TAP Bonus Claim: ' + creatorName + ' — $' + tierInfo.amount;
    var message = [
      creatorName + ' just claimed a TAP bonus on the Shop dashboard.',
      '',
      'Tier: ' + tierInfo.label,
      'Bonus amount: $' + tierInfo.amount,
      'Claimed at: ' + new Date().toString(),
      '',
      'This is a notification only — please verify the creator\'s actual TAP GMV',
      '(Google Sheet / admin dashboard) before processing payment. Nothing in this',
      'flow server-verifies the milestone was really reached.'
    ].join('\n');

    MailApp.sendEmail(RECIPIENT, subject, message);

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'POST only' }))
    .setMimeType(ContentService.MimeType.JSON);
}
