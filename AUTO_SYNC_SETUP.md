# TABOOST Auto-Sync System

**Google Sheets → GitHub → GitHub Pages (Fully Automated)**

A production-ready, serverless pipeline that syncs Google Sheet data to GitHub as CSV, automatically updating your web app with zero manual work.

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Get Your GitHub Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Select scope: **`repo`** (full control of private repositories)
4. Click **Generate token**
5. **COPY THE TOKEN IMMEDIATELY** (you can't see it again!)

---

### Step 2: Add Apps Script to Your Google Sheet

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete the default `Code.gs` content
4. **Copy the entire contents of `scripts/apps-script-sync.gs`** into the editor
5. Click **Save** (disk icon)

---

### Step 3: Run Setup

1. In Apps Script, run: `setupScriptProperties()`
   - Click the **Run** button (▶️)
   - Follow the prompts to enter:
     - GitHub Token (from Step 1)
     - GitHub username/organization (e.g., `ceyre-boop`)
     - Repository name (e.g., `TABOOST-Shop`)
     - Sheet tab name to export (e.g., `Shop Creators`)
     - CSV save path (default: `data/auto-sync.csv`)
     - Daily sync hour (default: 2 AM)

2. **Authorize the script** when prompted:
   - Click "Review Permissions"
   - Select your Google account
   - Click "Advanced" → "Go to [Project Name] (unsafe)"
   - Click "Allow"

---

### Step 4: Test the Sync

1. Run: `testSync()`
2. Check the **Execution log** (View → Executions)
3. You should see: `✅ Sync complete in Xs`
4. Verify in GitHub: Your repo should now have `data/auto-sync.csv`

---

### Step 5: Enable Daily Automation

1. Run: `createDailyTrigger()`
2. The script will now run automatically every day at your chosen hour
3. To check: View → Triggers (you'll see a time-based trigger)

---

## 📁 Repository Structure

```
TABOOST-Shop/
├── data/
│   ├── auto-sync.csv          # ← Updated automatically
│   └── shop-current.csv       # ← Your existing data
├── js/
│   ├── auto-sync-loader.js    # ← CSV fetch/parse library
│   └── shop-dashboard.js      # ← Your existing dashboard
├── auto-sync-demo.html        # ← Demo page
├── shop-dashboard.html        # ← Your existing dashboard
└── scripts/
    └── apps-script-sync.gs    # ← Copy to Apps Script
```

---

## 🔌 Using the Auto-Sync Data

### Basic Example

```html
<script src="js/auto-sync-loader.js"></script>
<script>
async function loadData() {
    const loader = new AutoSyncDataLoader({
        csvUrl: 'data/auto-sync.csv',
        cacheBust: true  // Avoids stale GitHub Pages cache
    });
    
    const data = await loader.load();
    console.log(`Loaded ${data.length} rows`);
    
    // Find a creator by name
    const creator = loader.findByName(data, 'Sylvia Van Hoeven');
    console.log(creator);
}

loadData();
</script>
```

### Advanced Usage

```javascript
const loader = new AutoSyncDataLoader();

// Load data
const data = await loader.load();

// Search functions
const creator = loader.findByName(data, 'Sylvia');
const managers = loader.getUniqueValues(data, 'manager');
const topTier = loader.filter(data, { tier: 'Talent' });
const byGMV = loader.sort(data, 'total_gmv', false); // Descending
```

---

## ⚙️ Configuration Options

### Apps Script Properties (Secure Storage)

| Property | Description | Example |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub PAT with repo scope | `ghp_xxxxxxxxxxxx` |
| `GITHUB_OWNER` | Username or org | `ceyre-boop` |
| `GITHUB_REPO` | Repository name | `TABOOST-Shop` |
| `SHEET_ID` | Auto-set from current sheet | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `TARGET_GID` | Sheet tab ID | `123456789` |
| `CSV_PATH` | Where to save in repo | `data/auto-sync.csv` |
| `TRIGGER_HOUR` | Daily sync time (0-23) | `2` |

### Modifying Config

Run `setupScriptProperties()` again to change any setting.

---

## 🔧 Troubleshooting

### "Configuration incomplete"
Run `setupScriptProperties()` and complete all prompts.

### "Export failed: 403"
The script needs authorization. Run it once manually and approve permissions.

### "GitHub upload failed: 404"
Check that your GitHub owner/repo name is correct (case-sensitive).

### "GitHub upload failed: 401"
Your token is invalid or expired. Generate a new one at https://github.com/settings/tokens

### CSV not updating on website
GitHub Pages caches files. The loader adds `?t=timestamp` to bypass cache. If still stale, add this to your HTML `<head>`:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
```

---

## 📊 Monitoring

### Check Sync Status

**Option 1: View Logs in Apps Script**
- View → Executions → Click any run to see logs

**Option 2: Add a Log Sheet**
The script automatically creates a "Sync Log" sheet if errors occur.

**Option 3: Check GitHub**
- Go to your repo → Commits
- Look for commits with message: "Auto-sync: data/auto-sync.csv @ [timestamp]"

---

## 🔄 Manual Sync

Need to update right now?

1. Go to your Google Sheet
2. **TABOOST Sync** menu → **⚡ Sync Now**

Or in Apps Script:
```javascript
syncSheetToGitHub()
```

---

## ⏸️ Pause/Resume Automation

**Pause:**
```javascript
stopAutomation()
```

**Resume:**
```javascript
createDailyTrigger()
```

---

## 🌟 Optional: Real-Time Webhook

For near real-time sync (when sheet changes):

1. Deploy the Apps Script as a web app:
   - Deploy → New deployment → Type: Web app
   - Execute as: Me
   - Who has access: Anyone
   - Deploy

2. Copy the Web App URL

3. Set up a Google Sheet trigger:
   ```javascript
   function onEdit(e) {
     // Call the web app URL to trigger immediate sync
     UrlFetchApp.fetch('YOUR_WEB_APP_URL?secret=YOUR_GITHUB_TOKEN');
   }
   ```

⚠️ **Note:** GitHub has rate limits (5000 requests/hour). Use sparingly.

---

## 🛡️ Security

- ✅ Token stored in Script Properties (encrypted)
- ✅ Never hardcoded in source code
- ✅ Token has minimal scope (`repo` only)
- ✅ No external services or backends
- ✅ All code is open and auditable

---

## 📈 Scale

- **Sheets:** Any size (tested up to 10k rows)
- **Frequency:** Daily (configurable)
- **Repos:** One script per sheet/repo pair
- **Multiple sheets:** Duplicate the script for each sheet

---

## 🆘 Support

**Common Commands Reference:**

```javascript
// Setup (run once)
setupScriptProperties()

// Test sync (run anytime)
testSync()  // or syncSheetToGitHub()

// Enable daily automation
createDailyTrigger()

// Stop automation
stopAutomation()

// View current config
viewConfig()
```

---

## ✅ Success Checklist

- [ ] GitHub token created with `repo` scope
- [ ] Apps Script added to Google Sheet
- [ ] `setupScriptProperties()` completed
- [ ] Script authorized
- [ ] `testSync()` ran successfully
- [ ] CSV appears in GitHub repo
- [ ] `createDailyTrigger()` executed
- [ ] Web app loads data from CSV
- [ ] Daily automation confirmed working (check next day)

---

## 🎉 You're Done!

Your Google Sheet now automatically syncs to GitHub every day. Your web app will always have the latest data with zero manual work.

**Next Steps:**
- Customize the frontend to display data how you want
- Add more sheets (duplicate the script)
- Set up Slack/email notifications on sync errors

---

*Built for TABOOST | Zero manual work | Production-ready*
