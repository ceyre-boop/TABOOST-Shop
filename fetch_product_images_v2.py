import os
import json
import csv
import re
import requests
import sys
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
CSV_DIR = 'data/shop'
CACHE_FILE = os.path.join(CSV_DIR, 'product-images.json')
MAX_WORKERS = 10 
TIMEOUT = 10

# Load existing cache
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        try:
            image_cache = json.load(f)
        except:
            image_cache = {}
else:
    image_cache = {}

def get_product_data():
    products = []
    path = os.path.join(CSV_DIR, 'tap-products.csv')
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            pid = row.get('Product ID', '').strip()
            name = row.get('Product Name', '').strip()
            shop = row.get('Shop Name', '').strip()
            if pid and name:
                products.append({'id': pid, 'name': name, 'shop': shop})
    seen = set()
    unique = []
    for p in products:
        if p['id'] not in seen:
            seen.add(p['id'])
            unique.append(p)
    return unique

def find_image_google(product):
    """
    Search Google Images for high quality product shots.
    Tries Brand/Website first, then generic fallback.
    """
    name = product['name']
    shop = product['shop']
    
    # Priority Query String
    query = f"{shop} {name} official product photography white background"
    url = f"https://www.google.com/search?q={requests.utils.quote(query)}&tbm=isch"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            # Google Images (static version) uses a specific table/img structure
            imgs = soup.find_all('img')
            for img in imgs:
                src = img.get('src')
                # Skip the tiny logo pixels or non-image thumbnails
                if src and src.startswith('http') and 'gstatic' in src:
                    return src
    except:
        pass
    return None

def fetch_tiktok_og(pid):
    url = f'https://www.tiktok.com/view/product/{pid}'
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        r = requests.get(url, headers=headers, timeout=5)
        m = re.search(r'og:image.*?content="([^"]+)"', r.text)
        return m.group(1) if m else None
    except: return None

def process_product(p):
    pid = p['id']
    # Try Google First (Higher quality / Official Brand look)
    img = find_image_google(p)
    if not img:
        # Fallback to TikTok Shop
        img = fetch_tiktok_og(pid)
    return pid, img

def main():
    products = get_product_data()
    # Force refresh or only missing? Let's do missing + empty strings
    to_fetch = [p for p in products if p['id'] not in image_cache or not image_cache[p['id']]]
    
    print(f"📊 Total Unique Products: {len(products)}")
    print(f"🔍 Need Images for: {len(to_fetch)}")
    
    if not to_fetch:
        print("✅ Cache is already full.")
        return

    print("🚀 Fetching Premium Images...")
    
    done = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_product, p): p for p in to_fetch}
        for future in as_completed(futures):
            pid, url = future.result()
            done += 1
            if url:
                image_cache[pid] = url
            if done % 20 == 0:
                print(f"  Progress: {done}/{len(to_fetch)}")
                with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                    json.dump(image_cache, f)

    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(image_cache, f)
    print("✅ Finished tiered image sync.")

if __name__ == "__main__":
    main()
