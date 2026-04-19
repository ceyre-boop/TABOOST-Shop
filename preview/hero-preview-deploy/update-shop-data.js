const fs = require('fs');
const path = require('path');

// Target directory containing the 7 Shop CSV definitions
const csvDir = process.argv[2] || 'data/shop';

console.log('Scanning CSVs in directory:', csvDir);

function parseCSVLine(line) {
    if (line.includes('\t')) return line.split('\t').map(v => v.trim());
    
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
}

function formatNumber(num) {
    if (!num || num === '' || num === 'NR' || num === '-') return 0;
    return parseFloat(num.toString().replace(/[$,]/g, '')) || 0;
}

function determineGroup(agent) {
    if (!agent) return 'Unassigned';
    const lower = agent.toLowerCase();
    if (lower.includes('carrington') && !lower.includes('+')) return 'Staff';
    if (lower.includes('bryton') || lower.includes('sven') || lower.includes('+')) return 'Agents';
    return 'Staff';
}

function getValue(values, headers, name) {
    const idx = headers.indexOf(name.toLowerCase());
    return idx >= 0 ? values[idx] : null;
}

// Global state map parsing across ALL CSV documents
const creatorsMap = new Map();

if (!fs.existsSync(csvDir)) {
    console.warn(`⚠️ Directory ${csvDir} not found, generating empty dataset`);
    fs.mkdirSync(csvDir, { recursive: true });
    // Write an empty array payload below to unbreak UI rendering if nothing is found
} else {
    const files = fs.readdirSync(csvDir).filter(f => f.toLowerCase().endsWith('.csv'));
    
    if (files.length === 0) {
        console.warn(`⚠️ No CSVs found in ${csvDir}, generating empty dataset`);
    } else {
        files.forEach(file => {
            console.log(`Analyzing Engine File: ${file}`);
            const filePath = path.join(csvDir, file);
            const csv = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const lines = csv.trim().split('\n');
            
            if (lines.length < 2) return;
            const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
            
            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                if (values.length < 3) continue;
                
                // Root Entity Match
                const usernameRaw = getValue(values, headers, 'User') || getValue(values, headers, 'TikTok') || getValue(values, headers, 'Name');
                if (!usernameRaw) continue;
                
                const uname = usernameRaw.toLowerCase().trim();
                
                if (!creatorsMap.has(uname)) {
                    creatorsMap.set(uname, { 
                        username: usernameRaw,
                        name: getValue(values, headers, 'Name') || usernameRaw,
                        id: creatorsMap.size + 1,
                        creatorId: 'SHOP_' + (creatorsMap.size + 1),
                        history: {},
                        badges: {}
                    });
                }
                
                const c = creatorsMap.get(uname);
                
                // Map known fields from ANY schema using permissive OR checks across column variations
                let tier = getValue(values, headers, 'Tier');
                if (tier) c.tier = formatNumber(tier);

                let accounts = getValue(values, headers, 'Accts');
                if (accounts) c.accounts = accounts;
                
                // Activity levels
                let lt = getValue(values, headers, 'L-T');
                if (lt) c.livesTotal = formatNumber(lt);
                
                let lh = getValue(values, headers, 'L-H');
                if (lh) c.livesHours = formatNumber(lh);
                
                let lm = getValue(values, headers, 'L-M');
                if (lm) c.livesMinutes = formatNumber(lm);
                
                let sv = getValue(values, headers, 'SV');
                if (sv) c.sv = formatNumber(sv);
                
                let tap = getValue(values, headers, 'TaP');
                if (tap) c.tap = formatNumber(tap);
                
                // Sales
                let sold = getValue(values, headers, 'Sold') || getValue(values, headers, '# Sold');
                if (sold) c.sold = formatNumber(sold);
                
                let tGMV = getValue(values, headers, 'Total GMV') || getValue(values, headers, 'GMV ($)');
                if (tGMV) c.totalGMV = formatNumber(tGMV);
                
                let tapGMV = getValue(values, headers, 'TaP GMV');
                if (tapGMV) c.tapGMV = formatNumber(tapGMV);
                
                let liveGMV = getValue(values, headers, 'Live GMV');
                if (liveGMV) c.liveGMV = formatNumber(liveGMV);
                
                // Goals / Pacing
                let gmvPace = getValue(values, headers, 'GMV Pace');
                if (gmvPace) c.gmvPace = formatNumber(gmvPace);

                // TAP Goals
                let tapGoalM = getValue(values, headers, 'TAP Goal M');
                if (tapGoalM) c.tapGoalM = formatNumber(tapGoalM);

                let tapGoalQ = getValue(values, headers, 'TAP Goal Q');
                if (tapGoalQ) c.tapGoalQ = formatNumber(tapGoalQ);

                let tapTQ = getValue(values, headers, 'TAP TQ');
                if (tapTQ) c.tapTotalTQ = formatNumber(tapTQ);

                let tapLQ = getValue(values, headers, 'TAP LQ');
                if (tapLQ) c.tapTotalLQ = formatNumber(tapLQ);
                
                // Earnings
                let points = getValue(values, headers, 'Points');
                if (points) c.points = formatNumber(points);
                
                let comm = getValue(values, headers, 'Avg Comm') || getValue(values, headers, 'Comm $');
                if (comm) c.commissions = formatNumber(comm);
                
                let mgr = getValue(values, headers, 'Manager');
                if (mgr) {
                    c.manager = mgr;
                    c.group = determineGroup(mgr);
                }
                
                // 3. History Sheet (Charting)
                let minus1 = getValue(values, headers, '-1 mo');
                if (minus1 !== null) {
                    c.history.m1 = formatNumber(minus1);
                    c.history.m2 = formatNumber(getValue(values, headers, '-2 mo'));
                    c.history.m3 = formatNumber(getValue(values, headers, '-3 mo'));
                    c.history.m4 = formatNumber(getValue(values, headers, '-4 mo'));
                    c.history.m5 = formatNumber(getValue(values, headers, '-5 mo'));
                    c.history.m6 = formatNumber(getValue(values, headers, '-6 mo'));
                }
                
                // Specialized Identifiers
                let rankLabel = getValue(values, headers, 'Rank Label');
                if (rankLabel) c.rankLabel = rankLabel;
                
                let detailsLabel = getValue(values, headers, 'Details Label');
                if (detailsLabel) {
                    const fName = file.toLowerCase();
                    if (fName.includes('tap')) c.badges.tapLeaderDetails = detailsLabel;
                    else if (fName.includes('live')) c.badges.liveLeaderDetails = detailsLabel;
                    else if (fName.includes('sales')) c.badges.salesLeaderDetails = detailsLabel;
                    else c.detailsLabel = detailsLabel;
                }
                
                c.lastUpdated = new Date().toISOString();
            }
        });
    }
}

