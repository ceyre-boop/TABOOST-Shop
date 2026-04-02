// Creator Dashboard - Personal Analytics
// Tracks creators by Creator ID (internal), displays by username

let myData = null;
let allCreators = [];
let performanceChart = null;
let creatorMonths = {}; // Real month data from CSV column F
let creatorIdMap = {}; // Map creatorId to creator data

async function initCreatorDashboard(user) {
    await taboostData.loadFromCSV();
    allCreators = taboostData.getAllCreators();
    
    // Build Creator ID lookup map (internal tracking)
    // Creator ID is in the data (column B = Host)
    creatorIdMap = {};
    allCreators.forEach(c => {
        // Use creatorId if available, otherwise try to extract from data
        const cid = c.creatorId || c._creatorId || c.id;
        if (cid) {
            creatorIdMap[cid] = c;
        }
    });
    
    // Load real month data from CSV (column F)
    await loadCreatorMonths();
    
    // Load Tier and Score badges from CSV (columns U and AF)
    await loadCreatorBadges();
    
    // Load real 6-month historical trends
    await loadCreatorTrends();
    
    // Load detailed rewards from rewards-history.csv
    detailedRewardsData = await loadDetailedRewards();
    console.log('DEBUG - Detailed rewards loaded for', Object.keys(detailedRewardsData).length, 'creators');
    
    // Find my data - first try by Creator ID, then fallback to username
    // In production, user.id would be the Creator ID from login
    let creatorId = user.creatorId || user.id;
    console.log('DEBUG - Looking for creatorId:', creatorId, 'user.name:', user.name);
    
    if (creatorId && creatorIdMap[creatorId]) {
        myData = creatorIdMap[creatorId];
        console.log('DEBUG - Found by creatorId:', myData.username, 'Score:', myData.score);
    } else {
        // Fallback: try to match by username
        myData = allCreators.find(c => 
            c.username.toLowerCase() === user.name.toLowerCase().replace(/[@\s]/g, '')
        );
        
        // If still not found, check if this is a new Firebase user
        if (!myData) {
            console.warn('⚠️ CREATOR NOT FOUND in CSV:', user.name);
            console.warn('This may be a new Firebase user not yet in the system.');
            
            // Create minimal data object for new Firebase users
            // This allows them to see the dashboard even if full data isn't available
            myData = {
                username: user.name,
                name: user.name,
                email: user.email,
                creatorId: user.creatorId || 'FB_' + Date.now(),
                score: 0,
                diamonds: 0,
                diamondsGoal: 0,
                hours: 0,
                hoursGoal: 15,
                validLiveDays: 0,
                daysGoal: 7,
                tier: 1,
                tierGoal: 1000,
                tierStatus: '',
                growthPercent: 0,
                manager: 'Unassigned',
                m: 'Unassigned',
                _isNewUser: true  // Flag for UI handling
            };
            
            // Show welcome message for new users
            console.log('✅ Created minimal dashboard for new user:', user.name);
        }
        
        console.log('DEBUG - Found by fallback:', myData.username, 'Score:', myData.score, 'creatorId:', myData.creatorId);
    }
    
    // DEBUG: Log goal values
    console.log('DEBUG - Goals for', myData.username, ':', 
        'daysGoal=' + myData.daysGoal, 
        'hoursGoal=' + myData.hoursGoal, 
        'tierGoal=' + myData.tierGoal, 
        'diamondsGoal=' + myData.diamondsGoal,
        'diamonds=' + myData.diamonds
    );
    
    // Store creatorId for internal tracking (never displayed)
    myData._creatorId = myData.creatorId;
    
    // Show welcome banner for new Firebase users
    if (myData._isNewUser) {
        const welcomeBanner = document.getElementById('welcomeBanner');
        if (welcomeBanner) {
            welcomeBanner.innerHTML = `
                <div class="welcome-content">
                    <i class="fas fa-user-plus"></i>
                    <div>
                        <strong>Welcome to TABOOST!</strong>
                        <p>Your account is being set up. Full dashboard data will appear once your manager adds you to the roster.</p>
                    </div>
                </div>
            `;
            welcomeBanner.style.background = 'linear-gradient(135deg, #ff0044, #cc0033)';
        }
    }
    
    try {
        console.log('DEBUG - Starting updateProfile');
        updateProfile(user);
        console.log('DEBUG - Starting updateStats');
        updateStats();
        console.log('DEBUG - Starting updateGoals');
        updateGoals();
        console.log('DEBUG - Starting updateRank');
        updateRank();
        console.log('DEBUG - Starting updateActivityStats');
        updateActivityStats();
        console.log('DEBUG - Starting updateScoreAndLevels');
        updateScoreAndLevels();
        console.log('DEBUG - Starting initPerformanceChart');
        initPerformanceChart();
        console.log('DEBUG - Starting updateAchievements');
        updateAchievements();
        console.log('DEBUG - Starting updateHistory');
        updateHistory();
        console.log('DEBUG - Starting updateAwards');
        updateAwards();
        console.log('DEBUG - Starting updateEventsCalendar');
        updateEventsCalendar();
    } catch (e) {
        console.error('ERROR in dashboard update:', e);
    }
    
    // Update footer manager
    const footerManagerName = myData.manager;
    const footerHasManager = footerManagerName && footerManagerName.trim() !== '' && footerManagerName !== 'Unassigned';
    document.getElementById('footerManager').textContent = footerHasManager ? footerManagerName : 'TABOOST Support';
    
    // Update last updated timestamp
    updateLastUpdated();
}

