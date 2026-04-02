#!/usr/bin/env python3
"""
Fetch real product images from TikTok Shop og:image meta tags.
Stores results in data/product-images.json for use by update_discovery_data.py
"""
import os
import json
import csv
import re
import urllib.request
import time
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

csv_dir = sys.argv[1] if len(sys.argv) > 1 else 'data'
CACHE_FILE = os.path.join(csv_dir, 'product-images.json')
MAX_WORKERS = 5  # Concurrent requests
TIMEOUT = 8

# Load existing cache
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, 'r') as f:
        image_cache = json.load(f)
    print(f"📦 Loaded {len(image_cache)} cached images")
else:
    image_cache = {}

# Get all product IDs from CSV
products = []
with open(os.path.join(csv_dir, 'tap-products.csv'), 'r', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        pid = row.get('Product ID', '').strip()
        name = row.get('Product Name', '').strip()
        if pid and name:
            products.append({'id': pid, 'name': name})

# De-duplicate by product ID
seen = set()
unique_products = []
for p in products:
    if p['id'] not in seen:
        seen.add(p['id'])
        unique_products.append(p)

# Filter out already-cached
to_fetch = [p for p in unique_products if p['id'] not in image_cache]
print(f"📋 Total unique products: {len(unique_products)}")
print(f"🔍 Need to fetch: {len(to_fetch)}")

def fetch_og_image(product):
    """Fetch og:image from TikTok product page."""
    pid = product['id']
    url = f'https://www.tiktok.com/view/product/{pid}'
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            # Find og:image
            match = re.search(r'og:image.*?content="([^"]+)"', html)
            if match:
                img_url = match.group(1)
                # Ensure it's a valid image URL
                if img_url.startswith('http') and ('ttcdn' in img_url or 'tiktok' in img_url):
                    return pid, img_url
            return pid, None
    except Exception as e:
        return pid, None

# Batch fetch with progress
if to_fetch:
    print(f"\n🚀 Fetching images ({MAX_WORKERS} concurrent)...")
    fetched = 0
    failed = 0
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(fetch_og_image, p): p for p in to_fetch}
        
        for future in as_completed(futures):
            pid, img_url = future.result()
            fetched += 1
            
            if img_url:
                image_cache[pid] = img_url
            else:
                failed += 1
                image_cache[pid] = ''  # Mark as attempted
            
            # Progress every 50
            if fetched % 50 == 0:
                print(f"  Progress: {fetched}/{len(to_fetch)} ({failed} failed)")
                # Save intermediate
                with open(CACHE_FILE, 'w') as f:
                    json.dump(image_cache, f)
    
    # Final save
    with open(CACHE_FILE, 'w') as f:
        json.dump(image_cache, f)
    
    print(f"\n✅ Done! Fetched {fetched} images ({failed} failed)")

# Stats
total = len(image_cache)
with_img = sum(1 for v in image_cache.values() if v)
print(f"\n📊 Image Cache: {with_img}/{total} products have images ({(with_img/total*100):.1f}%)")
