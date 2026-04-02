#!/usr/bin/env python3
"""
Convert HISTORY CSV to creator_trends.json
Usage: python convert_history_csv.py HISTORY.csv creator_trends.json
"""

import csv
import json
import sys

def convert_history_csv_to_json(input_file, output_file):
    """
    Convert HISTORY.csv to creator_trends.json format
    
    INPUT CSV Format (HISTORY.csv):
    UID, Username, Diamonds Current, Feb, Jan, Dec, Nov, Oct, Sep, ...
    
    OUTPUT JSON Format (creator_trends.json):
    [
      {
        "username": "skylerclarkk",
        "diamondsHistory": [ Sep, Oct, Nov, Dec, Jan, Feb ],
        "growthRates": [ 0, 5.2, -2.1, 10.5, 8.3, 12.1 ]
      }
    ]
    """
    creators = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)  # Skip header
        
        for row in reader:
            if len(row) < 10:
                continue
            
            username = row[1].strip() if len(row) > 1 else None
            if not username:
                continue
            
            # Parse numbers (remove commas)
            def parse_num(val):
                if not val or val.strip() == '' or val.strip() == '-1':
                    return 0
                try:
                    return int(str(val).replace(',', '').replace('"', ''))
                except:
                    return 0
            
            # Columns: C=Current, D=Feb, E=Jan, F=Dec, G=Nov, H=Oct, I=Sep
            # Using: Current + 5 previous months (Oct, Nov, Dec, Jan, Feb)
            diamonds_current = parse_num(row[2] if len(row) > 2 else 0)
            diamonds_feb = parse_num(row[3] if len(row) > 3 else 0)
            diamonds_jan = parse_num(row[4] if len(row) > 4 else 0)
            diamonds_dec = parse_num(row[5] if len(row) > 5 else 0)
            diamonds_nov = parse_num(row[6] if len(row) > 6 else 0)
            diamonds_oct = parse_num(row[7] if len(row) > 7 else 0)
            
            # Build history: Oct → Nov → Dec → Jan → Feb → Current (oldest to newest)
            diamonds_history = [
                diamonds_oct,
                diamonds_nov,
                diamonds_dec,
                diamonds_jan,
                diamonds_feb,
                diamonds_current
            ]
            
            # Calculate growth rates
            growth_rates = []
            for i in range(6):
                if i == 0:
                    growth_rates.append(0)
                else:
                    prev = diamonds_history[i-1]
                    curr = diamonds_history[i]
                    if prev > 0:
                        growth = round(((curr - prev) / prev) * 100, 1)
                    else:
                        growth = 0
                    growth_rates.append(growth)
            
            # Parse tier data (rolling: M-Q may be blank currently)
            # K=Current, L=Feb, M=Jan, N=Dec, O=Nov, P=Oct, Q=Sep
            # Using: Current + 5 previous months (Oct, Nov, Dec, Jan, Feb)
            def parse_tier(val):
                if not val or val.strip() == '' or val.strip() == '-1':
                    return None
                try:
                    return int(val)
                except:
                    return None
            
            tier_current = parse_tier(row[10] if len(row) > 10 else None)
            tier_feb = parse_tier(row[11] if len(row) > 11 else None)
            tier_jan = parse_tier(row[12] if len(row) > 12 else None)
            tier_dec = parse_tier(row[13] if len(row) > 13 else None)
            tier_nov = parse_tier(row[14] if len(row) > 14 else None)
            tier_oct = parse_tier(row[15] if len(row) > 15 else None)
            
            # Build tier history: Oct → Nov → Dec → Jan → Feb → Current
            tier_history = [
                tier_oct,
                tier_nov,
                tier_dec,
                tier_jan,
                tier_feb,
                tier_current
            ]
            
            # Build rewards history (placeholder - to be filled from rewards data)
            # Structure: [Sep, Oct, Nov, Dec, Jan, Feb] 
            rewards_history = ["--", "--", "--", "--", "--", "--"]
            
            creators.append({
                "username": username,
                "diamondsHistory": diamonds_history,
                "growthRates": growth_rates,
                "tierHistory": tier_history,
                "tierCurrent": tier_current,
                "rewardsHistory": rewards_history
            })
    
    # Write JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(creators, f, indent=2)
    
    print(f"Converted {len(creators)} creators from {input_file} to {output_file}")
    return len(creators)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_history_csv.py <input.csv> <output.json>")
        print("Example: python convert_history_csv.py HISTORY.csv creator_trends.json")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    convert_history_csv_to_json(input_file, output_file)
