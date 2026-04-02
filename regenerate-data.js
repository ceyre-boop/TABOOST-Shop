// Script to regenerate data.js from CSV with all columns including goals
// This ensures data.js has daysGoal (AM), hoursGoal (AN), diamondsGoal (W), etc.

const fs = require('fs');

// Read the CSV file
const csvContent = fs.readFileSync('./data/live-data-current.csv', 'utf8');
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim());

// Parse CSV line
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

function formatNumber(num) {
    if (!num || num === '' || num === 'NR') return 0;
    return parseInt(num.toString().replace(/,/g, '')) || 0;
}

const getValue = (values, name) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? values[idx] : '';
};

const creators = [];

for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 5) continue;
    
    const username = getValue(values, '3/1') || getValue(values, 'TikTok');
    if (!username) continue;
    
    creators.push({
        creatorId: getValue(values, 'Host'),
        username: username,
        group: 'Staff',
        manager: getValue(values, 'Agent') || 'carrington@taboost.me',
        joinedTime: getValue(values, 'Joined'),
        daysSinceJoining: parseInt(getValue(values, 'Days Since')) || 0,
        diamonds: formatNumber(values[19]),
        liveDuration: getValue(values, 'Live Duration'),
        validLiveDays: parseInt(getValue(values, 'Days')) || 0,
        newFollowers: formatNumber(getValue(values, 'NF')),
        liveStreams: parseInt(getValue(values, 'Days')) || 0,
        diamondsLastMonth: formatNumber(getValue(values, '-1 Month 💎')),
        hours: parseFloat(getValue(values, 'Hours')) || 0,
        graduationStatus: getValue(values, 'Status'),
        
        // Goals - columns AM, AN
        daysGoal: parseInt(getValue(values, 'Days Goal')) || 25,
        hoursGoal: parseInt(getValue(values, 'Hrs Goal')) || 80,
        
        // Diamonds Target - columns T and W
        diamondsCurrent: formatNumber(values[19]),
        diamondsGoal: formatNumber(values[22]),
        
        // Additional fields
        tier: parseInt(getValue(values, 'Tier')) || 0,
        score: parseInt(getValue(values, 'Score')) || 0
    });
}

// Write data.js
const output = `// Taboost Agency - Complete Creator Data
// Generated: ${new Date().toISOString()}
// Total: ${creators.length} creators

const allCreatorsData = ${JSON.stringify(creators, null, 0)};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { allCreatorsData };
}
`;

fs.writeFileSync('./js/data.js', output);
console.log(`Generated data.js with ${creators.length} creators`);
