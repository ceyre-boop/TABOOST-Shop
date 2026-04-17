import os
import json
import csv
import sys
import re
import hashlib
from datetime import datetime

# Accept data directory as argument, default to data/shop/ (where Google Sheets sync writes)
csv_dir = sys.argv[1] if len(sys.argv) > 1 else 'data/shop'
OUTPUT_FILE = 'js/product-data.js'

print(f"Scanning CSVs in directory: {csv_dir}")

def read_csv(filename):
    path = os.path.join(csv_dir, filename)
    if not os.path.exists(path):
        print(f"Warning: {filename} not found.")
        return []
    with open(path, 'r', encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))

# ─── Category inference for products marked with ~~~ ───
CATEGORY_KEYWORDS = {
    'Beauty & Personal Care': [
        'mascara', 'lipstick', 'lip', 'foundation', 'concealer', 'blush', 'serum',
        'moisturizer', 'cream', 'cleanser', 'sunscreen', 'skincare', 'makeup', 'beauty',
        'eyeshadow', 'bronzer', 'primer', 'toner', 'face wash', 'lotion', 'scrub',
        'retinol', 'vitamin c', 'hyaluronic', 'collagen', 'niacinamide', 'spf',
        'eyeliner', 'brow', 'lash', 'nail', 'perfume', 'fragrance', 'cologne',
        'shampoo', 'conditioner', 'hair oil', 'hair mask', 'derma', 'dermaplaning',
        'razor', 'wax', 'peel', 'facial', 'face mask', 'eye cream', 'body wash',
        'deodorant', 'toothpaste', 'whitening', 'self tan', 'acne', 'skin',
        'cosmetic', 'powder', 'contour', 'highlighter', 'setting spray', 'too faced',
        'tarte', 'nyx', 'maybelline', 'olay', 'cerave', 'neutrogena', 'drunk elephant'
    ],
    'Health': [
        'supplement', 'vitamin', 'probiotic', 'protein', 'collagen peptide',
        'gummy', 'gummies', 'capsule', 'omega', 'magnesium', 'zinc', 'iron',
        'melatonin', 'sleep', 'energy', 'immunity', 'digest', 'gut', 'detox',
        'wellness', 'health', 'cbd', 'hemp', 'ashwagandha', 'turmeric', 'elderberry',
        'electrolyte', 'hydration', 'fiber', 'weight loss', 'fat burner', 'biotin',
        'prenatal', 'postnatal', 'fertility', 'blood pressure', 'cholesterol',
        'chill gummies', 'unwind', 'curb'
    ],
    'Phones & Electronics': [
        'earbuds', 'headphone', 'headset', 'speaker', 'charger', 'cable', 'usb',
        'bluetooth', 'wireless', 'phone case', 'screen protector', 'power bank',
        'webcam', 'camera', 'microphone', 'ring light', 'tripod', 'drone',
        'smartwatch', 'watch', 'fitbit', 'airpods', 'tablet', 'ipad', 'keyboard',
        'mouse', 'monitor', 'hub', 'adapter', 'hdmi', 'gaming', 'controller',
        'console', 'vr', 'jlab', 'epic', 'go air', 'jbuds', 'anker', 'belkin',
        'audio', 'sound', 'noise cancelling', 'led', 'light strip'
    ],
    'Womenswear & Underwear': [
        'dress', 'blouse', 'skirt', 'top', 'legging', 'jumpsuit', 'romper',
        'cardigan', 'sweater', 'jacket', "women's", 'bra', 'panties', 'lingerie',
        'shapewear', 'bodysuit', 'tank top', 'cami', 'maxi', 'midi', 'mini',
        'crop top', 'hoodie', 'sweatshirt', 'jogger', 'pant', 'jean', 'shorts',
        'kimono', 'wrap', 'tunic', 'blazer', 'coat', 'vest', 'scrunchie',
        'bikini', 'swimsuit', 'swimwear', 'cover up', 'pajama', 'robe', 'nightgown'
    ],
    'Sports & Outdoor': [
        'yoga', 'fitness', 'gym', 'workout', 'exercise', 'resistance band',
        'dumbbell', 'kettlebell', 'mat', 'foam roller', 'jump rope', 'pull up',
        'camping', 'tent', 'sleeping bag', 'hiking', 'backpack', 'water bottle',
        'cooler', 'grill', 'fishing', 'bicycle', 'bike', 'scooter', 'skateboard',
        'surfboard', 'kayak', 'paddle', 'golf', 'tennis', 'basketball', 'football',
        'soccer', 'baseball', 'running', 'sneaker', 'athletic', 'sport'
    ],
    'Home Supplies': [
        'trash can', 'organizer', 'storage', 'bin', 'basket', 'hook', 'hanger',
        'shelf', 'rack', 'holder', 'dispenser', 'soap', 'sponge', 'cleaner',
        'cleaning', 'mop', 'broom', 'vacuum', 'duster', 'air freshener',
        'candle', 'diffuser', 'rug', 'mat', 'towel', 'shower', 'bath',
        'laundry', 'iron', 'steamer', 'dryer', 'hamper', 'mirror', 'clock',
        'decor', 'vase', 'frame', 'pillow', 'blanket', 'throw', 'curtain'
    ],
    'Kitchenware': [
        'pot', 'pan', 'spatula', 'knife', 'cutting board', 'blender', 'mixer',
        'toaster', 'oven', 'microwave', 'air fryer', 'instant pot', 'slow cooker',
        'coffee', 'tea', 'mug', 'cup', 'plate', 'bowl', 'fork', 'spoon',
        'tupperware', 'container', 'lunch box', 'bento', 'straw', 'utensil',
        'kitchen', 'baking', 'whisk', 'colander', 'grater', 'peeler', 'can opener'
    ],
    'Furniture': [
        'chair', 'table', 'desk', 'sofa', 'couch', 'bed', 'mattress',
        'nightstand', 'dresser', 'bookshelf', 'cabinet', 'ottoman', 'bench',
        'stool', 'futon', 'recliner', 'loveseat', 'sectional', 'folding',
        'patio', 'outdoor furniture', 'picnic', 'camping chair', 'lounge'
    ],
    'Fashion Accessories': [
        'necklace', 'bracelet', 'earring', 'ring', 'watch band', 'sunglasses',
        'hat', 'cap', 'beanie', 'scarf', 'gloves', 'belt', 'wallet', 'purse',
        'handbag', 'clutch', 'tote', 'crossbody', 'chain', 'pendant', 'charm',
        'hair clip', 'headband', 'barrette', 'pin', 'brooch', 'anklet',
        'evry jewels', 'statement'
    ],
    'Food & Beverages': [
        'snack', 'candy', 'chocolate', 'cookie', 'chips', 'popcorn', 'jerky',
        'protein bar', 'granola', 'cereal', 'oatmeal', 'smoothie', 'juice',
        'soda', 'drink', 'water', 'sparkling', 'kombucha', 'matcha',
        'seasoning', 'spice', 'sauce', 'honey', 'syrup', 'jam', 'spread', 'bundle'
    ],
    'Automotive & Motorcycle': [
        'car', 'vehicle', 'auto', 'steering', 'seat cover', 'car mount',
        'dash cam', 'gps', 'tire', 'oil', 'wiper', 'car wash', 'detailing',
        'motorcycle', 'helmet', 'visor', 'cup holder', 'armrest', 'trunk'
    ],
    'Household Appliances': [
        'vacuum cleaner', 'robot vacuum', 'humidifier', 'dehumidifier',
        'air purifier', 'fan', 'heater', 'ac', 'washer', 'dryer machine',
        'dishwasher', 'garbage disposal', 'water filter', 'purifier',
        'steam mop', 'carpet cleaner', 'electric', 'appliance', 'nuderma'
    ],
    'Toys & Hobbies': [
        'toy', 'puzzle', 'lego', 'game', 'board game', 'card game',
        'figure', 'doll', 'plush', 'stuffed', 'rc', 'remote control',
        'craft', 'art', 'paint', 'draw', 'color', 'sticker', 'stamp'
    ],
    'Pet Supplies': [
        'dog', 'cat', 'pet', 'leash', 'collar', 'harness', 'bed',
        'bowl', 'feeder', 'treat', 'chew', 'toy', 'crate', 'kennel',
        'litter', 'fish', 'aquarium', 'bird', 'hamster', 'rabbit'
    ],
    'Luggage & Bags': [
        'suitcase', 'luggage', 'carry on', 'travel bag', 'duffel',
        'weekender', 'toiletry bag', 'packing cube', 'backpack',
        'travel case', 'garment bag'
    ]
}

