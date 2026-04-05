import csv
import json
import os
import sys
from datetime import datetime

# Paths
BASE_DIR = "/Users/taboost/Documents/TABOOST- SHOP/taboost-shop-app/TABOOST_Platfrom-main"
HISTORY_CSV = os.path.join(BASE_DIR, "data/history.csv")
CURRENT_CSV = os.path.join(BASE_DIR, "data/current.csv")
OUTPUT_JSON = os.path.join(BASE_DIR, "data/creator_trends.json")

def clean_num(val):
    if not val: return 0
    try:
        clean = str(val).replace('$', '').replace(',', '').replace('"', '').strip()
        if not clean: return 0
        return float(clean)
    except:
        return 0

def format_month_label(header):
    """Convert 'Oct 2025' or '3/31' to 'Oct' or 'Mar'"""
    h = header.strip()
    if not h: return "Month"
    
    # Try literal month names
    for m_full, m_short in [
        ('January', 'Jan'), ('February', 'Feb'), ('March', 'Mar'), ('April', 'Apr'), 
        ('May', 'May'), ('June', 'Jun'), ('July', 'Jul'), ('August', 'Aug'),
        ('September', 'Sep'), ('October', 'Oct'), ('November', 'Nov'), ('December', 'Dec')
    ]:
        if m_full in h or m_short in h:
            return m_short
            
    # Try date formats like 3/31
    if '/' in h:
        try:
            parts = h.split('/')
            if len(parts) >= 2:
                month_idx = int(parts[0])
                month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                if 1 <= month_idx <= 12:
                    return month_names[month_idx - 1]
        except:
            pass
            
    return h

def refresh():
    print("🚀 Starting Unified Data Refresh...")
    
    # 1. Load History
    if not os.path.exists(HISTORY_CSV):
        print(f"❌ Error: {HISTORY_CSV} not found.")
        return

    with open(HISTORY_CSV, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        headers = next(reader)
        history_rows = list(reader)

    # Detect history labels (indices 3-8 usually - Feb descending back to Sep)
    raw_labels = headers[3:9] 
    clean_labels = [format_month_label(l) for l in raw_labels]
    
    print(f"📊 Found History Labels: {clean_labels}")

    # 2. Load Current Data
    current_data = {}
    current_month_label = "Current"
    if os.path.exists(CURRENT_CSV):
        with open(CURRENT_CSV, 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            headers_current = next(reader)
            
            # Detect the month label from header index 2 (e.g. 3/31)
            raw_current_label = headers_current[2] if len(headers_current) > 2 else "Current"
            current_month_label = format_month_label(raw_current_label)
            
            # Re-open for data mapping
            f.seek(0)
            dict_reader = csv.DictReader(f)
            for row in dict_reader:
                host = row.get('Host') or row.get('Name') or row.get('') or ""
                if host:
                    current_data[host.lower().strip()] = row
    
    print(f"🕒 Current Data Snapshot: {current_month_label}")

    # 3. Process Trends
    creators_trends = {}
    
    for row in history_rows:
        if not row or len(row) < 17: continue
        username = row[1].lower().strip()
        if not username: continue
        
        # Diamonds and history month headers
        history_month_headers = headers[3:9]
        clean_labels = [format_month_label(h) for h in history_month_headers]
        
        # Pull history (Feb back to Sep)
        d_hist = [clean_num(x) for x in row[3:9]]
        t_hist = [clean_num(x) for x in row[11:17]]
        rev_hist = [clean_num(x) for x in row[27:33]] # Rewards section actually
        # Look for REVENUE section header and indices
        # row[35:41] = REVENUE, row[43:49] = BONUS
        est_rev_hist = [clean_num(x) for x in row[35:41]]
        bonus_hist = [clean_num(x) for x in row[43:49]]
        
        # Get Current Snapshot from current.csv
        c_row = current_data.get(username, {})
        d_curr = clean_num(c_row.get('💎') or c_row.get('Diamonds') or row[2])
        t_curr = clean_num(c_row.get('Tier') or row[10]) 
        rev_curr = clean_num(c_row.get('Est Rev') or c_row.get('Revenue') or row[34])
        bonus_curr = clean_num(c_row.get('Bonus') or row[42])
        
        # Reverse all to be Chronological (Sep -> Feb -> Current)
        full_d = d_hist[::-1] + [d_curr]
        full_t = t_hist[::-1] + [t_curr]
        full_rev = rev_hist[::-1] + [rev_curr]
        full_bonus = bonus_hist[::-1] + [bonus_curr]
        
        # Final set of labels (Sep, Oct, Nov, Dec, Jan, Feb, Mar)
        final_labels = clean_labels[::-1] + [current_month_label]
        
        creators_trends[username] = {
            "username": username,
            "diamondsHistory": full_d,
            "tierHistory": full_t,
            "diamondsCurrent": d_curr,
            "revenueHistory": full_rev,
            "revenueCurrent": rev_curr,
            "bonusHistory": full_bonus,
            "bonusCurrent": bonus_curr,
            "labels": final_labels,
            "growthRates": [0] * len(full_d)
        }

    # 4. Save
    output = {
        "meta": {
            "labels": clean_labels, 
            "historyLabels": clean_labels[::-1] + [current_month_label],
            "currentLabel": current_month_label
        },
        "creators": list(creators_trends.values())
    }

    with open(OUTPUT_JSON, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"✅ Refresh Complete! Generated {len(creators_trends)} creator trends.")
    print(f"📅 Historical Window: {clean_labels[::-1][0]} to {current_month_label}")

if __name__ == "__main__":
    refresh()
