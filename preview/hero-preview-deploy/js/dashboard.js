// Creator Dashboard - Personal Analytics
// Tracks creators by Creator ID (internal), displays by username

let myData = null;
let allCreators = [];
let performanceChart = null;
let creatorMonths = {}; // Real month data from CSV column F
let creatorIdMap = {}; // Map creatorId to creator data
let detailedRewards = {}; // Detailed rewards from rewards-history.csv

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
    detailedRewards = await loadDetailedRewards();
    console.log('DEBUG - Detailed rewards loaded for', Object.keys(detailedRewards).length, 'creators');
    
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
            c.username.toLowerCase() === user.name.toLowerCase().replace(' ', '')
        ) || allCreators.find(c => c.username === 'singleonthemove') || allCreators[0];
        console.log('DEBUG - Found by fallback:', myData.username, 'Score:', myData.score, 'creatorId:', myData.creatorId);
    }
    
    // Store creatorId for internal tracking (never displayed)
    myData._creatorId = myData.creatorId;
    
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
    document.getElementById('footerManager').textContent = myData.manager || 'your manager';
    
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
    
    // Get Tier directly from myData (column V) and Score from myData (column AG)
    // Tier can be 0-5, so we need to check if it's defined, not just truthy
    let tier = '-';
    if (myData.tier !== undefined && myData.tier !== null && myData.tier !== '') {
        tier = myData.tier;
    } else if (creatorBadges[creatorId] && creatorBadges[creatorId].tier !== undefined) {
        tier = creatorBadges[creatorId].tier;
    }
    const score = myData.score || 0; // Use score directly from CSV (column AG)
    
    console.log('DEBUG - Profile Score:', score, 'Tier:', tier, 'Creator:', myData.username);
    
    // Manager pill
    document.getElementById('managerName').textContent = myData.manager || 'Not assigned';
    
    // Badges - Level, Tier (col V), Score (col AG)
    document.getElementById('creatorBadges').innerHTML = `
        <span class="badge badge-level">Level ${myData.level || '--'}</span>
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
    document.getElementById('currentUSD').textContent = formatUSD(myData.diamonds);
    
    // Growth trend
    const growth = parseFloat(myData.growthPercent) || 0;
    const trendEl = document.getElementById('diamondTrend');
    trendEl.innerHTML = `
        <span class="trend-indicator ${growth >= 0 ? 'up' : 'down'}">
            <i class="fas fa-arrow-${growth >= 0 ? 'up' : 'down'}"></i>
            ${Math.abs(growth).toFixed(1)}% vs last month
        </span>
    `;
    
    // Rewards - Get data from myData
    const lastLabel = myData.lastRewardLabel || '';
    const earnedValue = myData.rewards && myData.rewards.earned ? myData.rewards.earned : 0;
    
    console.log('REWARDS DEBUG - lastRewardLabel:', lastLabel);
    console.log('REWARDS DEBUG - earnedValue:', earnedValue);
    console.log('REWARDS DEBUG - totalUnlocked:', myData.totalUnlocked);
    
    // Extract number from Last Label (e.g., "20K" from "3/02 Monthly Award 20K")
    const numberMatch = lastLabel.match(/([\d,.]+)([KMB]?)/i);
    let currentRewardsAvailable = '0';
    if (numberMatch) {
        const num = numberMatch[1];
        const suffix = numberMatch[2] || 'K';
        currentRewardsAvailable = num + suffix;
    }
    
    // If no Last Label, use earned value formatted
    if (currentRewardsAvailable === '0' && earnedValue > 0) {
        currentRewardsAvailable = formatNumber(earnedValue);
    }
    
    // Total earned = earned column
    const totalEarned = earnedValue || 0;
    
    console.log('REWARDS DEBUG - Final currentRewardsAvailable:', currentRewardsAvailable);
    console.log('REWARDS DEBUG - Final totalEarned:', totalEarned);
    
    // Update the DOM
    const totalRewardsEl = document.getElementById('totalRewards');
    const rewardsBreakdownEl = document.getElementById('rewardsBreakdown');
    
    if (totalRewardsEl) {
        totalRewardsEl.textContent = currentRewardsAvailable;
        console.log('REWARDS DEBUG - Set totalRewards to:', currentRewardsAvailable);
    } else {
        console.error('REWARDS DEBUG - totalRewards element NOT FOUND');
    }
    
    if (rewardsBreakdownEl) {
        rewardsBreakdownEl.innerHTML = `<span>Total Rewards Earned: ${formatNumber(totalEarned)}</span>`;
        console.log('REWARDS DEBUG - Set rewardsBreakdown to:', formatNumber(totalEarned));
    } else {
        console.error('REWARDS DEBUG - rewardsBreakdown element NOT FOUND');
    }
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
        
        // Hours goal mini bar
        const hoursFill = document.getElementById('hoursFill');
        const hoursGoalText = document.getElementById('hoursGoalText');
        if (hoursFill && hoursGoalText) {
            const hourPct = Math.min(100, ((myData.hours || 0) / (myData.hoursGoal || 15)) * 100);
            hoursFill.style.width = hourPct + '%';
            hoursGoalText.textContent = (myData.hoursGoal || 15) + 'h';
        }
    } catch (e) {
        console.log('Activity Stats elements not found (may have been removed):', e.message);
    }
}

function updateGoals() {
    const daysInMonth = 30;
    const today = new Date().getDate();
    const daysLeft = daysInMonth - today;
    document.getElementById('daysRemaining').textContent = daysLeft + ' days left in month';
    
    const goals = [
        {
            name: 'Hours Goal',
            icon: 'fa-clock',
            current: myData.hours || 0,
            target: myData.hoursGoal || 15,
            unit: 'h'
        },
        {
            name: 'Diamonds Target',
            icon: 'fa-gem',
            current: myData.diamonds || 0,
            target: (myData.diamondsLastMonth || 0) * 1.1,
            unit: ''
        },
        {
            name: 'Streaming Days',
            icon: 'fa-calendar',
            current: myData.liveStreams || 0,
            target: myData.daysGoal || 7,
            unit: ' days'
        }
    ];
    
    document.getElementById('goalsGrid').innerHTML = goals.map(g => {
        const pct = Math.min(100, (g.current / g.target) * 100);
        let status = 'at-risk';
        if (pct >= 100) status = 'on-track';
        else if (pct >= 60) status = 'on-track';
        else if (pct >= 40) status = 'behind';
        
        return `
            <div class="goal-card">
                <div class="goal-header">
                    <div class="goal-title">
                        <i class="fas ${g.icon}"></i>
                        <span>${g.name}</span>
                    </div>
                    <span class="goal-status ${status}">${status.replace('-', ' ')}</span>
                </div>
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill ${status}" style="width: ${pct}%"></div>
                </div>
                <div class="goal-numbers">
                    <span>${formatNumber(g.current)}${g.unit} / ${formatNumber(g.target)}${g.unit}</span>
                    <span>${pct.toFixed(0)}%</span>
                </div>
            </div>
        `;
    }).join('');
}

// Load creator historical trends from real 6-month data
let creatorTrends = {};

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
        
        const hasRealData = trends && trends.diamondsHistory && trends.diamondsHistory.length === 6;
        console.log('DEBUG - hasRealData:', hasRealData);
        
        // Always use 6-month view with real data or fallback
        let labels, dataPoints;
        if (hasRealData) {
            labels = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'This Month'];
            dataPoints = trends.diamondsHistory;
            console.log('DEBUG - Using real 6-month data:', dataPoints);
        } else {
            // Fallback: use CSV data columns
            labels = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'This Month'];
            const current = myData.diamonds || 0;
            const lastMonth = myData.diamondsLastMonth || current;
            const twoMonthsAgo = myData.diamondsTwoMonthsAgo || lastMonth;
            // Use available data or create trend
            dataPoints = [
                twoMonthsAgo || current * 0.8,
                lastMonth || current * 0.9,
                current * 0.95,
                current * 0.98,
                current * 0.99,
                current
            ];
            console.log('DEBUG - Using fallback data:', dataPoints);
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
            pointRadius: hasRealData ? 4 : 6
        }]
    };
    
    // Add growth rate line if we have real 6-month data
    if (hasRealData && trends.growthRates) {
        data.datasets.push({
            label: 'Growth %',
            data: trends.growthRates,
            borderColor: '#00ff88',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            yAxisID: 'y1',
            tension: 0.4,
            pointRadius: 3
        });
    }
    
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
                            if (context.dataset.label === 'Growth %') {
                                return context.parsed.y + '% growth';
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
                y1: hasRealData && !isMobile ? {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { display: false },
                    ticks: {
                        color: '#00ff88',
                        font: { size: 9 },
                        callback: v => v + '%'
                    }
                } : undefined,
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
            
            // Always show real 6-month historical data
            if (hasRealData) {
                performanceChart.data.labels = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'This Month'];
                performanceChart.data.datasets[0].data = trends.diamondsHistory;
                if (performanceChart.data.datasets[1]) {
                    performanceChart.data.datasets[1].data = trends.growthRates;
                }
            } else {
                // Fallback to available data
                performanceChart.data.labels = ['2 Months Ago', 'Last Month', 'This Month'];
                performanceChart.data.datasets[0].data = [
                    myData.diamondsTwoMonthsAgo || 0,
                    myData.diamondsLastMonth || 0,
                    myData.diamonds || 0
                ];
            }
            performanceChart.update();
        });
    });
    
    // Insights using real data
    const avg = allCreators.reduce((a, c) => a + (c.diamonds || 0), 0) / allCreators.length;
    const diff = ((myData.diamonds || 0) - avg) / avg * 100;
    
    let trendInsight = '';
    if (hasRealData && trends.growthRates) {
        const avgGrowth = trends.growthRates.slice(1).reduce((a, b) => a + b, 0) / 5;
        const growthClass = avgGrowth >= 0 ? 'positive' : 'negative';
        trendInsight = `
            <div class="insight-item ${growthClass}">
                <i class="fas fa-chart-line"></i>
                <span>6-month avg growth: ${avgGrowth >= 0 ? '+' : ''}${avgGrowth.toFixed(1)}%</span>
            </div>
        `;
    }
    
    document.getElementById('chartInsights').innerHTML = `
        <div class="insight-item ${diff >= 0 ? 'positive' : 'negative'}">
            <i class="fas fa-chart-bar"></i>
            <span>${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% vs agency average</span>
        </div>
        ${trendInsight}
        <div class="insight-item">
            <i class="fas fa-calculator"></i>
            <span>${formatNumber((myData.diamonds || 0) / (myData.liveStreams || 1))} diamonds per stream</span>
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
        { name: 'Reward King', icon: '💰', unlocked: !!(myData.cashBonus || myData.bonusMTD || (myData.diamonds || 0) >= 100000), desc: 'Earned a Bonus this month' },
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
    const rows = [
        {
            period: 'Feb 2026',
            diamonds: myData.diamonds,
            usd: formatUSD(myData.diamonds),
            rewards: formatNumber(myData.rewards?.earned || 0),
            change: myData.growthPercent || '0%'
        },
        {
            period: 'Jan 2026',
            diamonds: myData.diamondsLastMonth,
            usd: formatUSD(myData.diamondsLastMonth),
            rewards: '--',
            change: '--'
        },
        {
            period: 'Dec 2025',
            diamonds: myData.diamondsTwoMonthsAgo,
            usd: formatUSD(myData.diamondsTwoMonthsAgo),
            rewards: '--',
            change: '--'
        }
    ];
    
    document.getElementById('historyTableBody').innerHTML = rows.map(r => {
        const changeNum = parseFloat(r.change);
        const changeClass = isNaN(changeNum) ? '' : changeNum >= 0 ? 'up' : 'down';
        const changeIcon = isNaN(changeNum) ? '' : changeNum >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        return `
            <tr>
                <td><strong>${r.period}</strong></td>
                <td>${formatNumber(r.diamonds)} 💎</td>
                <td style="color: var(--success);">${r.usd}</td>
                <td>${r.rewards}</td>
                <td>
                    ${r.change !== '--' ? `
                        <span class="trend-indicator ${changeClass}">
                            <i class="fas ${changeIcon}"></i> ${r.change}
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
    
    // Activity Level based on Column U (💎 Pace)
    const pace = myData.diamondPace || 0;
    let activityLevel = 'Low';
    let activityColor = '#888';
    
    if (pace > 300000) {
        activityLevel = 'Great';
        activityColor = '#4ade80'; // Green
    } else if (pace >= 1000) {
        activityLevel = 'Good';
        activityColor = '#60a5fa'; // Blue
    } else {
        activityLevel = 'Low';
        activityColor = '#ef4444'; // Red
    }
    
    const activityEl = document.getElementById('scoreActivity');
    activityEl.textContent = activityLevel;
    activityEl.style.color = activityColor;
    document.getElementById('scoreDiamonds').textContent = formatNumber(threeMonthDiamonds);
    document.getElementById('scoreTrend').textContent = growth >= 0 ? `+${growth}%` : `${growth}%`;
    document.getElementById('scoreTrend').style.color = growth >= 0 ? 'var(--taboost-success)' : 'var(--taboost-red)';
    
    // Activity Level Visual
    const currentLevel = myData.level || 1;
    document.getElementById('currentLevelBadge').textContent = `Level ${currentLevel}`;
    
    // Update level steps
    document.querySelectorAll('.level-step').forEach(step => {
        const levelNum = parseInt(step.dataset.level);
        step.classList.remove('completed', 'current');
        if (levelNum < currentLevel) {
            step.classList.add('completed');
        } else if (levelNum === currentLevel) {
            step.classList.add('current');
        }
    });
    
    // Current progress toward next level
    const levelReqs = [
        { level: 1, days: 8, hours: 8 },
        { level: 2, days: 12, hours: 20 },
        { level: 3, days: 16, hours: 35 },
        { level: 4, days: 20, hours: 50 },
        { level: 5, days: 25, hours: 70 }
    ];
    
    const nextLevelReq = levelReqs.find(r => r.level === currentLevel + 1) || levelReqs[4];
    const currentDays = myData.validLiveDays || 0;
    const currentHours = myData.hours || 0;
    
    if (currentLevel >= 5) {
        document.getElementById('daysStreamed').textContent = `${currentDays} days`;
        document.getElementById('hoursStreamedLevel').textContent = `${currentHours.toFixed(1)} hrs`;
    } else {
        document.getElementById('daysStreamed').textContent = `${currentDays} / ${nextLevelReq.days} days`;
        document.getElementById('hoursStreamedLevel').textContent = `${currentHours.toFixed(1)} / ${nextLevelReq.hours} hrs`;
    }
    
    document.getElementById('daysFill').style.width = `${Math.min(100, (currentDays / nextLevelReq.days) * 100)}%`;
    document.getElementById('hoursFillLevel').style.width = `${Math.min(100, (currentHours / nextLevelReq.hours) * 100)}%`;
    
    // Revenue Streams - only update elements that exist
    const diamondUSD = (myData.diamonds || 0) * 0.005;
    
    // Update Diamond Earnings (only remaining revenue item)
    const diamondRevenueEl = document.getElementById('diamondRevenue');
    if (diamondRevenueEl) {
        diamondRevenueEl.textContent = '≈ $' + Math.round(diamondUSD).toLocaleString('en-US');
    }
    
    const diamondCountEl = document.getElementById('diamondCount');
    if (diamondCountEl) {
        diamondCountEl.textContent = formatNumber(myData.diamonds) + ' 💎';
    }
    
    // Level Bonus and Score Reward removed - elements no longer exist
    console.log('DEBUG - Revenue: Diamond USD =', diamondUSD.toFixed(2));
}

function updateAwards() {
    console.log('DEBUG - updateAwards called for:', myData.username, 'CreatorID:', myData.creatorId);
    
    let awards = [];
    
    // NEW: Use detailed rewards from rewards-history.csv if available
    const creatorId = myData.creatorId || myData._creatorId;
    if (detailedRewards && creatorId && detailedRewards[creatorId]) {
        console.log('DEBUG - Found detailed rewards for creator:', creatorId);
        const myDetailedRewards = detailedRewards[creatorId];
        
        awards = myDetailedRewards.map(r => ({
            icon: '🏆',
            title: `${r.type} - ${r.amount} pts`,
            date: r.date,
            amount: r.amount
        }));
        
        console.log('DEBUG - Using detailed rewards:', awards.length);
    } else {
        console.log('DEBUG - No detailed rewards found, using fallback');
        
        // Fallback to creatorRewards (old method)
        const existingRewards = typeof creatorRewards !== 'undefined' ? creatorRewards[myData.username] : undefined;
        
        if (existingRewards && existingRewards.length > 0) {
            awards = existingRewards.map(rewardText => ({
                icon: '🏆',
                title: rewardText,
                date: 'Earned',
                amount: 'Reward'
            }));
        }
        
        // Check for last reward from column AQ
        if (myData.lastReward && myData.lastReward.trim()) {
            const alreadyExists = awards.some(a => a.title.includes(myData.lastReward));
            if (!alreadyExists) {
                awards.unshift({
                    icon: '🏆',
                    title: myData.lastReward,
                    date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    amount: 'Reward'
                });
            }
        }
    }
    
    // Keep only last 5 rewards
    if (awards.length > 5) {
        awards = awards.slice(0, 5);
    }
    
    console.log('DEBUG - Final awards to display:', awards.length);
    
    // Default message if no rewards
    if (awards.length === 0) {
        awards = [{
            icon: '⭐',
            title: 'Keep streaming to earn rewards!',
            date: '',
            amount: ''
        }];
    }
    
    document.getElementById('awardsList').innerHTML = awards.map(a => `
        <div class="award-item">
            <div class="award-icon">${a.icon}</div>
            <div class="award-content">
                <div class="award-title">${a.title}</div>
                <div class="award-date">${a.date}</div>
            </div>
            <div class="award-amount">${a.amount}</div>
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
    
    // In production, this would verify current password with backend
    alert('Password updated successfully!');
    
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

// ===== WEEKLY LIVE CALENDAR =====

function updateEventsCalendar() {
    // Check if weekly calendar data exists
    if (typeof weeklyCalendar === 'undefined') {
        console.log('Weekly calendar data not available');
        return;
    }
    
    // Update week header
    const weekEl = document.getElementById('calendarWeek');
    if (weekEl) {
        weekEl.textContent = weeklyCalendar.currentWeek;
    }
    
    // Update TABOOST Campaign Banner
    const bannerEl = document.getElementById('taboostCampaignBanner');
    if (bannerEl && weeklyCalendar.taboostCampaigns.length > 0) {
        const campaign = weeklyCalendar.taboostCampaigns[0];
        bannerEl.innerHTML = `
            <div class="campaign-badge" style="background: ${campaign.color}20; border-color: ${campaign.color};">
                <span class="campaign-tag">${campaign.tag}</span>
                <span class="campaign-name">${campaign.name}</span>
                <span class="campaign-status">${campaign.status}</span>
            </div>
        `;
    }
    
    // Update Weekly Schedule Grid
    const calendarEl = document.getElementById('weeklyCalendar');
    if (calendarEl) {
        calendarEl.innerHTML = weeklyCalendar.weeklySchedule.map(day => {
            const hasEvents = day.events.length > 0;
            const eventsHtml = day.events.map(evt => `
                <div class="calendar-event ${evt.type}">
                    <span class="event-time-badge">${evt.time}</span>
                    <span class="event-title-small">${evt.title}</span>
                </div>
            `).join('');
            
            return `
                <div class="calendar-day ${hasEvents ? 'has-events' : ''}">
                    <div class="day-header">
                        <span class="day-name">${day.day}</span>
                        <span class="day-date">${day.date}</span>
                    </div>
                    <div class="day-events">
                        ${hasEvents ? eventsHtml : '<span class="no-event">No events</span>'}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Update TikTok Campaigns
    const tiktokEl = document.getElementById('tiktokCampaignsList');
    if (tiktokEl) {
        tiktokEl.innerHTML = weeklyCalendar.tiktokCampaigns.map(camp => `
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
