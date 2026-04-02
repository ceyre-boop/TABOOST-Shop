import os
import json
import csv
import sys
from datetime import datetime

# Configuration
csv_dir = 'data'
OUTPUT_FILE = 'js/shop-data.js'
print(f"Scanning CSVs in directory: {csv_dir}")

def format_number(num):
    if not num or num == '' or num == 'NR' or num == '-' or str(num).strip() == '': return 0
    try:
        # Remove $, %, spaces, and commas
        clean = str(num).replace('$', '').replace('%', '').replace(',', '').strip()
        if not clean: return 0
        return float(clean)
    except:
        return 0

def get_value(row_dict, key):
    # Try exact match first
    if key in row_dict:
        return row_dict[key]
    
    # Try case-insensitive and stripped match
    key_lower = key.lower().strip()
    for k, v in row_dict.items():
        if k.lower().strip() == key_lower:
            return v
    return None

def read_csv(filename):
    path = os.path.join(csv_dir, filename)
    if not os.path.exists(path):
        print(f"Warning: {filename} not found.")
        return []
    # Use utf-8-sig to handle Byte Order Mark (BOM)
    with open(path, 'r', encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))

def get_last_updated_date():
    path = os.path.join(csv_dir, 'current.csv')
    if not os.path.exists(path): return None
    try:
        with open(path, 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            header = next(reader)
            # The date is usually the 3rd column (index 2) like "Mar 31"
            if len(header) > 2:
                potential_date = header[2].strip()
                # Check if it looks like a month + day
                months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                if any(month in potential_date for month in months):
                    return potential_date
    except Exception as e:
        print(f"Error extracting date: {e}")
    return None

def clean_rank(rank_str):
    if not rank_str: return '--'
    # marco often has things like "#5 | 290 pts" or "#5 ? 290 pts"
    # we just want the #5
    val = str(rank_str).strip()
    # Split by common separators: |, ?, bullet, space
    for sep in ['|', '?', '•', ' ']:
        if sep in val:
            val = val.split(sep)[0].strip()
            break
    return val if val else '--'

creators_map = {}

# 1. Process totals.csv (Primary Source)
totals_rows = read_csv('totals.csv')
for row in totals_rows:
    user_email = get_value(row, 'User')
    if not user_email or str(user_email).strip() == '': continue
    
    email_key = str(user_email).lower().strip()
    if email_key not in creators_map:
        creators_map[email_key] = {
            'username': user_email,
            'email': user_email,
            'name': get_value(row, 'Name') or user_email,
            'topLevel': get_value(row, 'Top Level') or 'L1',
            'accounts': [],
            'accountsHistory': [],
            'tapHistory': [],
            'points': 0
        }
    
    c = creators_map[email_key]
    # Update base metrics from totals
    c['totalGMV'] = format_number(get_value(row, ' Total GMV ') or get_value(row, 'Total GMV'))
    c['totalComm'] = format_number(get_value(row, ' Total Comm ') or get_value(row, 'Total Comm'))
    c['avgComm'] = format_number(get_value(row, 'Avg Comm'))
    c['points'] = format_number(get_value(row, 'Points'))
    # Use Level Label if available, fallback to Top Level or L1
    level_val = get_value(row, 'Level Label') or get_value(row, 'Top Level') or 'L1'
    c['topLevel'] = level_val
    c['levelLabel'] = level_val
    c['productRank'] = clean_rank(get_value(row, 'Rank') or get_value(row, 'Rank Label'))
    c['cashBonus'] = format_number(get_value(row, 'Cash Bonus') or get_value(row, 'Bonus'))
    
    # Bonus MTD / YTD (Change 2 — Cols AA/AB in spreadsheet = cols 27/28 in CSV)
    c['bonusMTD'] = format_number(get_value(row, 'Bonus MTD'))
    c['bonusYTD'] = format_number(get_value(row, 'Bonus YTD'))
    
    # TAP Goals - robust fallback for YTD/Total metrics
    c['tapLM'] = format_number(get_value(row, 'TAP LM'))
    c['tapGoalM'] = format_number(get_value(row, 'TAP Goal M'))
    c['tapLQ'] = format_number(get_value(row, 'TAP LQ'))
    c['tapGoalQ'] = format_number(get_value(row, 'TAP Goal Q'))
    c['tapTotalTQ'] = format_number(get_value(row, 'TAP TQ') or get_value(row, 'TAP Total TQ'))
    c['tapYTD'] = format_number(get_value(row, 'TAP YTD') or get_value(row, 'Total GMV') or get_value(row, ' Total GMV '))

    
    # Totals-level aggregated fields
    c['totalSV'] = format_number(get_value(row, 'SV'))
    c['totalTaP'] = format_number(get_value(row, 'TaP'))
    c['totalLS'] = format_number(get_value(row, 'LS'))
    c['totalCTR'] = format_number(get_value(row, 'CTR'))
    c['totalViews'] = format_number(get_value(row, 'Views'))
    c['totalSold'] = format_number(get_value(row, 'Sold'))
    c['tapGMV'] = format_number(get_value(row, 'TaP GMV'))
    
    c['manager'] = get_value(row, 'Manager') or 'Unassigned'
    c['joined'] = get_value(row, 'Joined') or get_value(row, 'Join Date') or ''
    c['tier'] = get_value(row, 'Tier') or ''
    c['accts'] = get_value(row, 'Accts') or '1'
    
    # Initialize achievement aggregates
    c['agg_sv'] = 0
    c['agg_tap'] = 0
    c['agg_ls'] = 0
    c['agg_views'] = 0
    c['agg_sold'] = 0
    c['agg_ctr'] = '0%'

# 2. Process current.csv (Account Breakdown & Achievement Metrics)
current_rows = read_csv('current.csv')
for row in current_rows:
    user_email = get_value(row, 'User')
    if not user_email or str(user_email).strip() == '': continue
    
    email_key = str(user_email).lower().strip()
    if email_key not in creators_map: continue
    
    c = creators_map[email_key]
    
    # Extract Achievement stats for this account/creator
    # 1. Primary: Extract directly from strictly formatted Link column
    tiktok_link = get_value(row, 'Link') or ''
    discord_val = get_value(row, 'Discord') or ''
    tiktok_handle = ''
    
    if tiktok_link and '@' in tiktok_link:
        tiktok_handle = tiktok_link.split('@')[-1].split('/')[0].split('?')[0].strip()
        
    # 2. Secondary: Fallback to Discord column (usually @handle)
    if not tiktok_handle and discord_val.startswith('@'):
        tiktok_handle = discord_val[1:].strip()
        
    # 3. Tertiary: Fallback to dynamic column keys before finally reverting to Name
    if not tiktok_handle:
        keys = list(row.keys())
        if len(keys) > 2:
            val3 = get_value(row, keys[2])
            if val3 and isinstance(val3, str) and not val3.startswith('$'):
                tiktok_handle = str(val3).strip()
                
    if not tiktok_handle or tiktok_handle == '':
        tiktok_handle = get_value(row, 'March 25') or get_value(row, 'TikTok') or get_value(row, 'Name') or 'Unknown'
        
    acc_data = {
        'handle': tiktok_handle,
        'tiktokLink': tiktok_link,
        'sv': format_number(get_value(row, 'SV')),
        'tap': format_number(get_value(row, 'TaP')),
        'tapGMV': format_number(get_value(row, 'TaP GMV')),
        'ls': format_number(get_value(row, 'LS')),
        'ctr': get_value(row, 'CTR') or '0%',
        'views': format_number(get_value(row, 'Views')),
        'sold': format_number(get_value(row, '# Sold') or get_value(row, 'Sold')),
        'bonus': format_number(get_value(row, 'Agency $') or get_value(row, '$$$')),
        'monthlyBonus': format_number(get_value(row, 'Live GMV')),
        'commAmt': format_number(get_value(row, 'Comm $'))
    }
    c['accounts'].append(acc_data)
    
    # Store aggregate/individual totals for achievements (Shop Videos, etc)
    # If multiple accounts, we sum them
    c['agg_sv'] = c.get('agg_sv', 0) + acc_data['sv']
    c['agg_tap'] = c.get('agg_tap', 0) + acc_data['tap']
    c['agg_tapGMV'] = c.get('agg_tapGMV', 0) + acc_data['tapGMV']
    c['agg_ls'] = c.get('agg_ls', 0) + acc_data['ls']
    c['agg_views'] = c.get('agg_views', 0) + acc_data['views']
    c['agg_sold'] = c.get('agg_sold', 0) + acc_data['sold']
    # Keep the max CTR across accounts as the reference
    try:
        current_ctr = float(str(acc_data['ctr']).replace('%', ''))
        old_ctr = float(str(c.get('agg_ctr', '0%')).replace('%', ''))
        if current_ctr > old_ctr:
            c['agg_ctr'] = acc_data['ctr']
    except:
        pass
    
    if not c.get('gmvPace'):
        c['gmvPace'] = format_number(get_value(row, ' GMV Pace ') or get_value(row, 'GMV Pace'))

# 2b. Post-process: Fill in totalViews and totalCTR from account aggregates
#     when totals.csv doesn't have those columns
for email_key, c in creators_map.items():
    if c.get('totalViews', 0) == 0 and c.get('agg_views', 0) > 0:
        c['totalViews'] = c['agg_views']
    if c.get('totalCTR', 0) == 0 and c.get('agg_ctr', '0%') != '0%':
        try:
            c['totalCTR'] = float(str(c['agg_ctr']).replace('%', ''))
        except:
            pass
    # Also ensure totalSold falls back to agg_sold if zero
    if c.get('totalSold', 0) == 0 and c.get('agg_sold', 0) > 0:
        c['totalSold'] = c['agg_sold']

# 2c. Second pass: supplement from data/totals.csv (has CTR, Views, Sold that data/shop/totals.csv lacks)
supplement_rows = []
try:
    supp_path = os.path.join('data', 'totals.csv')
    if os.path.exists(supp_path):
        with open(supp_path, 'r', encoding='utf-8-sig') as f:
            supplement_rows = list(csv.DictReader(f))
except:
    pass

for row in supplement_rows:
    email = get_value(row, 'User')
    if not email: continue
    email_key = str(email).lower().strip()
    if email_key not in creators_map: continue
    c = creators_map[email_key]
    # Pull CTR and Views which are missing in data/shop/totals.csv
    ctr_raw = get_value(row, 'CTR') or ''
    if ctr_raw and c.get('totalCTR', 0) == 0:
        try:
            c['totalCTR'] = float(str(ctr_raw).replace('%', '').strip())
        except:
            pass
    views_raw = format_number(get_value(row, 'Views'))
    if views_raw and views_raw > 0 and c.get('totalViews', 0) == 0:
        c['totalViews'] = views_raw
    sold_raw = format_number(get_value(row, 'Sold'))
    if sold_raw and sold_raw > 0 and c.get('totalSold', 0) == 0:
        c['totalSold'] = sold_raw
    joined_raw = get_value(row, 'Joined') or get_value(row, 'Join Date')
    if joined_raw and str(joined_raw).strip() and not c.get('joined', '').strip():
        c['joined'] = str(joined_raw).strip()

# 3. Process history.csv (Stacked Chart Data + COMM + BONUS for Earnings History)
# Use data/history.csv (33 cols: GMV 3-8, TAP 11-16, COMM 19-24, BONUS 27-32)
history_path = os.path.join('data', 'history.csv')
if os.path.exists(history_path):
    with open(history_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        try:
            headers = next(reader)
            # User requests 6 months (Feb thru Sep)
            # CSV layout (0-indexed):
            #   0=USER, 1=Handle, 2="GMV"(label), 3=Feb, 4=Jan, 5=Dec, 6=Nov, 7=Oct, 8=Sep, 9=(empty)
            #   10="TAP"(label), 11=Feb, 12=Jan, 13=Dec, 14=Nov, 15=Oct, 16=Sep, 17=(empty)
            #   18="COMM"(label), 19=Feb, 20=Jan, 21=Dec, 22=Nov, 23=Oct, 24=Sep, 25=(empty)
            #   26="BONUS"(label), 27=Feb, 28=Jan, 29=Dec, 30=Nov, 31=Oct, 32=Sep
            gmv_indices = range(3, 9)      # indices 3-8 (Feb thru Sep GMV data)
            tap_indices = range(11, 17)    # indices 11-16 (Feb thru Sep TAP data)
            comm_indices = range(19, 25)   # indices 19-24 (Feb thru Sep COMM data)
            bonus_indices = range(27, 33)  # indices 27-32 (Feb thru Sep BONUS data)
            
            for row in reader:
                if not row or len(row) < 5: continue
                email = row[0].lower().strip()
                if email in creators_map:
                    c = creators_map[email]
                    handle = row[1] # TikTok handle for this history row
                    
                    hist_entry = {
                        'handle': handle,
                        'gmv': [format_number(row[i]) if i < len(row) else 0 for i in reversed(list(gmv_indices))]
                    }
                    c['accountsHistory'].append(hist_entry)
                    
                    # Store month labels once — use GMV header columns (indices 3-8)
                    if not c.get('historyMonths'):
                        c['historyMonths'] = [headers[i] if i < len(headers) else '' for i in reversed(list(gmv_indices))]
                    
                    # Accumulate TAP history (consolidated green line)
                    acc_tap = [format_number(row[i]) for i in reversed(tap_indices)]
                    if not c.get('tapHistory'):
                        c['tapHistory'] = acc_tap
                    else:
                        for i in range(len(acc_tap)):
                            c['tapHistory'][i] += acc_tap[i]
                    
                    # Accumulate COMM history (Change 10 — Earnings History)
                    if len(row) >= 25:
                        acc_comm = [format_number(row[i]) if i < len(row) else 0 for i in reversed(comm_indices)]
                        if not c.get('commHistory'):
                            c['commHistory'] = acc_comm
                        else:
                            for i in range(len(acc_comm)):
                                c['commHistory'][i] += acc_comm[i]
                    
                    # Accumulate BONUS history (Change 10)
                    if len(row) >= 33:
                        acc_bonus = [format_number(row[i]) if i < len(row) else 0 for i in reversed(bonus_indices)]
                        if not c.get('bonusHistory'):
                            c['bonusHistory'] = acc_bonus
                        else:
                            for i in range(len(acc_bonus)):
                                c['bonusHistory'][i] += acc_bonus[i]
        except StopIteration:
            pass

# Sort for general list display but keep CSV ranks
all_creators = list(creators_map.values())
all_creators.sort(key=lambda x: x.get('points', 0), reverse=True)

# Extract manual date from primary CSV header if available
last_updated_date = get_last_updated_date()
if not last_updated_date:
    # Fallback to March 31 as hardcoded default for launch if not found
    last_updated_date = "Mar 31"

# Generate single file variable matching expected format
output_lines = [
    "// Taboost Agency - Multi-Sheet Merged Shop Data",
    f"// Generated: {datetime.now().isoformat()}",
    f"// Data Updated Through: {last_updated_date}",
    f"// Total Mapped: {len(all_creators)} unique shop creators",
    "",
    f"const shopLastUpdated = \"{last_updated_date} at 11:59 PM PT\";",
    "",
    "const allShopData = " + json.dumps(all_creators, indent=2) + ";",
    "",
    "// If running in browser vs node",
    "if (typeof window !== 'undefined') {",
    "    window.TABOOST_SHOP_DATA = allShopData;",
    "    window.SHOP_LAST_UPDATED = shopLastUpdated;",
    "}",
    "if (typeof module !== 'undefined') {",
    "    module.exports = { allShopData, shopLastUpdated };",
    "}"
]

output_path = OUTPUT_FILE
os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))

print(f"✅ Compilation Successful! Updated {output_path} with {len(all_creators)} merged shop records.")
