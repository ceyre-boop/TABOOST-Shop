// ============================================================================
// TABOOST CSV DATA LOADER - Fetches live CSV from GitHub Pages
// ============================================================================
// Replaces hardcoded data.js with live CSV fetching
// Handles: #N/A cleaning, type conversion, caching
// ============================================================================

// Use relative path so it works everywhere (including file://)
const CSV_BASE_URL = 'data';

const CSV_LOADER = {
  cache: null,
  lastFetch: null,
  
  // Clean a value from CSV
  cleanValue(val, type = 'string', defaultVal = '') {
    if (val === null || val === undefined || val === '') return defaultVal;
    const strVal = String(val).trim();
    
    // Remove Excel error codes
    if (strVal === '#N/A' || strVal === '#VALUE!' || strVal === '#REF!' || 
        strVal === '#DIV/0!' || strVal === '#NUM!' || strVal === '#NAME?' ||
        strVal === '#NULL!' || strVal === '#ERROR!') {
      return defaultVal;
    }
    
    if (type === 'int') {
      // Remove currency symbols, commas, and quotes
      const cleaned = strVal.replace(/[$,]/g, '').replace(/"/g, '');
      const num = parseInt(cleaned, 10);
      return isNaN(num) ? (defaultVal || 0) : num;
    }
    
    if (type === 'number') {
      const cleaned = strVal.replace(/,/g, '').replace(/"/g, '').replace(/\$/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? (defaultVal || 0) : num;
    }
    
    return strVal || defaultVal;
  },
  
  // Parse CSV text to array of objects
  parseCSV(csvText) {
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    
    const headers = this.parseCSVLine(lines[0]);
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = values[idx] || '';
      });
      rows.push(row);
    }
    
    return { headers, rows };
  },
  
  // Parse a single CSV line (handles quotes)
  parseCSVLine(line) {
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
  },
  
  // Fetch CSV from GitHub Pages
  async fetchCSV(filename) {
    const url = `${CSV_BASE_URL}/${filename}?t=${Date.now()}`; // Cache buster
    console.log(`📥 Fetching ${filename}...`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.status}`);
    }
    
    return response.text();
  },
  
  // Convert CSV row to creator object
  rowToCreator(row, index, headers) {
    // Helper to get value with fallbacks - checks exact and trimmed header names
    const get = (...keys) => {
      for (const key of keys) {
        // Try exact match first
        if (row[key] !== undefined && row[key] !== '') return row[key];
        // Try trimmed match
        const trimmedKey = key.trim();
        if (row[trimmedKey] !== undefined && row[trimmedKey] !== '') return row[trimmedKey];
        // Try to find in headers (case insensitive trim)
        const headerMatch = headers.find(h => h.trim().toLowerCase() === key.toLowerCase());
        if (headerMatch && row[headerMatch] !== undefined && row[headerMatch] !== '') return row[headerMatch];
      }
      return '';
    };
    
    // Find date column dynamically (format: M/D or MM/DD)
    const dateCol = headers.find(h => /^\d{1,2}\/\d{1,2}$/.test(h));
    
    // Get username from date column or fallbacks
    let username = get(dateCol, 'TikTok', '3/1', 'Username', 'username', 'TikTok Username');
    if (!username) return null;
    
    username = String(username).toLowerCase().trim();
    
    // Find diamonds column (💎 or ?)
    const diamondsCol = headers.find(h => h.includes('💎') || h === '?');
    
    // Clean manager
    let manager = get('Agent', 'Manager', 'agent', 'manager');
    if (manager.includes('+')) manager = manager.split('+')[0].trim();
    manager = this.cleanValue(manager, 'string', 'Unassigned');
    
    return {
      id: index + 1,
      creatorId: get('Host', 'Creator ID', 'host', 'creatorId') || '',
      username: username,
      name: username,
      email: `${username}@taboost.me`,
      status: this.cleanValue(get('Status', 'status'), 'string', 'GO'),
      level: String(get('Level', 'level', 'Lvl') || '0'),
      month: String(get('Month', 'month') || ''),
      manager: manager.toUpperCase(),
      m: manager.toUpperCase(),
      claimed: false,
      score: this.cleanValue(get('Score', 'score'), 'int', 0),
      _scoreRaw: get('Score', 'score'),
      diamonds: this.cleanValue(get(diamondsCol, '💎', 'Diamonds', 'diamonds', 'Total Diamonds'), 'int', 0),
      diamondsPace: this.cleanValue(get('? Pace', 'Pace', 'pace', 'Diamonds Pace'), 'string', '0'),
      diamondsGoal: this.cleanValue(get('Diamond Goal', 'diamondsGoal', 'Goal'), 'int', 0),
      diamondsLast30: this.cleanValue(get('? Last 30', 'Last 30', 'last30', 'Last 30 Days'), 'int', 0),
      diamondsLastMonth: this.cleanValue(get('-1 Month ?', '-1 Month 💎', 'lastMonth', 'Last Month'), 'int', 0),
      diamonds2MonthsAgo: this.cleanValue(get('-2 Month ?', '-2 Month 💎', '2monthsAgo'), 'int', 0),
      hours: this.cleanValue(get('Hours', 'hours', 'Live Hours'), 'int', 0),
      hoursGoal: this.cleanValue(get('Hrs Goal', 'hoursGoal', 'Hours Goal'), 'int', 0),
      activityHoursGoal: this.cleanValue(get('Hrs Goal', 'hoursGoal', 'Hours Goal'), 'int', 0),
      hoursLeft: this.cleanValue(get('Hrs Left', 'hoursLeft'), 'string', '0'),
      validLiveDays: this.cleanValue(get('Days', 'days', 'Live Days'), 'int', 0),
      daysGoal: this.cleanValue(get('Days Goal', 'daysGoal'), 'int', 0),
      activityDaysGoal: this.cleanValue(get('Days Goal', 'daysGoal'), 'int', 0),
      daysLeft: this.cleanValue(get('Days Left', 'daysLeft'), 'string', '0'),
      tier: this.cleanValue(get('Tier', 'tier'), 'int', 0),
      tierGoal: this.cleanValue(get('Tier Goal', 'tierGoal'), 'int', 0),
      tierLeft: this.cleanValue(get('Tier Left', 'tierLeft'), 'string', '0'),
      tierStatus: this.cleanValue(get('Tier Status', 'tierStatus'), 'string', '-'),
      tierLastMonth: this.cleanValue(get('Tier Last Month', 'tierLastMonth'), 'string', '-'),
      growthPercent: 0,
      earned: this.cleanValue(get('Earned', 'earned', 'Total Earned'), 'int', 0),
      gifted: this.cleanValue(get('Gifted', 'gifted'), 'int', 0),
      running: this.cleanValue(get('Running', 'running'), 'string', '0'),
      multiply: this.cleanValue(get('Multiply', 'multiply', 'Multiplier'), 'string', '-'),
      unlocked: this.cleanValue(get('Unlocked', 'unlocked'), 'string', '0'),
      estRev: this.cleanValue(get('Est Rev', 'EstRev', 'estRev', 'Est. Revenue', 'Est Revenue', 'Est.Revenue', 'EstRevenue'), 'int', 0),
      bonus: this.cleanValue(get('Bonus', 'bonus'), 'string', '$0.00'),
      daysMonth: this.cleanValue(get('Days Month', 'daysMonth'), 'int', 0),
      hoursMonth: this.cleanValue(get('Hours Month', 'hoursMonth'), 'int', 0),
      rewardsMonth: this.cleanValue(get('Rewards', 'rewards', 'Rewards Month'), 'string', '0')
    };
    
    // Debug estRev for first few rows
    if (index < 3) {
      console.log(`DEBUG row ${index} - username: ${result.username}, estRev raw: ${get('Est Rev', 'EstRev', 'estRev')}, estRev cleaned: ${result.estRev}`);
    }
    
    return result;
  },
  
  // Main load function
  async loadFromCSV() {
    // Check cache (5 minute cache)
    if (this.cache && this.lastFetch && (Date.now() - this.lastFetch < 5 * 60 * 1000)) {
      console.log('📦 Using cached data');
      return this.cache;
    }
    
    try {
      // Try to fetch current.csv first
      let csvText;
      try {
        csvText = await this.fetchCSV('current.csv');
      } catch (e) {
        console.warn('⚠️ Could not fetch current.csv, trying live-data-current.csv');
        csvText = await this.fetchCSV('live-data-current.csv');
      }
      
      const { headers, rows } = this.parseCSV(csvText);
      console.log(`✅ Parsed ${rows.length} rows from CSV`);
      console.log('📋 Headers:', headers.slice(0, 10).join(', ') + '...');
      
      // Debug: log first row to see column mapping
      if (rows.length > 0) {
        const firstRow = rows[0];
        const dateCol = headers.find(h => /^\d{1,2}\/\d{1,2}$/.test(h));
        const username = firstRow[dateCol] || firstRow['TikTok'] || firstRow['3/22'] || 'NOT FOUND';
        
        // Find estRev column by checking multiple variations
        let estRevCol = headers.find(h => h.toLowerCase().includes('est') && (h.toLowerCase().includes('rev') || h.toLowerCase().includes('revenue')));
        const estRevVal = estRevCol ? firstRow[estRevCol] : 'COLUMN NOT FOUND';
        
        console.log('DEBUG - First row:', { username: username, estRevCol: estRevCol, estRev: estRevVal });
        console.log('DEBUG - All headers:', headers);
      }
      
      // Convert to creators
      const creators = rows
        .map((row, idx) => this.rowToCreator(row, idx, headers))
        .filter(c => c !== null && c.username); // Remove empty rows
      
      console.log(`✅ Loaded ${creators.length} creators from CSV`);
      if (creators.length > 0) {
        console.log('DEBUG - First creator estRev:', creators[0].estRev);
      }
      
      // Validate - check for #N/A
      const badValues = creators.filter(c => 
        c.manager === '#N/A' || c.multiply === '#N/A' || c.tierStatus === '#N/A'
      );
      
      if (badValues.length > 0) {
        console.warn(`⚠️ Found ${badValues.length} creators with #N/A values - cleaning...`);
        badValues.forEach(c => {
          if (c.manager === '#N/A') c.manager = 'Unassigned';
          if (c.multiply === '#N/A') c.multiply = '-';
          if (c.tierStatus === '#N/A') c.tierStatus = '-';
        });
      }
      
      // Cache results
      this.cache = creators;
      this.lastFetch = Date.now();
      
      return creators;
      
    } catch (error) {
      console.error('❌ Failed to load CSV:', error);
      // Fallback to hardcoded data if available
      if (typeof creatorsData !== 'undefined') {
        console.log('📦 Falling back to hardcoded data.js');
        return creatorsData;
      }
      throw error;
    }
  },
  
  // Get all creators
  async getAllCreators() {
    return this.loadFromCSV();
  },
  
  // Get single creator by username
  async getCreator(username) {
    const creators = await this.loadFromCSV();
    return creators.find(c => c.username === username.toLowerCase());
  },
  
  // Clear cache (force refresh)
  clearCache() {
    this.cache = null;
    this.lastFetch = null;
    console.log('🔄 Cache cleared');
  },
  
  // ============================================
  // REWARDS DATA - Separate loader for rewards.csv
  // ============================================
  rewardsCache: null,
  rewardsLastFetch: null,
  
  async loadRewards() {
    // Check cache (5 minute cache)
    if (this.rewardsCache && this.rewardsLastFetch && (Date.now() - this.rewardsLastFetch < 5 * 60 * 1000)) {
      console.log('📦 Using cached rewards');
      return this.rewardsCache;
    }
    
    try {
      const csvText = await this.fetchCSV('rewards-history.csv');
      const { headers, rows } = this.parseCSV(csvText);
      
      console.log(`✅ Parsed ${rows.length} reward rows`);
      console.log('📋 Rewards headers:', headers.join(', '));
      
      // Group rewards by username
      const rewardsByUser = {};
      
      rows.forEach(row => {
        const username = String(row['TikTok'] || row['tiktok'] || '').toLowerCase().trim();
        if (!username) return;
        
        if (!rewardsByUser[username]) {
          rewardsByUser[username] = [];
        }
        
        const plus = parseInt(String(row['Plus'] || '0').replace(/,/g, '')) || 0;
        const minus = parseInt(String(row['Minus'] || '0').replace(/,/g, '')) || 0;
        const amount = plus || minus;
        
        rewardsByUser[username].push({
          type: row['Type'] || 'Bonus',
          date: row['Date'] || '',
          amount: amount,
          description: `${row['Type'] || 'Bonus'}: ${amount.toLocaleString()}`
        });
      });
      
      console.log(`✅ Loaded rewards for ${Object.keys(rewardsByUser).length} creators`);
      
      this.rewardsCache = rewardsByUser;
      this.rewardsLastFetch = Date.now();
      
      return rewardsByUser;
      
    } catch (error) {
      console.error('❌ Failed to load rewards:', error);
      return {};
    }
  },
  
  // Get rewards for a specific creator
  async getRewardsForCreator(username) {
    const allRewards = await this.loadRewards();
    return allRewards[username.toLowerCase()] || [];
  }
};

// Backward compatibility - mimic old taboostData interface
const taboostData = {
  creators: [],
  lastUpdated: new Date().toISOString(),
  
  async loadFromCSV() {
    this.creators = await CSV_LOADER.loadFromCSV();
    this.lastUpdated = new Date().toISOString();
    return this.creators;
  },
  
  getAllCreators() {
    return this.creators;
  },
  
  getCreator(username) {
    return this.creators.find(c => c.username === username.toLowerCase());
  }
};

// Global function for manual refresh
function refreshCreatorData() {
  CSV_LOADER.clearCache();
  return taboostData.loadFromCSV();
}