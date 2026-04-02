/**
 * Auto-Sync CSV Loader
 * Fetches CSV from GitHub and parses to JSON
 * Includes cache-busting for GitHub Pages
 */

class AutoSyncDataLoader {
  constructor(options = {}) {
    this.csvUrl = options.csvUrl || 'data/auto-sync.csv';
    this.cacheBust = options.cacheBust !== false; // Default true
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Fetch and parse CSV with automatic retries
   */
  async load() {
    const url = this.cacheBust 
      ? `${this.csvUrl}?t=${Date.now()}` 
      : this.csvUrl;
    
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`📊 Fetching CSV (attempt ${attempt})...`);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        const data = this.parseCSV(csvText);
        
        console.log(`✅ Loaded ${data.length} rows from CSV`);
        return data;
        
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw new Error(`Failed to load CSV after ${this.retryAttempts} attempts: ${lastError.message}`);
  }

  /**
   * Parse CSV text to array of objects
   * Handles quoted fields, newlines in cells, etc.
   */
  parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    // Parse headers
    const headers = this.parseCSVLine(lines[0]);
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row = {};
      
      headers.forEach((header, index) => {
        const key = this.sanitizeKey(header);
        row[key] = this.parseValue(values[index]);
      });
      
      data.push(row);
    }
    
    return data;
  }

  /**
   * Parse a single CSV line handling quoted fields
   */
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  /**
   * Convert header to safe JavaScript key
   */
  sanitizeKey(header) {
    return header
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Parse value to appropriate type
   */
  parseValue(value) {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    
    // Remove $ and commas for numbers
    const cleanValue = value.toString().replace(/[$,\s]/g, '');
    
    // Try integer
    if (/^-?\d+$/.test(cleanValue)) {
      return parseInt(cleanValue, 10);
    }
    
    // Try float
    if (/^-?\d*\.\d+$/.test(cleanValue)) {
      return parseFloat(cleanValue);
    }
    
    // Return as string
    return value.toString().trim();
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Find creator by name (case insensitive)
   */
  findByName(data, name) {
    const searchName = name.toLowerCase().trim();
    
    // Try exact match on name field
    let match = data.find(row => 
      row.name && row.name.toLowerCase() === searchName
    );
    
    // Try partial match
    if (!match) {
      match = data.find(row => 
        row.name && row.name.toLowerCase().includes(searchName)
      );
    }
    
    // Try email/username match
    if (!match) {
      match = data.find(row => 
        row.user && row.user.toLowerCase().includes(searchName)
      );
    }
    
    return match || null;
  }

  /**
   * Get unique values from a column
   */
  getUniqueValues(data, column) {
    const values = new Set();
    data.forEach(row => {
      if (row[column]) values.add(row[column]);
    });
    return Array.from(values).sort();
  }

  /**
   * Filter data by criteria
   */
  filter(data, criteria) {
    return data.filter(row => {
      for (const [key, value] of Object.entries(criteria)) {
        if (row[key] !== value) return false;
      }
      return true;
    });
  }

  /**
   * Sort data by column
   */
  sort(data, column, ascending = true) {
    return [...data].sort((a, b) => {
      const aVal = a[column] || 0;
      const bVal = b[column] || 0;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return ascending ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (ascending) {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });
  }
}

// Global instance for easy access
const autoSyncLoader = new AutoSyncDataLoader();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutoSyncDataLoader, autoSyncLoader };
}
