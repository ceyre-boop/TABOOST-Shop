// Taboost Agency - Google Sheets Data Integration
// Fetches live data from Marco's view-only sheet

class TaboostDataService {
    constructor() {
        // Google Sheet published CSV URL - Marco needs to publish and paste URL here
        // Instructions: File → Share → Publish to web → Select sheet → CSV → Copy URL
        this.csvUrl = localStorage.getItem('taboost_sheet_url') || './data/live-data-current.csv';
        
        this.creators = [];
        this.lastFetch = null;
    }
    
    // Set the Google Sheets CSV URL
    setSheetUrl(url) {
        this.csvUrl = url;
        localStorage.setItem('taboost_sheet_url', url);
        console.log('Google Sheets URL set:', url);
    }

    // Parse CSV line handling quoted fields
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
                    i++; // Skip next quote
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

    // Format number with commas
    formatNumber(num) {
        if (!num || num === '' || num === 'NR') return 0;
        return parseInt(num.toString().replace(/,/g, '')) || 0;
    }

    // Parse the CSV data into structured objects
    parseCSVData(csvText) {
        // Handle different line endings
        const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = normalizedText.trim().split('\n');
        console.log('DEBUG - Total lines:', lines.length);
        if (lines.length < 2) {
            console.log('DEBUG - Not enough lines');
            return [];
        }

        const headers = this.parseCSVLine(lines[0]);
        console.log('DEBUG - Headers count:', headers.length);
        console.log('DEBUG - First 10 headers:', headers.slice(0, 10));
        const creators = [];

        // Debug first data row
        const firstDataRow = this.parseCSVLine(lines[1]);
        console.log('DEBUG - First data row values count:', firstDataRow.length);
        console.log('DEBUG - First data row first 5 values:', firstDataRow.slice(0, 5));

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length < 5) {
                console.log(`DEBUG - Row ${i} skipped, length:`, values.length);
                continue;
            }

