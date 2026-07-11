/**
 * build-product-data.js
 *
 * Local build script - ports update_discovery_data.py
 * Reads data/shop/{tap-links,tap-products,product-images}.csv/json -> writes js/product-data.js
 *
 * Run: node build-product-data.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const csvDir = process.argv[2] || 'data/shop';
const outputFile = path.join(__dirname, 'js', 'product-data.js');
const indexFile = path.join(__dirname, 'index.html');

console.log(`Scanning CSVs in directory: ${csvDir}`);

// -- CSV PARSER --------------------------------------------------------------
function parseCSV(content) {
    let text = content;
    if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
    }
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(field);
            field = '';
        } else if (ch === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += ch;
        }
    }

    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    if (rows.length === 0) return [];
    const headers = rows[0];
    const dictRows = [];

    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i];
        if (cols.length === 0) continue;
        const record = {};
        for (let j = 0; j < headers.length; j++) {
            record[headers[j]] = cols[j] === undefined ? '' : cols[j];
        }
        dictRows.push(record);
    }

    return dictRows;
}

function readCSV(filename) {
    const csvPath = path.join(csvDir, filename);
    if (!fs.existsSync(csvPath)) {
        console.log(`Warning: ${filename} not found.`);
        return [];
    }
    return parseCSV(fs.readFileSync(csvPath, 'utf8'));
}

function get(row, key, defaultValue = '') {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
    return defaultValue;
}

function strip(value) {
    return String(value === undefined || value === null ? '' : value).trim();
}

// -- PYTHON-COMPATIBLE PARSING ----------------------------------------------
function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year, month) {
    return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] || 0;
}

function makeDateParts(year, month, day) {
    if (year < 1 || year > 9999) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > daysInMonth(year, month)) return null;
    const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, iso };
}

function tryDateFormats(value) {
    let m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
        const year = Number(m[3]);
        return makeDateParts(year, Number(m[1]), Number(m[2]));
    }

    m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (m) {
        const yy = Number(m[3]);
        const year = yy <= 68 ? 2000 + yy : 1900 + yy;
        return makeDateParts(year, Number(m[1]), Number(m[2]));
    }

    m = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
        return makeDateParts(Number(m[1]), Number(m[2]), Number(m[3]));
    }

    return null;
}

function parseSheetDate(rawValue) {
    const value = strip(rawValue);
    if (!value) return null;

    const parsed = tryDateFormats(value);
    if (parsed) return parsed;

    const dateOnly = value.split(/[ T]/)[0];
    return tryDateFormats(dateOnly);
}

function dateOrdinal(parts) {
    return Number(`${String(parts.year).padStart(4, '0')}${String(parts.month).padStart(2, '0')}${String(parts.day).padStart(2, '0')}`);
}

function todayParts() {
    const now = new Date();
    return makeDateParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function parsePythonInt(rawValue, fallback) {
    const value = strip(rawValue);
    if (!/^[+-]?\d+(?:_\d+)*$/.test(value)) return fallback;
    const normalized = value.replace(/_/g, '');
    const numberValue = Number(normalized);
    return Number.isSafeInteger(numberValue) ? numberValue : fallback;
}

function parsePythonFloatToInt(rawValue, fallback) {
    const value = strip(rawValue) || '0';
    const digitPart = '\\d(?:_?\\d)*';
    const decimalPattern = `(?:${digitPart}(?:\\.${digitPart})?|${digitPart}\\.|\\.${digitPart})`;
    const exponentPattern = `(?:[eE][+-]?${digitPart})?`;
    const re = new RegExp(`^[+-]?${decimalPattern}${exponentPattern}$`);
    if (!re.test(value)) return fallback;
    const numberValue = Number(value.replace(/_/g, ''));
    if (!Number.isFinite(numberValue)) return fallback;
    return numberValue < 0 ? Math.ceil(numberValue) : Math.floor(numberValue);
}

// -- CATEGORY INFERENCE ------------------------------------------------------
const CATEGORY_KEYWORDS = {
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
};

function inferCategory(productName, shopName = '') {
    const text = `${productName} ${shopName}`.toLowerCase();
    let bestCat = 'Other';
    let bestScore = 0;

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        let score = 0;
        for (const kw of keywords) {
            if (text.includes(kw)) {
                score += kw.length;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestCat = cat;
        }
    }

    return bestCat;
}

function generateImageSearchUrl() {
    return '';
}

function jsonDumps(value) {
    return JSON.stringify(value, null, 2).replace(/[^\x00-\x7f]/g, ch => {
        let escaped = '';
        for (let i = 0; i < ch.length; i++) {
            escaped += `\\u${ch.charCodeAt(i).toString(16).padStart(4, '0')}`;
        }
        return escaped;
    });
}

// -- 1. LOAD CAMPAIGN LINKS MAP ---------------------------------------------
const linksMap = new Map();
const today = todayParts();
let expiredLinksSkipped = 0;
const linksRows = readCSV('tap-links.csv');

for (const row of linksRows) {
    const cid = strip(get(row, 'CAMPAIGN ID'));
    const endDate = parseSheetDate(get(row, 'End Date'));
    if (endDate && dateOrdinal(endDate) < dateOrdinal(today)) {
        expiredLinksSkipped++;
        continue;
    }

    let link = strip(get(row, 'Link'));
    if (link.startsWith('https://www.tiktok.com/@https://')) {
        link = 'https://' + link.split('https://www.tiktok.com/@https://')[1];
    }
    const priority = strip(get(row, 'PRIORITY'));
    const startDate = parseSheetDate(get(row, 'Start Date'));

    if (cid && link) {
        linksMap.set(cid, {
            link,
            priority,
            name: strip(get(row, 'Name')),
            startDate: startDate ? startDate.iso : ''
        });
    }
}

console.log(`Active campaign links loaded: ${linksMap.size} (expired filtered: ${expiredLinksSkipped})`);

// -- 1B. LOAD IMAGE CACHE -----------------------------------------------------
const imageCacheFile = path.join(csvDir, 'product-images.json');
let imageCache = {};
if (fs.existsSync(imageCacheFile)) {
    imageCache = JSON.parse(fs.readFileSync(imageCacheFile, 'utf8'));
    const loaded = Object.values(imageCache).filter(Boolean).length;
    console.log(`Loaded ${loaded}/${Object.keys(imageCache).length} product images from cache`);
} else {
    console.log(`No image cache found at ${imageCacheFile} - run fetch_product_images.py first`);
}

// -- 2. LOAD PRODUCTS AND DE-DUPLICATE ---------------------------------------
const productsRows = readCSV('tap-products.csv');

const allProducts = [];
const allCampaigns = [];
const seenNames = new Map();
const nameCampaigns = new Map();
const categoryCounts = {};

for (const row of productsRows) {
    const pid = strip(get(row, 'Product ID'));
    if (!pid) continue;

    const name = strip(get(row, 'Product Name'));
    if (!name) continue;

    const cid = strip(get(row, 'Campaign ID'));

    const linkInfo = linksMap.get(cid) || {};
    const productLink = linkInfo.link || '#';
    if (productLink === '#') continue;
    const isPriority = true;

    const nameKeyForCampaign = name.toLowerCase().trim();
    if (!nameCampaigns.has(nameKeyForCampaign)) {
        nameCampaigns.set(nameKeyForCampaign, new Set());
    }
    nameCampaigns.get(nameKeyForCampaign).add(cid);

    const comm = strip(get(row, '%')) || strip(strip(get(row, 'Total Commission Rate')).split('\n')[0]);

    const vsText = strip(get(row, 'VS'));

    const ranknum = parsePythonInt(get(row, 'Rank', 99), 99);

    const scorenum = parsePythonFloatToInt(strip(String(get(row, 'Rating', '0'))) || '0', 0);

    let price = strip(get(row, 'Sale Price'));
    if (!price) {
        price = '-';
    } else if (!price.startsWith('$')) {
        price = '$' + price;
    }

    const sold = strip(get(row, 'Items Sold')) || '0';

    const rawCat = strip(get(row, 'Category'));
    let category;
    if (!rawCat || rawCat === '~~~') {
        category = inferCategory(name, get(row, 'Shop Name'));
    } else {
        category = rawCat;
    }

    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    const cachedImg = imageCache[pid] || '';
    const imageUrl = cachedImg ? cachedImg : generateImageSearchUrl(name, category);

    const nameKey = name.toLowerCase().trim();
    if (seenNames.has(nameKey)) {
        const existing = seenNames.get(nameKey);
        if (isPriority && (existing.link || '#') === '#') {
            seenNames.set(nameKey, null);
        } else if (!isPriority && (existing.link || '#') !== '#') {
            continue;
        } else if (ranknum >= (existing.rank === undefined ? 99 : existing.rank)) {
            continue;
        } else {
            seenNames.set(nameKey, null);
        }
    }

    const item = {
        id: pid,
        name,
        creator: strip(get(row, 'Shop Name')) || 'Unknown Shop',
        price: price || '$0',
        commission: comm || '0%',
        vsText,
        category,
        type: isPriority ? 'campaign' : 'product',
        image: imageUrl,
        link: productLink,
        rank: ranknum,
        sold,
        isAI: false,
        score: scorenum,
        campaignId: cid,
        campaignName: linkInfo.name || ''
    };

    seenNames.set(nameKey, item);
    allProducts.push(item);

    const priorityVal = strip(linkInfo.priority || '').toLowerCase();
    if (isPriority && (['1', 'high', 'y', 'yes', 'true', ''].includes(priorityVal) || ranknum <= 3)) {
        allCampaigns.push(item);
    }
}

if (!allProducts.length && !allCampaigns.length) {
    allProducts.push({
        id: 'fallback',
        name: 'Waiting for Data Push',
        creator: 'TABOOST System',
        price: '$0',
        commission: '0%',
        category: 'System',
        type: 'product',
        image: 'images/taboost-genie.jpg',
        link: '#',
        rank: 99,
        sold: '0',
        isAI: false
    });
}

for (const item of allProducts) {
    const nk = item.name.toLowerCase().trim();
    const cids = nameCampaigns.get(nk);
    item.campaignIds = cids ? [...cids].sort() : (item.campaignId ? [item.campaignId] : []);
}

const tapCampaigns = [];
for (const [cid, info] of linksMap.entries()) {
    const members = allProducts.filter(item => item.campaignIds.includes(cid));
    if (!members.length) continue;

    let img = '';
    for (const member of members) {
        if (String(member.image || '').startsWith('http')) {
            img = member.image;
            break;
        }
    }

    const isFeatured = strip(info.priority || '').toLowerCase() === '- featured -';
    tapCampaigns.push({
        id: cid,
        name: info.name || '',
        priority: info.priority || '',
        link: info.link || '#',
        productCount: members.length,
        image: img,
        featured: isFeatured,
        startDate: info.startDate || ''
    });
}

tapCampaigns.sort((a, b) => {
    const featuredDelta = (a.featured ? 0 : 1) - (b.featured ? 0 : 1);
    if (featuredDelta !== 0) return featuredDelta;
    return b.productCount - a.productCount;
});

console.log(`TAP campaigns built: ${tapCampaigns.length} (${tapCampaigns.filter(c => c.featured).length} featured)`);

console.log('\nCategory Distribution:');
Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
});

// -- 3. OUTPUT TO JS ----------------------------------------------------------
const outputLines = [
    '// TABOOST Discovery Platform - Product & Campaign Data Pipeline',
    `// Generated: ${new Date().toISOString()}`,
    `// Total Products: ${allProducts.length} | Active Campaigns: ${allCampaigns.length} | TAP Campaigns: ${tapCampaigns.length}`,
    `// Unique de-duped names: ${seenNames.size}`,
    '',
    'window.PRODUCT_DATA = ' + jsonDumps(allProducts) + ';',
    '',
    'window.CAMPAIGN_DATA = ' + jsonDumps(allCampaigns) + ';',
    '',
    'window.TAP_CAMPAIGNS = ' + jsonDumps(tapCampaigns) + ';'
];

const outputBody = outputLines.join('\n');
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, outputBody, 'utf8');

const stableHashBody = outputBody.replace(/^\/\/ Generated:.*$/m, '// Generated:');
const stamp = crypto.createHash('sha1').update(stableHashBody).digest('hex').slice(0, 8);

if (fs.existsSync(indexFile)) {
    const indexHtml = fs.readFileSync(indexFile, 'utf8');
    const updatedIndex = indexHtml.replace(
        /src=(["'])js\/product-data\.js(?:\?v=[^"']*)?\1/,
        `src="js/product-data.js?v=${stamp}"`
    );
    if (updatedIndex !== indexHtml) {
        fs.writeFileSync(indexFile, updatedIndex, 'utf8');
        console.log(`Updated index.html product-data cache tag: ${stamp}`);
    } else {
        console.log('Warning: index.html product-data script tag not found.');
    }
}

console.log(`\nData Sync Complete! ${allProducts.length} products + ${allCampaigns.length} campaigns -> js/product-data.js`);
