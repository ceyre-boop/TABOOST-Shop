# Process 6-month creator data into historical trends for charts
import csv
import json
from collections import defaultdict

# Read the combined CSV
creators = defaultdict(list)

with open('creator_history.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        username = row.get('TikTok', '').strip()
        month = row.get('MonthNum', '1')
        if username:
            creators[username].append(row)

# Process each creator's history
history_data = []

for username, months in creators.items():
    # Sort by month
    months_sorted = sorted(months, key=lambda x: int(x.get('MonthNum', 1)))
    
    diamonds_history = []
    for m in months_sorted:
        # Find the diamonds column (might have emoji)
        diamonds_val = None
        for key in m.keys():
            if 'diamond' in key.lower() or '💎' in key:
                diamonds_val = m[key]
                break
        
        if not diamonds_val:
            # Try to find by position (usually column 19)
            keys = list(m.keys())
            if len(keys) > 19:
                diamonds_val = m[keys[19]]
        
        if diamonds_val:
            # Clean the value
            clean_val = str(diamonds_val).replace(',', '').replace('"', '').strip()
            try:
                diamonds_history.append(int(clean_val))
            except:
                diamonds_history.append(0)
        else:
            diamonds_history.append(0)
    
    # Only include if we have 6 months
    if len(diamonds_history) == 6:
        # Calculate growth rates
        growth_rates = [0]
        for i in range(1, 6):
            if diamonds_history[i-1] > 0:
                growth = round(((diamonds_history[i] - diamonds_history[i-1]) / diamonds_history[i-1]) * 100, 1)
                growth_rates.append(growth)
            else:
                growth_rates.append(0)
        
        history_data.append({
            'username': username,
            'diamondsHistory': diamonds_history,
            'growthRates': growth_rates
        })

# Save as JSON
with open('creator_trends.json', 'w') as f:
    json.dump(history_data, f, indent=2)

print(f"Created trends for {len(history_data)} creators")
