const fs = require('fs');

// Get CSV file path from command line or use default
const csvFilePath = process.argv[2] || 'data/day2-creators.csv';
console.log('Processing:', csvFilePath);

function parseCSVLine(line) {
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
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

const csv = fs.readFileSync(csvFilePath, 'utf8');
const lines = csv.split('\n');

const creators = [];
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = parseCSVLine(line);
    if (cols.length < 3) continue;
    
    const cid = cols[1];
    const username = cols[2];
    let manager = cols[8] || 'carrington';
    if (manager.includes('+')) manager = manager.split('+')[0].trim();
    
    if (cid && username && !username.includes('@')) {
        const claimed = username.toLowerCase() === 'skylerclarkk';
        const d = {
            id: creators.length + 1,
            creatorId: cid,
            username: username.toLowerCase(),
            name: username,
            email: username + '@taboost.me',
            status: cols[3] || 'GO',
            level: cols[4] || '0',
            month: cols[5] || '',
            manager: manager.toUpperCase(),
            m: manager.toUpperCase(),
            claimed: claimed,
            score: parseInt(cols[32]?.replace(/,/g, '')) || 0,
            diamonds: parseInt(cols[19]?.replace(/,/g, '')) || 0,
            diamondsGoal: parseInt(cols[21]?.replace(/,/g, '')) || 0,
            diamondsPace: cols[20] || '',
            diamondsLast30: parseInt(cols[27]?.replace(/,/g, '')) || 0,
            diamondsLastMonth: parseInt(cols[28]?.replace(/,/g, '')) || 0,
            diamonds2MonthsAgo: parseInt(cols[29]?.replace(/,/g, '')) || 0,
            hours: parseInt(cols[16]) || 0,
            hoursGoal: parseInt(cols[17]) || 0,
            hoursLeft: cols[18] || '',
            validLiveDays: parseInt(cols[12]) || 0,
            daysGoal: parseInt(cols[14]) || 0,
            daysLeft: cols[15] || '',
            tier: parseInt(cols[21]) || 0,
            tierGoal: parseInt(cols[22]?.replace(/,/g, '')) || 0,
            tierLeft: cols[23] || '',
            tierStatus: cols[24] || '',
            tierLastMonth: cols[25] || '',
            growthPercent: 0,
            earned: parseInt(cols[33]?.replace(/,/g, '')) || 0,
            gifted: parseInt(cols[34]?.replace(/,/g, '')) || 0,
            running: cols[35] || '',
            multiply: cols[36] || '',
            unlocked: cols[37] || '',
            daysMonth: parseInt(cols[38]) || 0,
            hoursMonth: parseInt(cols[39]) || 0,
            rewardsMonth: cols[40] || ''
        };
        creators.push(d);
    }
}

// Generate data.js content
const timestamp = new Date().toISOString();
let output = '// Taboost Agency - Complete Creator Data\n';
output += '// Generated: ' + timestamp + '\n';
output += '// Total: ' + creators.length + ' creators\n\n';
output += 'const creatorsData = ' + JSON.stringify(creators, null, 2) + ';\n\n';
output += 'const taboostData = {\n';
output += '  creators: creatorsData,\n';
output += '  lastUpdated: "' + timestamp + '",\n';
output += '  getAllCreators: function() { return this.creators; },\n';
output += '  getCreator: function(username) { return this.creators.find(c => c.username === username.toLowerCase()); },\n';
output += '  loadFromCSV: async function() { return this.creators; }\n';
output += '};';

fs.writeFileSync('js/data.js', output);
console.log('Updated js/data.js with', creators.length, 'creators');

const skyler = creators.find(c => c.username === 'skylerclarkk');
if (skyler) {
    console.log('Skyler diamonds:', skyler.diamonds);
    console.log('Skyler score:', skyler.score);
    console.log('Skyler earned:', skyler.earned);
}
