#!/usr/bin/env python3
"""
HISTORY CSV to JSON Converter
Converts HISTORY.csv to creator_trends.json format for the dashboard
"""

import csv
import json
import sys

def convert_history_to_json(csv_file, json_file):
    """Convert HISTORY CSV to creator_trends.json format"""
    
    creators = []
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)  # Skip header row
        
        for row in reader:
            if len(row) < 10:
                continue
                
            username = row[1].strip()  # Column B = Username
            if not username:
                continue
            
            # Parse diamond values (remove commas)
            def parse_num(val):
                if not val or val == '' or val == '-1':
                    return 0
                try:
                    return int(str(val).replace(',', '').replace('"', ''))
                except:
                    return 0
            
            # Diamonds: C=Current, D=Feb, E=Jan, F=Dec, G=Nov, H=Oct, I=Sep
            # We need: Sep, Oct, Nov, Dec, Jan, Feb (oldest to newest)
            diamonds_current = parse_num(row[2])   # C
            diamonds_feb = parse_num(row[3])       # D
            diamonds_jan = parse_num(row[4])       # E
            diamonds_dec = parse_num(row[5])       # F
            diamonds_nov = parse_num(row[6])       # G
            diamonds_oct = parse_num(row[7])       # H
            diamonds_sep = parse_num(row[8])       # I
            
            # Build history array (oldest to newest)
            diamonds_history = [
                diamonds_sep,
                diamonds_oct,
                diamonds_nov,
                diamonds_dec,
                diamonds_jan,
                diamonds_feb
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
                        growth_rates.append(growth)
                    else:
                        growth_rates.append(0)
            
            creators.append({
                "username": username,
                "diamondsHistory": diamonds_history,
                "growthRates": growth_rates
            })
    
    # Write JSON file
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(creators, f, indent=2)
    
    print(f"✅ Converted {len(creators)} creators to {json_file}")
    return creators

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_history.py <input.csv> <output.json>")
        print("Example: python convert_history.py HISTORY.csv creator_trends.json")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    convert_history_to_json(input_file, output_file)
