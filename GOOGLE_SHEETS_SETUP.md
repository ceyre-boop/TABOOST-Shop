# Google Sheets Integration Setup

## For Marco: How to Connect Live Sheet to Website

### Option 1: Publish to Web (Quick & Free)

1. **Open your Google Sheet**
   - Go to: https://docs.google.com/spreadsheets/d/1KPFMGAgqa44thN3i0-hnvfmzjzdhgMyYPX_995VWqMo/edit

2. **Publish to Web**
   - Click: **File → Share → Publish to web**
   - Select: Your data sheet (e.g., "Current Month")
   - Format: **Comma-separated values (.csv)**
   - Click: **Publish**
   - Copy the URL (looks like: `https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv`)

3. **Add URL to Website**
   - Log into the creator dashboard as admin
   - Go to: **Settings → Data Source**
   - Paste the CSV URL
   - Click: **Update Data Source**
   - Refresh the page

4. **Done!**
   - The website now pulls live data from your Google Sheet
   - Updates automatically when you edit the sheet

### Important Notes:

- **Data is read-only** - Creators can't modify your sheet through the website
- **Updates every page load** - No caching, always fresh data
- **Make sure the sheet is publicly viewable** or published
- **Keep the CSV URL private** - Don't share it publicly

### Troubleshooting:

**"Failed to load CSV" error?**
1. Check that the sheet is published (not just shared)
2. Make sure you're using the CSV format URL
3. Try opening the CSV URL in a new tab - it should download a .csv file

**Data not showing?**
1. Check the browser console (F12) for errors
2. Verify column headers match the expected format
3. Make sure the sheet has data rows

### Alternative: Direct CSV Upload

If publishing doesn't work, you can still:
1. Download CSV from Google Sheets (File → Download → CSV)
2. Replace the `data/live-data-current.csv` file in the GitHub repo
3. Changes will be live in ~2 minutes

---

## For Developers: API Integration (Option 2)

If you need authenticated access or more control:

1. Create Google Apps Script in the sheet
2. Deploy as web app with "Execute as me" access
3. Use the Apps Script URL with authentication
4. Requires OAuth setup

Contact your developer for this option.