const creatorsArray = Array.from(creatorsMap.values());

// Generate js/shop-data.js dependency payload
function compileDataFile(crts) {
    const timestamp = new Date().toISOString();
    let output = '// Taboost Agency - Complete Shop Data Pipeline (Multi-Sheet Merge)\n';
    output += '// Generated: ' + timestamp + '\n';
    output += '// Total Mapped: ' + crts.length + ' unique shop creators\n\n';
    output += 'const allShopData = ' + JSON.stringify(crts, null, 2) + ';\n\n';
    
    output += `
class ShopDataService {
    constructor() {
        this.creators = allShopData;
        this.lastFetch = new Date();
    }
    
    async loadFromCSV() {
        return this.creators;
    }

    getAllCreators() {
        return this.creators;
    }
    
    getUniqueManagers() {
        const managers = new Set();
        this.creators.forEach(c => {
            if (c.manager) c.manager.split('+').forEach(m => managers.add(m.trim()));
        });
        return Array.from(managers).sort();
    }
}

const shopDataService = new ShopDataService();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopDataService, shopDataService };
}
`;
    return output;
}

fs.writeFileSync('js/shop-data.js', compileDataFile(creatorsArray));
console.log('✅ Pipeline Compiled! Updated js/shop-data.js with', creatorsArray.length, 'unique shops combined from', csvDir);