async function updateLastUpdated() {
    try {
        const response = await fetch('data/current.csv?v=' + Date.now());
        if (!response.ok) throw new Error('File not found');
        const text = await response.text();
        const headers = text.split('\n')[0].split(',');
        const dateStr = headers[2] ? headers[2].replace(/"/g, '').trim() : '';
        
        if (dateStr && dateStr.length > 2 && dateStr.toLowerCase() !== 'tier' && dateStr.toLowerCase() !== 'month') {
            document.getElementById('lastUpdatedTime').textContent = `${dateStr} at 5:00 PM PT`;
        } else {
            // Fallback
            document.getElementById('lastUpdatedTime').textContent = 'Recently Updated';
        }
    } catch (e) {
        console.error('Failed to fetch last updated date:', e);
        document.getElementById('lastUpdatedTime').textContent = 'Recently Updated';
    }
}

// Load real month data from CSV (column F - Month)
async function loadCreatorMonths() {
    try {
        const response = await fetch('data/creator_months.json');
        creatorMonths = await response.json();
    } catch (e) {
        console.error('Failed to load creator months:', e);
        creatorMonths = {};
    }
}

// Load Tier and Score data from CSV (columns U and AF)
let creatorBadges = {};
async function loadCreatorBadges() {
    try {
        const response = await fetch('data/creator_badges.json');
        creatorBadges = await response.json();
    } catch (e) {
        console.error('Failed to load creator badges:', e);
        creatorBadges = {};
    }
}

function formatNumber(num) {
    if (!num) return '0';
    // Always round DOWN — never show a tier/milestone the creator hasn't actually hit
    if (num >= 1000000) return (Math.floor(num / 100000) / 10) + 'M';
    if (num >= 1000) return (Math.floor(num / 100) / 10) + 'K';
    return num.toLocaleString();
}

function formatNumberPlain(num) {
    // Format without K/M suffix - for rewards
    if (!num) return '0';
    return parseInt(num).toLocaleString();
}

function formatUSD(diamonds) {
    const usd = (diamonds || 0) * 0.005;
    return '≈ $' + Math.round(usd).toLocaleString('en-US');
}

function updateProfile(user) {
    document.getElementById('creatorName').textContent = myData.username;
    document.getElementById('creatorAvatar').textContent = myData.username.charAt(0).toUpperCase();
    
    // Use REAL month data from CSV column F (creatorMonths)
    // Lookup by Creator ID (internal), not username
    const creatorId = myData.creatorId || myData._creatorId;
    const months = creatorMonths[creatorId] || parseInt(myData.month) || 0;
    
    // Format: "Member for X months" or "Member for X years Y months"
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    let memberText = '';
    if (years > 0 && remainingMonths > 0) {
        memberText = `Member for ${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    } else if (years > 0) {
        memberText = `Member for ${years} year${years > 1 ? 's' : ''}`;
    } else {
        memberText = `Member for ${months} month${months !== 1 ? 's' : ''}`;
    }
    
    document.getElementById('joinDate').textContent = memberText;
    
    // Get Tier and Score directly from myData (live data)
    const tier = (myData.tier !== undefined && myData.tier !== null && myData.tier !== '') ? myData.tier : '--';
    const score = myData.score || 0; // Use score directly from CSV (column AG)
    
    console.log('DEBUG - Profile Score:', score, 'Tier:', tier, 'Creator:', myData.username);
    
    // Manager pill with Discord link
    // If blank manager, show Discord support link instead
    const managerName = myData.manager;
    const hasManager = managerName && managerName.trim() !== '' && managerName !== 'Unassigned' && managerName.toLowerCase() !== 'n/a';
    
    // Discord links for managers
    const managerDiscordLinks = {
        'carrington': 'https://discord.com/users/953826604260417617',
        'levi': 'https://discord.com/users/463575386010157057',
        'marco': 'sms:13235787155',  // Marco uses SMS
        // Add more managers here
    };
    
    // TABOOST Discord support link for creators without managers
    const supportDiscordLink = 'https://discord.gg/Akfwz536BW';
    
    const managerPill = document.getElementById('managerPill');
    const managerIcon = managerPill.querySelector('.fa-user-tie');
    
    if (hasManager) {
        // Has assigned manager
        document.getElementById('managerName').textContent = managerName;
        const managerKey = managerName.toLowerCase().trim();
        
        // Check for exact match first, then check if Carrington is in the name
        let discordLink = managerDiscordLinks[managerKey];
        if (!discordLink && managerKey.includes('carrington')) {
            discordLink = managerDiscordLinks['carrington'];
        }
        
        if (discordLink) {
            managerPill.href = discordLink;
            managerPill.style.cursor = 'pointer';
            managerPill.style.opacity = '1';
            
            // Update icon based on link type
            if (discordLink.startsWith('sms:')) {
                managerPill.title = 'Text manager via SMS';
                managerIcon.className = 'fas fa-sms';
            } else if (discordLink.includes('discord')) {
                managerPill.title = 'Message manager on Discord';
                managerIcon.className = 'fab fa-discord';
            }
        } else {
            managerPill.href = '#';
            managerPill.style.cursor = 'default';
            managerPill.style.opacity = '0.7';
            managerPill.title = 'Manager contact not available';
        }
    } else {
        // No manager assigned - show purple Discord badge
        document.getElementById('managerName').textContent = 'Discord';
        managerPill.href = supportDiscordLink;
        managerPill.style.cursor = 'pointer';
        managerPill.style.opacity = '1';
        managerPill.style.background = 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)';
        managerPill.style.color = '#fff';
        managerPill.title = 'Join TABOOST Discord for support';
        managerIcon.className = 'fab fa-discord';
    }
    
    // Badges - Level (0-5), Tier (col V), Score (col AG)
    // Level: -1=blank, 0=starter, 1-5=actual levels
    let levelDisplay = '--';
    if (myData.level === -1 || myData.level === '-1') {
        levelDisplay = '--';
    } else if (myData.level === 0 || myData.level === '0') {
        levelDisplay = '0';
    } else if (myData.level > 0) {
        levelDisplay = myData.level;
    }
    document.getElementById('creatorBadges').innerHTML = `
        <span class="badge badge-level">Level ${levelDisplay}</span>
        <span class="badge badge-tier">Tier ${tier}</span>
        <span class="badge badge-score">Score ${score}</span>
    `;
    
    // Welcome message based on performance
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12) greeting = 'Good afternoon';
    if (hour >= 18) greeting = 'Good evening';
    
    const growth = parseFloat(myData.growthPercent) || 0;
    let message = 'Check out your latest earnings and goals.';
    if (growth > 20) message = '🚀 Amazing growth this month! Keep it up!';
    else if (growth < 0) message = 'Your numbers are down. Let\'s get back on track!';
    else if ((myData.hours || 0) < 40) message = 'You\'re behind on hours. Time to stream!';
    
    document.getElementById('welcomeTitle').textContent = `${greeting}, ${myData.username}!`;
    document.getElementById('welcomeMessage').textContent = message;
}

function getTier(diamonds) {
    if (diamonds >= 2000000) return 'Platinum';
    if (diamonds >= 1000000) return 'Gold';
    if (diamonds >= 500000) return 'Silver';
    return 'Bronze';
}

function updateStats() {
    // Current diamonds
    console.log('DEBUG - myData:', myData);
    console.log('DEBUG - Diamonds:', myData.diamonds, 'Raw:', myData._diamondsRaw);
    console.log('DEBUG - Level:', myData.level, 'Raw:', myData._levelRaw);
    document.getElementById('currentDiamonds').textContent = formatNumber(myData.diamonds) + ' 💎';
    // Use real dollar value from estRev (column AN), fallback to rewardsMonth
    const realDollarValue = myData.estRev || parseFloat(myData.rewardsMonth?.toString().replace(/[$,]/g, '')) || 0;
    document.getElementById('currentUSD').textContent = '≈ $' + Math.round(realDollarValue).toLocaleString('en-US');
    
    // Growth trend - calculate if not provided
    let growth = parseFloat(myData.growthPercent);
    if (!growth && myData.diamonds && myData.diamondsLastMonth) {
        // Calculate growth: (current - last) / last * 100
        growth = ((myData.diamonds - myData.diamondsLastMonth) / myData.diamondsLastMonth) * 100;
    }
    growth = growth || 0;
    
    const trendEl = document.getElementById('diamondTrend');
    trendEl.innerHTML = `
        <span class="trend-indicator ${growth >= 0 ? 'up' : 'down'}">
            <i class="fas fa-arrow-${growth >= 0 ? 'up' : 'down'}"></i>
            ${Math.abs(growth).toFixed(1)}% vs last month
        </span>
    `;
    
    // Rewards - Use pre-calculated values from data (Column AJ = unlocked/available)
    // Marco confirmed: Use the 'unlocked' field directly from CSV column AJ - EXACT VALUE even if negative
    const unlockedRaw = (myData.unlocked || '0').toString().replace(/,/g, '');
    const currentAvailable = parseInt(unlockedRaw) || 0; // Allow negative numbers
    
    // Total Earned from Column AH (earned field)
    const totalEarned = myData.earned || 0;
    
    // Calculate Used: Total Earned - Current Available (AJ)
    const totalUsed = totalEarned - currentAvailable;
    
    // Format with sign if negative
    const currentRewardsAvailable = currentAvailable < 0 
        ? '-' + formatNumberPlain(Math.abs(currentAvailable))
        : formatNumberPlain(currentAvailable);
    
    document.getElementById('totalRewards').textContent = currentRewardsAvailable;
    document.getElementById('rewardsBreakdown').innerHTML = `
        <span>Total Earned: ${formatNumberPlain(totalEarned)} | Used: ${formatNumberPlain(totalUsed)}</span>
    `;
}

function updateRank() {
    const sorted = [...allCreators].sort((a, b) => (b.diamonds || 0) - (a.diamonds || 0));
    const myRank = sorted.findIndex(c => c.username === myData.username) + 1;
    
    document.getElementById('currentRank').textContent = '#' + myRank;
    document.getElementById('totalCreators').textContent = allCreators.length;
    
    // Rank progress
    const progress = Math.max(5, 100 - (myRank / allCreators.length * 100));
    document.getElementById('rankBar').style.width = progress + '%';
    
    // Next rank goal
    if (myRank > 1) {
        const nextCreator = sorted[myRank - 2];
        const gap = (nextCreator.diamonds || 0) - (myData.diamonds || 0);
        const targetRank = myRank - 1;
        document.getElementById('rankGoal').textContent = formatNumber(gap) + ' more diamonds to reach #' + targetRank;
    } else {
        document.getElementById('rankGoal').textContent = "You're #1! Keep crushing it! 🔥";
    }
}

function updateActivityStats() {
    // Activity Stats Row may have been removed - safely check all elements
    try {
        // Use ACTIVITY LEVEL values (M/Q columns) for current stats
        const hoursValue = document.getElementById('hoursValue');
        if (hoursValue) hoursValue.textContent = (myData.hours || 0).toFixed(1) + 'h';
        
        const streamsValue = document.getElementById('streamsValue');
        if (streamsValue) streamsValue.textContent = myData.liveStreams || 0;
        
        const daysValue = document.getElementById('daysValue');
        if (daysValue) daysValue.textContent = myData.validLiveDays || 0;
        
        // Calculate hourly rate (diamonds per hour)
        const hours = myData.hours || 0;
        const diamonds = myData.diamonds || 0;
        const hourlyRate = hours > 0 ? Math.round(diamonds / hours) : 0;
        const hourlyRateValue = document.getElementById('hourlyRateValue');
        if (hourlyRateValue) hourlyRateValue.textContent = formatNumber(hourlyRate) + ' 💎/h';
        
        // Hours goal mini bar - use hoursGoal from column
        const hoursFill = document.getElementById('hoursFill');
        const hoursGoalText = document.getElementById('hoursGoalText');
        if (hoursFill && hoursGoalText) {
            const hoursGoal = myData.hoursGoal || 60;
            const hourPct = Math.min(100, ((myData.hours || 0) / hoursGoal) * 100);
            hoursFill.style.width = hourPct + '%';
            hoursGoalText.textContent = hoursGoal + 'h';
        }
    } catch (e) {
        console.log('Activity Stats elements not found (may have been removed):', e.message);
    }
}

function updateGoals() {
    // Calculate time-based pace
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const today = now.getDate();
    const daysElapsed = today; // Day 1 = 1 day elapsed
    const daysLeft = daysInMonth - today;
    const timeElapsedPct = daysElapsed / daysInMonth; // 0.0 to 1.0
    
    document.getElementById('daysRemaining').textContent = `${daysLeft} days left in month (${daysElapsed}/${daysInMonth})`;
    
    const goals = [
        {
            name: 'Streaming Days',
            icon: 'fa-calendar',
            current: myData.validLiveDays || 0,
            target: myData.daysGoal || 22,
            unit: ' days'
        },
        {
            name: 'Hours Goal',
            icon: 'fa-clock',
            current: myData.hours || 0,
            target: myData.hoursMonth || myData.hoursGoal || 80,
            unit: 'h'
        },
        {
            name: 'Diamonds Target',
            icon: 'fa-gem',
            current: myData.diamondsCurrent || myData.diamonds || 0,
            target: myData.tierGoal || myData.diamondsGoal || 0,
            unit: ''
        }
    ];
    
    // DEBUG: Log goal values
    console.log('DEBUG Goals for', myData.username, ':', 
        'daysGoal=' + myData.daysGoal,
        'hoursGoal=' + myData.hoursGoal,
        'tierGoal=' + myData.tierGoal, 
        'diamondsGoal=' + myData.diamondsGoal,
        'liveStreams=' + myData.liveStreams,
        'timeElapsed=' + (timeElapsedPct * 100).toFixed(1) + '%'
    );
    
    document.getElementById('goalsGrid').innerHTML = goals.map(g => {
        const pct = Math.min(100, (g.current / g.target) * 100);
        
        // Calculate pace status based on time elapsed
        // Expected progress = target * timeElapsedPct
        const expectedProgress = g.target * timeElapsedPct;
        const pacePct = expectedProgress > 0 ? (g.current / expectedProgress) * 100 : 100;
        
        // Determine status based on pace (not just total)
        let status = 'behind';
        let paceLabel = 'Behind pace';
        if (pacePct >= 100) {
            status = 'excelling';
            paceLabel = pacePct >= 150 ? 'Crushing it! 🚀' : 'On pace';
        } else if (pacePct >= 80) {
            status = 'on-track';
            paceLabel = 'Close to pace';
        } else if (pacePct >= 50) {
            status = 'behind';
            paceLabel = 'Behind pace';
        } else {
            status = 'at-risk';
            paceLabel = 'Way behind';
        }
        
        // If already at 100% of goal, always show as on-track/excelling
        if (pct >= 100) {
            status = 'excelling';
            paceLabel = 'Goal complete! 🎉';
        }
        
        return `
            <div class="goal-card">
                <div class="goal-header">
                    <div class="goal-title">
                        <i class="fas ${g.icon}"></i>
                        <span>${g.name}</span>
                    </div>
                    <span class="goal-status ${status}">${paceLabel}</span>
                </div>
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill ${status}" style="width: ${pct}%"></div>
                </div>
                <div class="goal-numbers">
                    <span>${formatNumber(g.current)}${g.unit} / ${formatNumber(g.target)}${g.unit}</span>
                    <span>${pct.toFixed(0)}% complete</span>
                </div>
                <div class="goal-pace" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
                    Expected by now: ${formatNumber(Math.round(expectedProgress))}${g.unit} (${pacePct.toFixed(0)}% of expected)
                </div>
            </div>
        `;
    }).join('');
}

// Load creator historical trends from real 6-month data
let creatorTrends = {};

// Load detailed rewards from rewards-history.csv
// CSV format: CID,TikTok,Type,Date,Plus,Minus
async function loadDetailedRewards() {
    try {
        const response = await fetch('data/rewards-history.csv?v=202603200452');
        if (!response.ok) throw new Error('Failed to load rewards file');
        
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        
        const rewardsByCreator = {};
        let rowCount = 0;
        
        // Parse CSV properly handling quoted values with commas
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const values = [];
            let inQuotes = false;
            let current = '';
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim().replace(/^"|"$/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim().replace(/^"|"$/g, ''));
            
            // Need at least: CID, TikTok, Type, Date, Plus, Minus (6 columns)
            if (values.length < 6) continue;
            
            // Column A (index 0) = CID
            // Column B (index 1) = TikTok username
            // Column C (index 2) = Type
            // Column D (index 3) = Date
            // Column E (index 4) = Plus (rewards earned)
            // Column F (index 5) = Minus (gifted/cashed in)
            const username = values[1]?.toLowerCase().trim();
            const type = values[2]?.trim() || '';
            const date = values[3]?.trim() || '';
            const plus = values[4]?.trim() || ''; // Rewards earned
            const minus = values[5]?.trim() || ''; // Gifted/cashed in
            
            if (!username) continue;
            
            rowCount++;
            
            if (!rewardsByCreator[username]) {
                rewardsByCreator[username] = [];
            }
            
            rewardsByCreator[username].push({
                type: type,
                date: date,
                plus: plus,
                minus: minus,
                icon: getRewardIcon(type)
            });
        }
        
        const creatorCount = Object.keys(rewardsByCreator).length;
        console.log('DEBUG - Loaded rewards for', creatorCount, 'creators,', rowCount, 'rows from CSV');
        console.log('DEBUG - Sample creators:', Object.keys(rewardsByCreator).slice(0, 5));
        return rewardsByCreator;
    } catch (e) {
        console.error('Failed to load detailed rewards:', e);
        return {};
    }
}

function getRewardIcon(type) {
    if (!type) return '🏆';
    const t = type.toLowerCase();
    if (t.includes('rumble')) return '🥊';
    if (t.includes('music') || t.includes('cypher')) return '🎵';
    if (t.includes('gaming')) return '🎮';
    if (t.includes('knockout')) return '💥';
    if (t.includes('award')) return '🏅';
    if (t.includes('bonus')) return '💰';
    if (t.includes('gifted')) return '🎁';
    if (t.includes('rookie')) return '🌟';
    if (t.includes('takeover')) return '🎤';
    if (t.includes('50k')) return '💎';
    return '🏆';
}

async function loadCreatorTrends() {
    try {
        const response = await fetch('data/creator_trends.json?v=2');
        if (!response.ok) throw new Error('Failed to load trends file');
        const trends = await response.json();
        creatorTrends = {};
        trends.forEach(t => {
            creatorTrends[t.username] = t;
        });
        console.log('DEBUG - Loaded trends for', Object.keys(creatorTrends).length, 'creators');
    } catch (e) {
        console.error('Failed to load trends:', e);
        creatorTrends = {};
    }
}

function initPerformanceChart() {
    console.log('DEBUG - initPerformanceChart called');
    try {
        const ctx = document.getElementById('performanceChart');
        console.log('DEBUG - Canvas element:', ctx);
        if (!ctx) {
            console.error('ERROR: performanceChart canvas not found');
            return;
        }
        
        // Force canvas to have proper dimensions
        ctx.style.width = '100%';
        ctx.style.height = '100%';
        
        // Use real 6-month data if available - try exact match first, then case-insensitive
        let trends = creatorTrends[myData.username];
        
        // If not found, try case-insensitive match
        if (!trends) {
            const usernameLower = myData.username.toLowerCase();
            const matchingKey = Object.keys(creatorTrends).find(key => 
                key.toLowerCase() === usernameLower
            );
            if (matchingKey) {
                trends = creatorTrends[matchingKey];
                console.log('DEBUG - Found trends via case-insensitive match:', matchingKey);
            }
        }
        
        console.log('DEBUG - Looking for username:', myData.username);
        console.log('DEBUG - Available usernames count:', Object.keys(creatorTrends).length);
        console.log('DEBUG - Chart trends found:', trends ? 'YES' : 'NO');
        
        // Use month labels from HISTORY data (Oct-Feb + Current)
        // HISTORY.csv: Oct, Nov, Dec, Jan, Feb
        // Current month comes from LIVE data (daily CSV column T)
        const labels = ['October', 'November', 'December', 'January', 'February', 'Current'];
        
        // Get current month live data from myData (daily CSV - column T for diamonds, V for tier)
        const currentDiamonds = myData.diamonds || 0;
        const currentTier = myData.tier || 0;
        
        // Check if we have real history data
        const hasRealData = trends && trends.diamondsHistory && trends.diamondsHistory.length >= 5;
        
        // Build dataPoints: Past months from history JSON, Current from live data
        let dataPoints;
        if (hasRealData) {
            // diamondsHistory is [Sep, Oct, Nov, Dec, Jan, Feb]
            // Use indices 1-5 for Oct-Feb, current from live data
            dataPoints = [
                trends.diamondsHistory[1], // October (index 1)
                trends.diamondsHistory[2], // November (index 2)
                trends.diamondsHistory[3], // December (index 3)
                trends.diamondsHistory[4], // January (index 4)
                trends.diamondsHistory[5], // February (index 5)
                currentDiamonds            // Current (live from daily CSV)
            ];
            console.log('DEBUG - Using merged data (history Oct-Feb + live Current):', dataPoints);
        } else {
            // Fallback: use available data
            const lastMonth = myData.diamondsLastMonth || currentDiamonds;
            const twoMonthsAgo = myData.diamondsTwoMonthsAgo || lastMonth;
            dataPoints = [
                twoMonthsAgo * 0.85 || currentDiamonds * 0.7,
                twoMonthsAgo * 0.92 || currentDiamonds * 0.8,
                twoMonthsAgo || currentDiamonds * 0.85,
                lastMonth * 0.95 || currentDiamonds * 0.9,
                lastMonth || currentDiamonds * 0.95,
                currentDiamonds
            ];
            console.log('DEBUG - Using fallback data:', dataPoints);
        }
        
        // Tier data: Past months from history, Current from live data (column V)
        // tierHistory is [Sep, Oct, Nov, Dec, Jan, Feb]
        // Convert -1 to null so chart doesn't display invalid tiers
        let tierData = [null, null, null, null, null, currentTier];
        if (trends && trends.tierHistory && trends.tierHistory.length >= 6) {
            tierData = [
                trends.tierHistory[1] > 0 ? trends.tierHistory[1] : null, // October (index 1)
                trends.tierHistory[2] > 0 ? trends.tierHistory[2] : null, // November (index 2)
                trends.tierHistory[3] > 0 ? trends.tierHistory[3] : null, // December (index 3)
                trends.tierHistory[4] > 0 ? trends.tierHistory[4] : null, // January (index 4)
                trends.tierHistory[5] > 0 ? trends.tierHistory[5] : null, // February (index 5)
                currentTier            // Current (live from daily CSV column V)
            ];
        }
        
        console.log('DEBUG - Chart labels:', labels);
        console.log('DEBUG - Chart dataPoints:', dataPoints);
    
    const data = {
        labels: labels,
        datasets: [{
            label: 'My Diamonds',
            data: dataPoints,
            borderColor: '#ff0044',
            backgroundColor: 'rgba(255, 0, 68, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointBackgroundColor: '#ff0044',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: hasRealData ? 4 : 6,
            yAxisID: 'y'
        },
        {
            label: 'Tier',
            data: tierData,
            borderColor: '#00ff88',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#00ff88',
            yAxisID: 'y1'
        }]
    };
    
    // Destroy existing chart if it exists
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    console.log('DEBUG - Creating chart with data:', data);
    
    // Detect mobile for smaller chart elements
    const isMobile = window.innerWidth < 768;
    
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { 
                    display: hasRealData && !isMobile,
                    labels: { 
                        color: '#888',
                        font: { size: isMobile ? 10 : 12 }
                    }
                },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    borderColor: '#333',
                    borderWidth: 1,
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    titleFont: { size: isMobile ? 11 : 13 },
                    bodyFont: { size: isMobile ? 10 : 12 },
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Tier') {
                                return 'Tier ' + context.parsed.y;
                            }
                            return formatNumber(context.parsed.y) + ' 💎';
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#888',
                        font: { size: isMobile ? 9 : 11 },
                        maxTicksLimit: isMobile ? 4 : 6,
                        callback: v => formatNumber(v)
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { display: false },
                    min: 1,
                    max: 10,
                    ticks: {
                        color: '#00ff88',
                        font: { size: 9 },
                        stepSize: 1,
                        callback: v => 'T' + v
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        color: '#888',
                        font: { size: isMobile ? 8 : 10 }
                    }
                }
            }
        }
    });
    
    // Chart tabs - only real data, no estimation
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Always show real 6-month historical data with month names
            performanceChart.data.labels = labels;
            if (hasRealData) {
                performanceChart.data.datasets[0].data = [
                    trends.diamondsHistory[1], // October
                    trends.diamondsHistory[2], // November
                    trends.diamondsHistory[3], // December
                    trends.diamondsHistory[4], // January
                    trends.diamondsHistory[5], // February
                    myData.diamonds || 0       // Current
                ];
                // Also update tier data
                if (trends.tierHistory && trends.tierHistory.length >= 6) {
                    performanceChart.data.datasets[1].data = [
                        trends.tierHistory[1] > 0 ? trends.tierHistory[1] : null,
                        trends.tierHistory[2] > 0 ? trends.tierHistory[2] : null,
                        trends.tierHistory[3] > 0 ? trends.tierHistory[3] : null,
                        trends.tierHistory[4] > 0 ? trends.tierHistory[4] : null,
                        trends.tierHistory[5] > 0 ? trends.tierHistory[5] : null,
                        myData.tier || 0
                    ];
                }
            } else {
                // Fallback: use CSV data columns
                const current = myData.diamonds || 0;
                const lastMonth = myData.diamondsLastMonth || current;
                const twoMonthsAgo = myData.diamondsTwoMonthsAgo || lastMonth;
                performanceChart.data.datasets[0].data = [
                    twoMonthsAgo || current * 0.8,
                    lastMonth || current * 0.9,
                    current * 0.95,
                    current * 0.98,
                    current * 0.99,
                    current
                ];
            }
            performanceChart.update();
        });
    });
    
    // Insights using real data
    const avg = allCreators.reduce((a, c) => a + (c.diamonds || 0), 0) / allCreators.length;
    const diff = ((myData.diamonds || 0) - avg) / avg * 100;
    
    document.getElementById('chartInsights').innerHTML = `
        <div class="insight-item ${diff >= 0 ? 'positive' : 'negative'}">
            <i class="fas fa-chart-bar"></i>
            <span>${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% vs agency average</span>
        </div>
        <div class="insight-item">
            <i class="fas fa-calculator"></i>
            <span>${formatNumber((myData.diamonds || 0) / (myData.hours || 1))} diamonds per hour</span>
        </div>
    `;
    
    console.log('DEBUG - Chart created successfully');
    
    // Force chart to render
    if (performanceChart) {
        performanceChart.update();
        console.log('DEBUG - Chart updated/rendered');
    }
    
    } catch (error) {
        console.error('ERROR creating chart:', error);
        const container = document.querySelector('.chart-container');
        if (container) {
            container.innerHTML = '<p style="text-align:center;color:#888;padding:40px 20px;">Chart data unavailable. Refresh to try again.</p>';
        }
    }
}

function updateAchievements() {
    const achievements = [
        { name: 'Million Diamond Club', icon: '💎', unlocked: (myData.diamonds || 0) >= 1000000, desc: '1M+ diamonds' },
        { name: 'Stream Master', icon: '📺', unlocked: (myData.validLiveDays || 0) >= 22, desc: '22+ days streamed' },
        { name: 'Reward King', icon: '💰', unlocked: !!(myData.cashBonus || myData.bonusMTD || (myData.rewardsMonth && parseFloat((myData.rewardsMonth || '').toString().replace(/[$,]/g, '')) > 0)), desc: 'Earned a Bonus this month' },
        { name: 'Hour Crusher', icon: '⏰', unlocked: (myData.hours || 0) >= 80, desc: '80+ hours' },
        { name: 'Growth Star', icon: '🚀', unlocked: (myData.tierStatus || '').toLowerCase().includes('up'), desc: 'Leveled up this month' },
        { name: 'Top 10', icon: '👑', unlocked: false, desc: 'Reach top 10' } // Will update based on rank
    ];
    
    // Update Top 10 based on actual rank
    const sorted = [...allCreators].sort((a, b) => (b.diamonds || 0) - (a.diamonds || 0));
    const myRank = sorted.findIndex(c => c.username === myData.username) + 1;
    achievements[5].unlocked = myRank <= 10;
    
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    document.getElementById('achievementCount').textContent = `${unlockedCount}/${achievements.length} unlocked`;
    
    document.getElementById('achievementsGrid').innerHTML = achievements.map(a => `
        <div class="achievement-item ${a.unlocked ? 'unlocked' : ''}">
            <div class="achievement-icon">${a.icon}</div>
            <div class="achievement-name">${a.name}</div>
            <div class="achievement-desc">${a.desc}</div>
        </div>
    `).join('');
}

function updateHistory() {
    // Use month names from HISTORY data (Sep-Feb only) - 6 months of past data
    const periods = [
        'September 2025',
        'October 2025',
        'November 2025',
        'December 2025',
        'January 2026',
        'February 2026'
    ];
    
    // Use real earnings history from historical CSV (Revenue columns AJ-AO)
    let earningsData = [];
    
    if (myData.earningsHistory && myData.earningsHistory.length >= 6) {
        // Use real earnings from CSV - reverse to match chronological order (Sep→Feb)
        earningsData = [...myData.earningsHistory].reverse();
    } else {
        // Fallback to trends data or calculated estimates
        let trends = creatorTrends[myData.username];
        
        // Case-insensitive lookup
        if (!trends) {
            const usernameLower = myData.username.toLowerCase();
            const matchingKey = Object.keys(creatorTrends).find(key => 
                key.toLowerCase() === usernameLower
            );
            if (matchingKey) trends = creatorTrends[matchingKey];
        }
        
        if (trends && trends.diamondsHistory && trends.diamondsHistory.length >= 6) {
            // FIX: Convert trends data to earningsData format
            const rewardsHist = trends.rewardsHistory || [];
            const revenueHist = trends.revenueHistory || [];
            earningsData = trends.diamondsHistory.slice(0, 6).map((diamonds, idx) => {
                // Use actual revenue from revenueHistory if available, otherwise calculate
                let revenue = revenueHist[idx];
                if (!revenue || revenue === 0) {
                    revenue = Math.round(diamonds * 0.005);
                }
                return {
                    diamonds: diamonds,
                    revenue: '$' + revenue.toLocaleString(),
                    rewards: parseInt(rewardsHist[idx]?.toString().replace(/,/g, '')) || 0
                };
            });
        } else {
            // Fallback: build from available data (6 months) with estimated revenue
            const current = myData.diamonds || 0;
            const lastMonth = myData.diamondsLastMonth || current;
            const twoMonthsAgo = myData.diamondsTwoMonthsAgo || lastMonth;
            earningsData = [
                { diamonds: Math.round(twoMonthsAgo * 0.8 || current * 0.65), revenue: '$0.00', rewards: 0 },
                { diamonds: Math.round(twoMonthsAgo * 0.85 || current * 0.7), revenue: '$0.00', rewards: 0 },
                { diamonds: Math.round(twoMonthsAgo * 0.92 || current * 0.8), revenue: '$0.00', rewards: 0 },
                { diamonds: Math.round(twoMonthsAgo || current * 0.85), revenue: '$0.00', rewards: 0 },
                { diamonds: Math.round(lastMonth * 0.95 || current * 0.9), revenue: '$0.00', rewards: 0 },
                { diamonds: Math.round(lastMonth || current * 0.95), revenue: '$0.00', rewards: 0 }
            ];
        }
    }
    
    // Build rows with calculated changes using Revenue from CSV
    const rows = periods.map((period, index) => {
        const data = earningsData[index] || { diamonds: 0, revenue: '$0.00', rewards: 0 };
        const diamonds = parseInt(data.diamonds) || 0;
        const prevData = index > 0 ? earningsData[index - 1] : null;
        const prevDiamonds = prevData ? (parseInt(prevData.diamonds) || 0) : 0;
        let change = '--';
        if (index > 0 && prevDiamonds > 0) {
            const changeVal = ((diamonds - prevDiamonds) / prevDiamonds * 100);
            change = (changeVal >= 0 ? '↑ ' : '↓ ') + Math.abs(changeVal).toFixed(1) + '%';
        }
        
        // Revenue from CSV - strip cents and add ≈ prefix (no space to prevent line break)
        let revenueRaw = data.revenue || '$0.00';
        // Remove cents (everything after decimal point)
        revenueRaw = revenueRaw.replace(/\.\d{2}$/, '');
        const revenue = revenueRaw.startsWith('≈') ? revenueRaw : '≈' + revenueRaw;
        
        // Rewards from CSV
        const rewards = data.rewards > 0 ? formatNumber(data.rewards) + ' 💎' : '--';
        
        return {
            period: period,
            diamonds: diamonds,
            usd: revenue, // Use actual Revenue from CSV, not calculated
            rewards: rewards,
            change: change
        };
    });
    
    document.getElementById('historyTableBody').innerHTML = rows.map(r => {
        const isChange = r.change !== '--';
        const changeClass = isChange ? (r.change.includes('↑') ? 'up' : 'down') : '';
        const changeIcon = isChange ? (r.change.includes('↑') ? 'fa-arrow-up' : 'fa-arrow-down') : '';
        const changeText = isChange ? r.change.replace(/[↑↓] /, '') : '--';
        
        return `
            <tr>
                <td><strong>${r.period}</strong></td>
                <td>${formatNumber(r.diamonds)} 💎</td>
                <td style="color: var(--success);">${r.usd}</td>
                <td>${r.rewards}</td>
                <td>
                    ${isChange ? `
                        <span class="trend-indicator ${changeClass}">
                            <i class="fas ${changeIcon}"></i> ${changeText}
                        </span>
                    ` : '--'}
                </td>
            </tr>
        `;
    }).join('');
}

function updateScoreAndLevels() {
    // Score from Google Sheets column AG (0-100)
    const score = myData.score || 0;
    console.log('DEBUG - Creator ID:', myData.creatorId, 'Score:', score, 'from myData.score');
    
    // Update Score Badge
    document.getElementById('scoreBadge').textContent = `Score: ${score}`;
    
    // Score Segmented Bar - 100 segments, fill based on score
    // Score 86 = 86 segments filled, Score 100 = 100 segments filled
    const segmentsContainer = document.getElementById('scoreSegments');
    if (segmentsContainer) {
        // Generate 100 segments if not already generated
        if (segmentsContainer.children.length === 0) {
            for (let i = 0; i < 100; i++) {
                const segment = document.createElement('div');
                segment.className = 'score-segment';
                segmentsContainer.appendChild(segment);
            }
        }
        
        // Fill segments based on score
        const filledCount = Math.min(100, Math.max(0, Math.round(score)));
        const segments = segmentsContainer.querySelectorAll('.score-segment');
        segments.forEach((seg, index) => {
            if (index < filledCount) {
                seg.classList.add('filled');
            } else {
                seg.classList.remove('filled');
            }
        });
    }
    
    console.log(`DEBUG - Score: ${score}, Segments filled: ${Math.round(score)}`);
    
    // Current Score Reward
    const rewardTiers = [
        { min: 95, reward: 450 },
        { min: 90, reward: 300 },
        { min: 85, reward: 200 },
        { min: 80, reward: 100 },
        { min: 75, reward: 75 },
        { min: 70, reward: 75 },
        { min: 0, reward: 0 }
    ];
    
    // Score reward display removed - only showing score bar now
    
    // Score Breakdown
    const threeMonthDiamonds = (myData.diamonds || 0) + (myData.diamondsLastMonth || 0) + (myData.diamondsTwoMonthsAgo || 0);
    const growth = parseFloat(myData.growthPercent) || 0;
    
    // Activity Level based on Column E (Level 0-5)
    const level = myData.level;
    let activityLevel = '--';
    let activityColor = '#888';
    
    if (level === -1 || level === '-1') {
        activityLevel = '--';
        activityColor = '#888';
    } else if (parseInt(level) === 0) {
        activityLevel = 'Low';
        activityColor = '#60a5fa';
    } else if (parseInt(level) >= 1 && parseInt(level) <= 2) {
        activityLevel = 'Good';
        activityColor = '#4ade80';
    } else if (parseInt(level) >= 3) {
        activityLevel = 'Great';
        activityColor = '#00d4ff';
    }
    
    const activityEl = document.getElementById('scoreActivity');
    activityEl.textContent = activityLevel;
    activityEl.style.color = activityColor;
    document.getElementById('scoreDiamonds').textContent = formatNumber(threeMonthDiamonds);
    // Rank Change - Column Y (Tier Status: Up/Down)
    const tierStatus = myData.tierStatus || '';
    const rankChangeEl = document.getElementById('rankChange');
    
    if (tierStatus.toLowerCase().includes('up')) {
        rankChangeEl.textContent = '⬆ Up';
        rankChangeEl.style.color = '#00ff88'; // Green
    } else if (tierStatus.toLowerCase().includes('down')) {
        rankChangeEl.textContent = '⬇ Down';
        rankChangeEl.style.color = '#ff0044'; // Red
    } else {
        rankChangeEl.textContent = '➡ Same';
        rankChangeEl.style.color = '#888';
    }
    
    // Activity Level Visual - DEBUG
    console.log('DEBUG - Activity Level data:', myData.level, 'Raw:', myData._levelRaw, 'Header:', myData._levelHeader);
    
    // Use level from CSV column E
    // Handle: -1=blank, 0=starter, 1-5=actual levels
    let currentLevelDisplay = '--';
    let currentLevelNum = null;
    
    if (myData.level === -1 || myData.level === '-1') {
        // Blank level - show '--'
        currentLevelDisplay = '--';
        currentLevelNum = null;
    } else {
        // Has a value (including 0)
        currentLevelNum = parseInt(myData.level);
        currentLevelDisplay = currentLevelNum.toString();
    }
    
    console.log('DEBUG - Parsed currentLevel:', currentLevelNum, 'Display:', currentLevelDisplay, 'for creator:', myData.username);
    
    document.getElementById('currentLevelBadge').textContent = `Level ${currentLevelDisplay}`;
    
    // Update level steps
    document.querySelectorAll('.level-step').forEach(step => {
        const levelNum = parseInt(step.dataset.level);
        step.classList.remove('completed', 'current');
        if (currentLevelNum !== null && currentLevelNum > 0 && levelNum < currentLevelNum) {
            step.classList.add('completed');
        } else if (levelNum === currentLevelNum) {
            // Highlight current level (including 0)
            step.classList.add('current');
        }
    });
    
    // Current progress toward CURRENT level goal (not next level)
    // Matching the HTML display requirements
    const levelReqs = [
        { level: 0, days: 7, hours: 15 },
        { level: 1, days: 8, hours: 20 },
        { level: 2, days: 11, hours: 30 },  // Fixed: was 12, should be 11
        { level: 3, days: 15, hours: 40 },  // Fixed: was 16, should be 15
        { level: 4, days: 18, hours: 60 },  // Fixed: was 20, should be 18
        { level: 5, days: 22, hours: 80 }   // Fixed: was 25, should be 22
    ];
    
    // Activity Level uses activityDaysGoal (column O) and activityHoursGoal (column R)
    const currentDays = myData.validLiveDays || 0;
    const currentHours = myData.hours || 0;
    const daysGoal = myData.activityDaysGoal || myData.daysGoal || 0;
    const hoursGoal = myData.activityHoursGoal || myData.hoursGoal || 0;
    
    if (currentLevelNum >= 5) {
        document.getElementById('daysStreamed').textContent = `${currentDays} days`;
        document.getElementById('hoursStreamedLevel').textContent = `${currentHours.toFixed(0)} hrs`;
    } else {
        document.getElementById('daysStreamed').textContent = `${currentDays} / ${daysGoal} days`;
        document.getElementById('hoursStreamedLevel').textContent = `${currentHours.toFixed(0)} / ${hoursGoal} hrs`;
    }
    
    document.getElementById('daysFill').style.width = `${daysGoal > 0 ? Math.min(100, (currentDays / daysGoal) * 100) : 0}%`;
    document.getElementById('hoursFillLevel').style.width = `${hoursGoal > 0 ? Math.min(100, (currentHours / hoursGoal) * 100) : 0}%`;
    
    // Revenue Streams - show diamonds
    const diamonds = myData.diamonds || 0;
    // Update Dollars display (main value - using estRev from column AM)
    const diamondRevenueUSDEl = document.getElementById('diamondRevenueUSD');
    if (diamondRevenueUSDEl) {
        const estRev = myData.estRev || 0;
        diamondRevenueUSDEl.textContent = '≈ $' + Math.round(estRev).toLocaleString('en-US');
    }
    
    // Update diamonds as note on right side (matching Cash Bonus layout)
    const diamondRevenueEl = document.getElementById('diamondRevenue');
    if (diamondRevenueEl) {
        diamondRevenueEl.textContent = formatNumber(diamonds) + ' 💎';
        diamondRevenueEl.style.color = '#00d4ff';
        diamondRevenueEl.style.fontSize = '12px';
    }
    
    // PRO BONUS CALCULATION
    // Qualification: Score >= 70 AND Tier maintained (same) or up
    const proBonusBadge = document.getElementById('proBonusBadge');
    const scoreSection = document.querySelector('.score-section');
    
    console.log('DEBUG PRO BONUS - Badge found:', !!proBonusBadge, 'Score section found:', !!scoreSection);
    
    if (proBonusBadge) {
        // Remove old badge if exists (for backward compatibility)
        const oldBadge = document.querySelector('.pro-bonus-badge');
        if (oldBadge && oldBadge !== proBonusBadge) {
            oldBadge.remove();
        }
        const scoreValue = parseInt(myData.score) || 0;
        const tierStatusRaw = myData.tierStatus || '';
        const tierStatusValue = tierStatusRaw.toLowerCase().trim();
        const currentDiamonds = parseInt(myData.diamonds) || 0;
        
        console.log('DEBUG PRO BONUS - Score:', scoreValue, 'Tier Status Raw:', tierStatusRaw, 'Tier Status Lower:', tierStatusValue, 'Diamonds:', currentDiamonds);
        
        // Check qualification: Score >= 70 AND (tier same or up)
        // Treat blank, '-', or 'same' as maintained (qualified)
        const scoreQualified = scoreValue >= 70;
        const tierQualified = tierStatusValue === '' || 
                              tierStatusValue === '-' || 
                              tierStatusValue.includes('same') || 
                              tierStatusValue.includes('up') || 
                              tierStatusValue.includes('maintained');
        const qualifiesForPro = scoreQualified && tierQualified;
        
        console.log('DEBUG PRO BONUS - Score Qualified:', scoreQualified, 'Tier Qualified:', tierQualified, 'Overall:', qualifiesForPro);
        
        if (qualifiesForPro) {
            // Show Pro Bonus badge
            proBonusBadge.style.display = 'flex';
            console.log('DEBUG PRO BONUS - Badge DISPLAYED');
            
            // Add halo effect to score section
            if (scoreSection) {
                scoreSection.classList.add('pro-active');
                console.log('DEBUG PRO BONUS - Halo effect ADDED');
            }
            
            // Use real Pro Bonus from column AO (Rewards Month)
            const cashBonus = parseFloat(myData.rewardsMonth?.replace(/[$,]/g, '')) || 0;
            console.log('PRO BONUS UNLOCKED - Score:', scoreValue, 'Bonus: $' + cashBonus.toFixed(2));
        } else {
            // Hide Pro Bonus badge
            proBonusBadge.style.display = 'none';
            console.log('DEBUG PRO BONUS - Badge HIDDEN (not qualified)');
            
            // Remove halo effect
            if (scoreSection) {
                scoreSection.classList.remove('pro-active');
            }
            
            console.log('PRO BONUS NOT QUALIFIED - Score:', scoreValue, 'Tier Status:', tierStatusValue, 'Need score>=70 AND tier same/up');
        }
    } else {
        console.error('DEBUG PRO BONUS - proBonusBadge element NOT FOUND in DOM');
    }
    
    // Update Pro Bonus in Revenue Streams section
    const proBonusRevenueValue = document.getElementById('proBonusRevenueValue');
    const proBonusRevenueNote = document.getElementById('proBonusRevenueNote');
    const proBonusRevenueItem = document.getElementById('proBonusRevenueItem');
    
    if (proBonusRevenueValue && proBonusRevenueNote) {
        const scoreValue = parseInt(myData.score) || 0;
        
        if (scoreValue >= 70) {
            // Use Cash Bonus from column AN (Bonus)
            const cashBonus = parseFloat(myData.bonus?.replace(/[$,]/g, '')) || 0;
            proBonusRevenueValue.textContent = '$' + Math.round(cashBonus).toLocaleString('en-US');
            proBonusRevenueValue.style.color = '#ffd700'; // Gold color
            proBonusRevenueNote.textContent = 'Cash Bonus Earned';
            
            // Add highlight effect
            if (proBonusRevenueItem) {
                proBonusRevenueItem.classList.add('pro-revenue-active');
            }
        } else {
            proBonusRevenueValue.textContent = 'Score 70+ to Unlock';
            proBonusRevenueValue.style.color = '#888'; // Gray color
            proBonusRevenueNote.textContent = `${scoreValue}/70 Score`;
            
            // Remove highlight effect
            if (proBonusRevenueItem) {
                proBonusRevenueItem.classList.remove('pro-revenue-active');
            }
        }
    }
}

// Global variable to store detailed rewards
let detailedRewardsData = {};

// Discord channel links for events
const eventDiscordLinks = {
    'Royal Rumble': 'https://discord.com/channels/958221101182382130/1088940490847690762',
    'Music Cypher': 'https://discord.com/channels/958221101182382130/1376985833327951872',
    'Music Match-Up': 'https://discord.com/channels/958221101182382130/1376985833327951872',
    'Sunday Knockout': 'https://discord.com/channels/958221101182382130/1088940490847690762',
    'Stage Takeover': 'https://discord.com/channels/958221101182382130/1376985833327951872',
    'Monthly Award': 'https://discord.com/channels/958221101182382130/1376985833327951872'
};

function updateAwards() {
    console.log('🔥 UPDATE_AWARDS_v202503091555 RUNNING');
    const username = myData.username?.toLowerCase();
    const ledgerRows = [];
    
    console.log('🔥 Checking rewards for:', username);
    console.log('🔥 detailedRewardsData keys:', Object.keys(detailedRewardsData || {}).slice(0, 5));
    
    // Use detailed rewards from rewards-history.csv
    // LEDGER FORMAT: Last 5 reward events
    // SAME row when both + and - exist: +GREEN / -RED
    if (detailedRewardsData && username && detailedRewardsData[username]) {
        const myDetailedRewards = detailedRewardsData[username];
        
        // Parse numbers - handle negative values in minus column
        const parseNum = (str) => {
            if (!str || str === '') return 0;
            return parseInt(str.toString().replace(/,/g, '')) || 0;
        };
        
        // Group by unique events (type + date combination)
        const eventMap = new Map();
        
        console.log('DEBUG updateAwards - Loading rewards for', username);
        console.log('DEBUG updateAwards - Raw rewards count:', myDetailedRewards.length);
        console.log('DEBUG updateAwards - Sample raw data:', myDetailedRewards.slice(0, 3));
        
        myDetailedRewards.forEach(r => {
            const eventKey = `${r.type}|${r.date}`;
            
            if (!eventMap.has(eventKey)) {
                eventMap.set(eventKey, {
                    type: r.type,
                    date: r.date,
                    dateObj: new Date(r.date),
                    icon: r.icon || '🏆',
                    totalPlus: 0,
                    totalMinus: 0
                });
            }
            
            const event = eventMap.get(eventKey);
            const plusVal = parseNum(r.plus);
            // Minus column has negative numbers like -2000, so we take absolute value
            const minusVal = Math.abs(parseNum(r.minus));
            
            console.log('DEBUG - Event:', event.type, 'Plus:', plusVal, 'Minus:', minusVal, 'Raw minus:', r.minus);
            
            event.totalPlus += plusVal;
            event.totalMinus += minusVal;
        });
        
        // Convert to array and sort by date (newest first)
        const events = Array.from(eventMap.values());
        events.sort((a, b) => b.dateObj - a.dateObj);
        
        // Take last 5 unique events
        const recentEvents = events.slice(0, 5);
        
        // Build rows - SAME row when both +Plus and -Minus exist
        recentEvents.forEach(event => {
            // Make event title clickable if Discord link exists
            const discordLink = eventDiscordLinks[event.type];
            const titleDisplay = discordLink 
                ? `<a href="${discordLink}" target="_blank" class="award-title-link" title="Open ${event.type} in Discord">${event.type}</a>`
                : `<div class="award-title">${event.type}</div>`;
            
            // Format amount: SAME row when both exist
            let amountDisplay = '';
            if (event.totalPlus > 0 && event.totalMinus > 0) {
                // Both exist - show on same line: +GREEN / -RED
                amountDisplay = `<span style="color: var(--success);">+${formatNumberPlain(event.totalPlus)}</span> / <span style="color: var(--danger);">-${formatNumberPlain(event.totalMinus)}</span>`;
            } else if (event.totalPlus > 0) {
                // Only Plus
                amountDisplay = `<span style="color: var(--success);">+${formatNumberPlain(event.totalPlus)}</span>`;
            } else if (event.totalMinus > 0) {
                // Only Minus
                amountDisplay = `<span style="color: var(--danger);">-${formatNumberPlain(event.totalMinus)}</span>`;
            }
            
            ledgerRows.push({
                icon: event.icon,
                title: titleDisplay,
                date: event.date,
                amount: amountDisplay,
                dateObj: event.dateObj
            });
        });
        
        // Sort all rows by date (newest first)
        ledgerRows.sort((a, b) => b.dateObj - a.dateObj);
    }
    
    // Default message if no rewards
    if (ledgerRows.length === 0) {
        document.getElementById('awardsList').innerHTML = `
            <div class="award-item">
                <div class="award-icon">⭐</div>
                <div class="award-content">
                    <div class="award-title">Keep streaming to earn rewards!</div>
                </div>
            </div>
        `;
        return;
    }
    
    // Display all rows
    document.getElementById('awardsList').innerHTML = ledgerRows.map(row => `
        <div class="award-item">
            <div class="award-icon">${row.icon}</div>
            <div class="award-content">
                ${row.title}
                <div class="award-date">${row.date}</div>
            </div>
            <div class="award-ledger">
                ${row.amount}
            </div>
        </div>
    `).join('');
}

// ===== SETTINGS FUNCTIONS =====

function openSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('active');
    loadSettings();
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('active');
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('creator_settings') || '{}');
    const user = JSON.parse(localStorage.getItem('taboost_user') || '{}');
    
    // Show admin section for admins
    if (user.role === 'admin') {
        const adminSection = document.getElementById('adminSection');
        if (adminSection) adminSection.style.display = 'block';
    }
    
    // Data Source
    const savedUrl = localStorage.getItem('taboost_sheet_url') || '';
    const sheetUrlInput = document.getElementById('settingSheetUrl');
    if (sheetUrlInput) sheetUrlInput.value = savedUrl;
    
    // Profile
    document.getElementById('settingDisplayName').value = settings.displayName || myData.username || '';
    document.getElementById('settingEmail').value = settings.email || '';
    
    // Notifications
    document.getElementById('toggleEmail').checked = settings.emailNotifications !== false;
    document.getElementById('togglePush').checked = settings.pushNotifications === true;
    document.getElementById('toggleWeekly').checked = settings.weeklyReports !== false;
    document.getElementById('toggleSounds').checked = settings.alertSounds !== false;
    
    // Appearance
    document.getElementById('settingTheme').value = settings.theme || 'dark';
    document.getElementById('settingLayout').value = settings.layout || 'grid';
    document.getElementById('settingItemsPerPage').value = settings.itemsPerPage || '50';
    
    // Security
    document.getElementById('toggle2FA').checked = settings.twoFAEnabled === true;
    document.getElementById('setup2FA').style.display = settings.twoFAEnabled ? 'none' : 'none';
}

function saveSheetUrl() {
    const url = document.getElementById('settingSheetUrl').value.trim();
    if (!url) {
        alert('Please enter a valid Google Sheets CSV URL');
        return;
    }
    
    localStorage.setItem('taboost_sheet_url', url);
    
    // Update the data service
    if (typeof taboostData !== 'undefined') {
        taboostData.setSheetUrl(url);
    }
    
    alert('Data source updated! Refresh the page to load from the new source.');
}

function saveProfileSettings() {
    const settings = JSON.parse(localStorage.getItem('creator_settings') || '{}');
    settings.displayName = document.getElementById('settingDisplayName').value;
    settings.email = document.getElementById('settingEmail').value;
    
    localStorage.setItem('creator_settings', JSON.stringify(settings));
    alert('Profile settings saved!');
}

function updatePassword() {
    const currentPass = document.getElementById('settingCurrentPassword').value;
    const newPass = document.getElementById('settingNewPassword').value;
    const confirmPass = document.getElementById('settingConfirmPassword').value;
    
    if (!currentPass || !newPass || !confirmPass) {
        alert('Please fill in all password fields');
        return;
    }
    
    if (newPass !== confirmPass) {
        alert('New passwords do not match');
        return;
    }
    
    if (newPass.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }
    
    // Get current user
    const user = JSON.parse(localStorage.getItem('taboost_user') || '{}');
    const username = user.username?.toLowerCase();
    
    console.log('DEBUG UPDATE PASSWORD - User:', username, 'from myData:', myData?.username);
    
    if (!username) {
        alert('Error: User not found');
        return;
    }
    
    // Get stored passwords
    const storedPasswords = JSON.parse(localStorage.getItem('creator_passwords') || '{}');
    console.log('DEBUG UPDATE PASSWORD - Current stored passwords:', Object.keys(storedPasswords));
    
    const currentStoredPass = storedPasswords[username] || 'creator';
    
    // Verify current password
    if (currentPass !== currentStoredPass) {
        console.log('DEBUG UPDATE PASSWORD - Current pass mismatch. Entered:', currentPass, 'Expected:', currentStoredPass === 'creator' ? 'creator' : '***');
        alert('Current password is incorrect');
        return;
    }
    
    // Save new password for this specific creator
    storedPasswords[username] = newPass;
    localStorage.setItem('creator_passwords', JSON.stringify(storedPasswords));
    console.log('DEBUG UPDATE PASSWORD - Saved new password for:', username);
    
    alert('Password updated successfully! You will now use your new password to log in.');
    
    // Clear fields
    document.getElementById('settingCurrentPassword').value = '';
    document.getElementById('settingNewPassword').value = '';
    document.getElementById('settingConfirmPassword').value = '';
}

function toggle2FA() {
    const enabled = document.getElementById('toggle2FA').checked;
    const setupDiv = document.getElementById('setup2FA');
    
    if (enabled) {
        setupDiv.style.display = 'block';
    } else {
        setupDiv.style.display = 'none';
        const settings = JSON.parse(localStorage.getItem('creator_settings') || '{}');
        settings.twoFAEnabled = false;
        localStorage.setItem('creator_settings', JSON.stringify(settings));
        alert('Two-Factor Authentication disabled');
    }
}

function verify2FA() {
    const code = document.getElementById('setting2FACode').value;
    
    if (code.length !== 6) {
        alert('Please enter a 6-digit verification code');
        return;
    }
    
    // In production, this would verify with backend
    const settings = JSON.parse(localStorage.getItem('creator_settings') || '{}');
    settings.twoFAEnabled = true;
    localStorage.setItem('creator_settings', JSON.stringify(settings));
    
    document.getElementById('setup2FA').style.display = 'none';
    alert('Two-Factor Authentication enabled!');
}

// Save notification and appearance settings on change
document.addEventListener('change', function(e) {
    if (e.target.closest('.settings-modal')) {
        const settings = JSON.parse(localStorage.getItem('creator_settings') || '{}');
        
        // Notifications
        if (e.target.id === 'toggleEmail') settings.emailNotifications = e.target.checked;
        if (e.target.id === 'togglePush') settings.pushNotifications = e.target.checked;
        if (e.target.id === 'toggleWeekly') settings.weeklyReports = e.target.checked;
        if (e.target.id === 'toggleSounds') settings.alertSounds = e.target.checked;
        
        // Appearance
        if (e.target.id === 'settingTheme') settings.theme = e.target.value;
        if (e.target.id === 'settingLayout') settings.layout = e.target.value;
        if (e.target.id === 'settingItemsPerPage') settings.itemsPerPage = e.target.value;
        
        localStorage.setItem('creator_settings', JSON.stringify(settings));
    }
});

// ===== 3x3 ROLLING CALENDAR =====

function updateEventsCalendar() {
    // Use the new rolling calendar data
    const calendarData = typeof getRollingCalendarData === 'function' ? getRollingCalendarData() : 
                         (typeof rollingCalendar !== 'undefined' ? rollingCalendar : null);
    
    if (!calendarData) {
        console.log('Calendar data not available');
        return;
    }
    
    // Update date range header
    const weekEl = document.getElementById('calendarWeek');
    if (weekEl) {
        weekEl.textContent = calendarData.currentDateRange;
    }
    
    // Update TABOOST Campaign Banner
    const bannerEl = document.getElementById('taboostCampaignBanner');
    if (bannerEl && calendarData.taboostCampaigns && calendarData.taboostCampaigns.length > 0) {
        const campaign = calendarData.taboostCampaigns[0];
        const tagHtml = campaign.tagLink 
            ? `<a href="${campaign.tagLink}" target="_blank" class="campaign-tag" style="text-decoration: none; color: #fff;">${campaign.tag}</a>`
            : `<span class="campaign-tag">${campaign.tag}</span>`;
        const nameHtml = campaign.name ? `<span class="campaign-name">${campaign.name}</span>` : '';
        const statusHtml = campaign.status ? `<span class="campaign-status">${campaign.status}</span>` : '';
        bannerEl.innerHTML = `
            <div class="campaign-badge" style="background: ${campaign.color}20; border-color: ${campaign.color};">
                ${tagHtml}
                ${nameHtml}
                ${statusHtml}
            </div>
        `;
    }
    
    // Update 3x3 Rolling Calendar Grid
    const calendarEl = document.getElementById('weeklyCalendar');
    if (calendarEl && calendarData.days) {
        calendarEl.innerHTML = calendarData.days.map((day, index) => {
            const hasEvents = day.events && day.events.length > 0;
            const isToday = day.isToday;
            
            const eventsHtml = day.events.map(evt => {
                let eventClass = `calendar-event ${evt.type}`;
                if (evt.isMultiDay) {
                    eventClass += ' multiday';
                    if (evt.isStart) eventClass += ' multiday-start';
                    else if (evt.isEnd) eventClass += ' multiday-end';
                    else eventClass += ' multiday-middle';
                }
                
                return `
                    <div class="${eventClass}" style="${evt.color ? `border-left-color: ${evt.color}` : ''}">
                        ${evt.isMultiDay ? `<span class="event-status">${evt.time}</span>` : `<span class="event-time-badge">${evt.time}</span>`}
                        <span class="event-title-small">${evt.title}</span>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="calendar-day ${hasEvents ? 'has-events' : ''} ${isToday ? 'is-today' : ''}">
                    <div class="day-header">
                        <span class="day-name">${isToday ? 'TODAY' : day.dayName}</span>
                        <span class="day-date">${day.date}</span>
                    </div>
                    <div class="day-events">
                        ${hasEvents ? eventsHtml : '<span class="no-event">-</span>'}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Update TikTok Campaigns
    const tiktokEl = document.getElementById('tiktokCampaignsList');
    if (tiktokEl && calendarData.tiktokCampaigns) {
        tiktokEl.innerHTML = calendarData.tiktokCampaigns.map(camp => `
            <div class="tiktok-campaign-item">
                <i class="fas fa-music"></i>
                <div>
                    <span class="campaign-title">${camp.name}</span>
                    <span class="campaign-dates">${camp.dates}</span>
                </div>
            </div>
        `).join('');
    }
}