            const creator = this.mapRowToCreator(headers, values);
            if (creator) {
                creators.push(creator);
            } else {
                console.log(`DEBUG - Row ${i} mapRowToCreator returned null`);
            }
        }

        console.log('DEBUG - Total creators parsed:', creators.length);
        return creators;
    }

    // Map CSV row to creator object
    mapRowToCreator(headers, values) {
        const getValue = (name) => {
            const idx = headers.indexOf(name);
            return idx >= 0 ? values[idx] : '';
        };

        // TikTok username is in column C (header '3/1' in current CSV format)
        const username = getValue('3/1') || getValue('TikTok');
        if (!username) return null;

        return {
            rank: parseInt(getValue('Rank')) || 0,
            creatorId: getValue('Host'),
            username: username,
            level: (() => { const l = getValue('Level') || values[4]; return l === '' || l === undefined || l === null ? -1 : parseInt(l); })(), // Column E - Level (0-5), -1 for blank, 0-5 for actual levels
            _levelHeader: headers.indexOf('Level'),
            _levelValue: getValue('Level'),
            _levelRaw: values[4],
            month: parseInt(getValue('Month')) || 0,
            discord: getValue('Discord'),
            // Agent/Manager field from Google Sheet
            manager: this.formatManagerName(getValue('Agent')),
            rawManager: getValue('Agent'),
            
            // Rewards data from sheet
            // Column G = Available (what they have), Column H = Cashed (what they claimed)
            rewards: {
                earned: this.formatNumber(getValue('Earned')),
                gifted: this.formatNumber(getValue('Gifted')),
                bonus: this.formatNumber(getValue('Bonus')),
                running: this.formatNumber(getValue('Running')),
                unlocked: this.formatNumber(getValue('Unlocked')),
                available: this.formatNumber(getValue('Available')),  // Column G
                cashed: this.formatNumber(getValue('Cashed'))         // Column H
            },
            
            // Reward source info (column AP = Last Label)
            lastRewardLabel: getValue('Last Label'),
            
            // Total rewards ever unlocked (column AG)
            totalUnlocked: this.formatNumber(getValue('Unlocked')),
            
            // Performance metrics - column T (19) = dY'Z, column U (20) = dY'Z Pace
            diamonds: values[19] ? this.formatNumber(values[19]) : 0,
            diamondsLast30: values[20] ? this.formatNumber(values[20]) : 0,
            _diamondsRaw: values[19],
            _levelRaw: values[4],
            growthPercent: getValue('Growth %'),
            hours: parseFloat(getValue('Hours')) || 0, // Column P = actual hours
            hoursLeft: parseFloat(getValue('Hours Left')) || 0,
            
            // Activity metrics
            liveStreams: parseInt(getValue('Days')) || 0, // Column M = actual streaming days
            validLiveDays: parseInt(getValue('Days')) || 0, // Column M = actual days streamed
            dayPace: getValue('Day Pace'),
            diamondPace: parseInt(getValue('dY\'Z Pace')) || 0, // Column U - 💎 Pace
            followers: this.formatNumber(getValue('LF')),
            tickets: getValue('Tix'),
            
            // Status & scoring
            status: getValue('Status'),
            tier: parseInt(getValue('Tier') !== '' ? getValue('Tier') : values[21]) ?? 0, // Column V - This Month's Tier (1-10)
            lastMonthTier: parseInt(getValue('Last Month Tier') !== '' ? getValue('Last Month Tier') : values[25]) ?? null, // Column Z - Last Month's Tier
            twoMonthsAgoTier: parseInt(getValue('-2 Level') !== '' ? getValue('-2 Level') : null) ?? null, // -2 Level column
            
            // Column T = Current Diamonds, Column W = Tier Goal (diamond goal)
            diamondsCurrent: values[19] ? this.formatNumber(values[19]) : 0, // Column T
            diamondsGoal: values[22] ? this.formatNumber(values[22]) : 0, // Column W
            tierGoal: values[22] ? this.formatNumber(values[22]) : 0, // Column W
            score: parseInt(getValue('Score')) || 0,
            _scoreDebug: getValue('Score'),
            graduationLeft: getValue('Grad Left'),
            rankUpReward: parseInt(getValue('Rank_up_Reward')) || 0,
            growthDirection: getValue('Growth') || '',
            
            // Historical data
            diamondsLastMonth: this.formatNumber(getValue('-1 Month 💎')),
            diamondsTwoMonthsAgo: this.formatNumber(getValue('-2 Month 💎')),
            
            // Column AM (index 39) - Est Rev (estimated revenue dollar amount)
            estRev: parseFloat(values[39]?.toString().replace(/[$,]/g, '')) || 0,
            
            // Column AN (index 40) - Bonus
            bonus: values[40] || '',
            
            // Activity Level goals from columns O and R
            activityDaysGoal: parseInt(values[14]) || parseInt(getValue('Days Goal')) || 18, // Column O = Days Goal
            activityHoursGoal: parseInt(values[17]) || parseInt(getValue('Hrs Goal')) || 60, // Column R = Hrs Goal
            
            // Monthly Goals from columns AP and AQ
            daysGoal: parseInt(values[41]) || parseInt(getValue('Days Month')) || 22, // Column AP = Days Month
            hoursGoal: parseInt(values[42]) || parseInt(getValue('Hours Month')) || 80, // Column AQ = Hours Month
            
            // Note: This CSV only has Rewards Month (current), not full monthly history
            // Monthly history comes from HISTORY.csv via creator_trends.json
            earningsHistory: [],
            
            // Column AO - Rewards Month (March 2026 onwards)
            rewardsMonth: getValue('Rewards Month') || values[42] || '', // Column AO = index 42
            
            // Labels & links
            rankLabel: getValue('Rank Label'),
            detailsLabel: getValue('Details Label'),
            link: getValue('Link'),
            diamondLabel: getValue('Diamond Label'),
            lastLabel: getValue('Last Label'),
            lastReward: getValue('Last Reward') || getValue('AQ') || '',
            
            // Internal grouping
            group: this.determineGroup(getValue('Agent')),
            
            // Timestamps
            lastUpdated: new Date().toISOString()
        };
    }

    // Format manager name for display
    formatManagerName(agent) {
        if (!agent) return 'Unassigned';
        
        // Handle multi-manager cases like "BRYTON + CARRINGTON"
        const managers = agent.split('+').map(m => m.trim());
        return managers.map(m => {
            const lower = m.toLowerCase();
            if (lower.includes('carrington')) return 'Carrington';
            if (lower.includes('bryton')) return 'Bryton';
            if (lower.includes('sven')) return 'Sven';
            return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
        }).join(' + ');
    }

    // Determine group based on manager
    determineGroup(agent) {
        if (!agent) return 'Unassigned';
        const lower = agent.toLowerCase();
        
        // Staff managers
        if (lower.includes('carrington') && !lower.includes('+')) return 'Staff';
        
        // Agent managers or co-managed
        if (lower.includes('bryton') || lower.includes('sven') || lower.includes('+')) return 'Agents';
        
        return 'Staff';
    }

    // Load data from local JSON file (updated from CSV)
    async loadFromCSV() {
        try {
            console.log('Loading data from local JSON...');
            
            // Load creators data from local JSON
            const response = await fetch('data/creators_full.json?v=' + Date.now());
            if (!response.ok) throw new Error('Failed to load JSON: ' + response.status);
            
            const creatorsData = await response.json();
            console.log('DEBUG - JSON loaded, creators:', creatorsData.length);
            
            // Transform JSON data to match expected format
            this.creators = creatorsData.map(c => ({
                creatorId: c.creatorId,
                username: c.username,
                level: (c.level === '' || c.level === undefined || c.level === null) ? -1 : parseInt(c.level),
                month: c.month,
                discord: '',
                manager: c.agent || 'Unassigned',
                status: 'Active',
                validLiveDays: c.days,
                liveStreams: c.days,
                hours: c.hours,
                diamonds: c.diamonds,
                tier: c.tier,
                score: c.score,
                lastMonthTier: c.lastMonthTier,
                tierStatus: c.tierStatus,
                growthPercent: 0,
                growthDirection: '',
                daysGoal: c.daysGoal || 7,
                hoursGoal: c.hoursGoal || 15,
                tierGoal: c.tierGoal || c.diamondsGoal || 3000000,
                diamondsGoal: c.tierGoal || c.diamondsGoal || 3000000,
                diamondsLastMonth: c.diamondsLastMonth,
                diamondsTwoMonthsAgo: c.diamondsTwoMonthsAgo,
                earned: c.earned || 0,
                gifted: c.gifted || 0,
                running: c.running || 0,
                unlocked: c.unlocked || 0,
                estRev: parseFloat(c.estRev) || parseFloat(c.rewardsMonth?.replace(/[$,]/g, '')) || 0,
                rewardsMonth: c.rewardsMonth || '', // Column AO
                rewards: {
                    earned: c.earned || 0,
                    gifted: c.gifted || 0,
                    bonus: 0,
                    running: c.running || 0,
                    unlocked: c.unlocked || 0
                },
                link: '',
                lastUpdated: new Date().toISOString()
            }));
            
            this.lastFetch = new Date();
            console.log('✅ Successfully loaded', this.creators.length, 'creators from local JSON');
            
            if (this.creators.length > 0) {
                console.log('DEBUG - First creator:', this.creators[0].username, 'Score:', this.creators[0].score);
            }
            return this.creators;
        } catch (error) {
            console.error('❌ Error loading JSON:', error);
            // Fallback to embedded data if available
            return this.loadFallbackData();
        }
    }

    // Fallback to embedded data
    loadFallbackData() {
        if (typeof allCreatorsData !== 'undefined') {
            // Merge existing data with rewards if available
            this.creators = allCreatorsData.map(c => ({
                ...c,
                rewards: c.rewards || { earned: 0, gifted: 0, bonus: 0, running: 0, unlocked: 0 },
                lastUpdated: new Date().toISOString()
            }));
            return this.creators;
        }
        return [];
    }

    // Get all creators
    getAllCreators() {
        return this.creators;
    }

    // Get creator by username
    getCreatorByUsername(username) {
        return this.creators.find(c => c.username === username);
    }

    // Get creators by manager
    getCreatorsByManager(manager) {
        return this.creators.filter(c => 
            c.manager && c.manager.toLowerCase().includes(manager.toLowerCase())
        );
    }

    // Get creators by group
    getCreatorsByGroup(group) {
        return this.creators.filter(c => c.group === group);
    }

    // Get unique managers list
    getUniqueManagers() {
        const managers = new Set();
        this.creators.forEach(c => {
            if (c.manager) {
                // Split multi-managers
                c.manager.split('+').forEach(m => managers.add(m.trim()));
            }
        });
        return Array.from(managers).sort();
    }

    // Calculate totals
    calculateTotals() {
        let totalDiamonds = 0;
        let totalHours = 0;
        let totalStreams = 0;
        let totalEarned = 0;
        let totalGifted = 0;
        let totalBonus = 0;
        
        const staffCount = this.creators.filter(c => c.group === 'Staff').length;
        const agentsCount = this.creators.filter(c => c.group === 'Agents').length;

        this.creators.forEach(c => {
            totalDiamonds += c.diamonds || 0;
            totalHours += c.hours || 0;
            totalStreams += c.liveStreams || 0;
            totalEarned += c.rewards?.earned || 0;
            totalGifted += c.rewards?.gifted || 0;
            totalBonus += c.rewards?.bonus || 0;
        });

        return {
            totalCreators: this.creators.length,
            totalDiamonds,
            totalHours: totalHours.toFixed(1),
            totalStreams,
            totalEarned,
            totalGifted,
            totalBonus,
            staffCount,
            agentsCount
        };
    }

    // Get top creators by diamonds
    getTopCreators(limit = 10) {
        return [...this.creators]
            .sort((a, b) => (b.diamonds || 0) - (a.diamonds || 0))
            .slice(0, limit);
    }

    // Get top creators by rewards earned
    getTopEarners(limit = 10) {
        return [...this.creators]
            .sort((a, b) => (b.rewards?.earned || 0) - (a.rewards?.earned || 0))
            .slice(0, limit);
    }
}

// Create global instance
// sheetsDataService - separate from taboostData to avoid conflicts
const sheetsDataService = new TaboostDataService();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TaboostDataService, taboostData };
}