def infer_category(product_name, shop_name=''):
    """Infer category from product name using keyword matching."""
    text = (product_name + ' ' + shop_name).lower()
    
    best_cat = 'Other'
    best_score = 0
    
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if kw in text:
                # Longer keywords are more specific = higher score
                score += len(kw)
        if score > best_score:
            best_score = score
            best_cat = cat
    
    return best_cat


# ─── Image URL generation ───
def generate_image_search_url(product_name, category):
    """Return empty string for fallback — the frontend generates placeholders client-side."""
    return ''


def parse_sheet_date(raw_value):
    """Parse common sheet date formats and return a date object or None."""
    value = (raw_value or '').strip()
    if not value:
        return None

    def try_formats(date_value):
        for fmt in ('%m/%d/%Y', '%m/%d/%y', '%Y-%m-%d'):
            try:
                return datetime.strptime(date_value, fmt).date()
            except ValueError:
                continue
        return None

    parsed = try_formats(value)
    if parsed:
        return parsed

    # Handle values with time fragments
    date_only = re.split(r'[ T]', value)[0]
    return try_formats(date_only)


# ─── 1. Load Campaign Links Map ───
# TAP-Links columns: CAMPAIGN ID (A), Name (B), Link (C), PRIORITY (D), ...
# Column C = clean affiliate URL (e.g. https://affiliate-us.tiktok.com/...)
links_map = {}
today = datetime.now().date()
expired_links_skipped = 0
links_rows = read_csv('tap-links.csv')
for row in links_rows:
    cid = row.get('CAMPAIGN ID', '').strip()
    end_date = parse_sheet_date(row.get('End Date', ''))
    if end_date and end_date < today:
        expired_links_skipped += 1
        continue

    # Column C header is 'Link' — this is the clean affiliate URL
    link = row.get('Link', '').strip()
    # Strip any malformed prefix (some rows have https://www.tiktok.com/@ prepended)
    if link.startswith('https://www.tiktok.com/@https://'):
        link = 'https://' + link.split('https://www.tiktok.com/@https://')[1]
    priority = row.get('PRIORITY', '').strip()
    if cid and link:
        links_map[cid] = {
            'link': link,
            'priority': priority
        }

