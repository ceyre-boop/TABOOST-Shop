#!/usr/bin/env python3
"""
Convert REWARDS CSV to rewards JSON
Usage: python convert_rewards_csv.py Live_Data_-_Rewards.csv rewards_data.json
"""

import csv
import json
import sys

def convert_rewards_csv_to_json(input_file, output_file):
    """
    Convert Live_Data_-_Rewards.csv to rewards JSON format
    
    INPUT CSV Format (Live_Data_-_Rewards.csv):
    CID, Username, Type, Date, Plus, Minus, ...
    
    OUTPUT JSON Format (rewards_data.json):
    {
      "skylerclarkk": [
        {"type": "Monthly Award", "date": "3/2/2026", "plus": 5000, "minus": 0},
        {"type": "Gifted", "date": "3/1/2026", "plus": 0, "minus": 15000}
      ]
    }
    """
    rewards_by_user = {}
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)  # Skip header
        
        for row in reader:
            if len(row) < 6:
                continue
            
            # Columns: A=CID, B=Username, C=Type, D=Date, E=Plus, F=Minus
            cid = row[0].strip() if len(row) > 0 else None
            username = row[1].strip() if len(row) > 1 else None
            trans_type = row[2].strip() if len(row) > 2 else ''
            date = row[3].strip() if len(row) > 3 else ''
            
            if not username:
                continue
            
            # Parse numbers
            def parse_num(val):
                if not val or val.strip() == '':
                    return 0
                try:
                    return int(str(val).replace(',', '').replace('"', ''))
                except:
                    return 0
            
            plus = parse_num(row[4] if len(row) > 4 else 0)
            minus = parse_num(row[5] if len(row) > 5 else 0)
            
            # Add to user's rewards
            if username not in rewards_by_user:
                rewards_by_user[username] = []
            
            rewards_by_user[username].append({
                "cid": cid,
                "username": username,
                "type": trans_type,
                "date": date,
                "plus": plus,
                "minus": minus
            })
    
    # Count total transactions
    total_transactions = sum(len(rewards) for rewards in rewards_by_user.values())
    
    # Write JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(rewards_by_user, f, indent=2)
    
    print(f"✅ Converted {total_transactions} transactions for {len(rewards_by_user)} users from {input_file} to {output_file}")
    return len(rewards_by_user), total_transactions

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_rewards_csv.py <input.csv> <output.json>")
        print("Example: python convert_rewards_csv.py Live_Data_-_Rewards.csv rewards_data.json")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    convert_rewards_csv_to_json(input_file, output_file)