print(f"🔗 Active campaign links loaded: {len(links_map)} (expired filtered: {expired_links_skipped})")

# ─── 1b. Load Image Cache (from fetch_product_images.py) ───
IMAGE_CACHE_FILE = os.path.join(csv_dir, 'product-images.json')
image_cache = {}
if os.path.exists(IMAGE_CACHE_FILE):
    with open(IMAGE_CACHE_FILE, 'r') as f:
        image_cache = json.load(f)
    print(f"🖼️  Loaded {sum(1 for v in image_cache.values() if v)}/{len(image_cache)} product images from cache")
else:
    print(f"⚠️  No image cache found at {IMAGE_CACHE_FILE} — run fetch_product_images.py first")

# ─── 2. Load Products & De-duplicate ───
products_rows = read_csv('tap-products.csv')

all_products = []
all_campaigns = []
seen_names = {}  # Track unique product names to avoid excessive dupes
category_counts = {}

for row in products_rows:
    pid = row.get('Product ID', '').strip()
    if not pid:
        continue
    
    name = row.get('Product Name', '').strip()
    if not name:
        continue
    
    # De-duplicate: keep the version with the best (lowest) rank
    cid = row.get('Campaign ID', '').strip()
    
    # Resolve Link
    link_info = links_map.get(cid, {})
    product_link = link_info.get('link', '#')
    is_priority = (product_link != '#')
    
    # Resolve Commission
    comm = row.get('Total Commission Rate', '').strip()
    if not comm:
        comm = row.get('%', '').strip()
    
    # Get Rank
    try:
        ranknum = int(row.get('Rank', 99))
    except:
        ranknum = 99
    
    # Price (Col E) - Support ranges like "$19.98-$24.98"
    price = row.get('Sale Price', '').strip()
    if not price:
        price = '-'
    elif not price.startswith('$'):
        # Only prepend $ if it doesn't already have one
        price = '$' + price
    
    # Sold
    sold = row.get('Items Sold', '').strip() or '0'
    
    # Category — infer if ~~~ or blank
    raw_cat = row.get('Category', '').strip()
    if not raw_cat or raw_cat == '~~~':
        category = infer_category(name, row.get('Shop Name', ''))
    else:
        category = raw_cat
    
    # Track categories
    category_counts[category] = category_counts.get(category, 0) + 1
    
    # Image: prefer real TikTok CDN image from cache, fallback to SVG placeholder
    cached_img = image_cache.get(pid, '')
    if cached_img:
        image_url = cached_img
    else:
        image_url = generate_image_search_url(name, category)
    
    # De-duplication: keep entry with affiliate link, or best rank
    name_key = name.lower().strip()
    if name_key in seen_names:
        existing = seen_names[name_key]
        # Prefer the one WITH an affiliate link
        if is_priority and existing.get('link', '#') == '#':
            seen_names[name_key] = None  # Will re-add below
        elif not is_priority and existing.get('link', '#') != '#':
            continue  # Skip this dupe, existing one has a link
        elif ranknum >= existing.get('rank', 99):
            continue  # Skip if rank isn't better
        else:
            seen_names[name_key] = None  # Will re-add below
    
    item = {
        'id': pid,
        'name': name,
        'creator': row.get('Shop Name', '').strip() or 'Unknown Shop',
        'price': price or '$0',
        'commission': comm or '0%',
        'category': category,
        'type': 'campaign' if is_priority else 'product',
        'image': image_url,
        'link': product_link,
        'rank': ranknum,
        'sold': sold,
        'isAI': False
    }
    
    seen_names[name_key] = item
    
    # ALL products go into the main searchable list
    all_products.append(item)
    
    # Only PRIORITY-flagged campaigns go into the featured section
    priority_val = link_info.get('priority', '').strip().lower() if link_info else ''
    if is_priority and (priority_val in ['1', 'high', 'y', 'yes', 'true', ''] or ranknum <= 3):
        all_campaigns.append(item)

# Fallback
if not all_products and not all_campaigns:
    all_products.append({
        "id": "fallback", "name": "Waiting for Data Push", "creator": "TABOOST System",
        "price": "$0", "commission": "0%", "category": "System", "type": "product",
        "image": "images/taboost-genie.jpg", "link": "#", "rank": 99, "sold": "0", "isAI": False
    })

# Print category summary
print(f"\n📊 Category Distribution:")
for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
    print(f"  {cat}: {count}")

# ─── 3. Output to JS ───
output_lines = [
    "// TABOOST Discovery Platform - Product & Campaign Data Pipeline",
    f"// Generated: {datetime.now().isoformat()}",
    f"// Total Products: {len(all_products)} | Active Campaigns: {len(all_campaigns)}",
    f"// Unique de-duped names: {len(seen_names)}",
    "",
    "window.PRODUCT_DATA = " + json.dumps(all_products, indent=2) + ";",
    "",
    "window.CAMPAIGN_DATA = " + json.dumps(all_campaigns, indent=2) + ";"
]

os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))

print(f"\n✅ Data Sync Complete! {len(all_products)} products + {len(all_campaigns)} campaigns → {OUTPUT_FILE}")
