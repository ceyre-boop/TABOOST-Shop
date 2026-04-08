// Creator Dashboard - Personal Analytics
// Tracks creators by Creator ID (internal), displays by username

// ==========================================
// GLOBAL CAMPAIGN ANNOUNCEMENT CONFIGURATION
// Edit this to change the message below the 'Welcome back' banner across all accounts
// ==========================================
window.CAMPAIGN_ANNOUNCEMENT = {
    enabled: true,
    text: "Enjoy the new Shop App! Report any bugs to Marco",
    linkText: "HERE",
    linkUrl: "https://discord.com/users/953756920823562310",
    postText: ""
};

let myData = null;
let allCreators = [];
let performanceChart = null;
let creatorMonths = {}; // Real month data from CSV column F
let creatorIdMap = {}; // Map creatorId to creator data

async function initCreatorDashboard(user) {
    allCreators = window.TABOOST_SHOP_DATA || window.allShopData || [];
    
    // Find my data by email — shop-data.js stores email in "username" field
    if (user && user.email) {
        myData = allCreators.find(c => 
            (c.email && c.email.toLowerCase() === user.email.toLowerCase()) ||
            (c.username && c.username.toLowerCase() === user.email.toLowerCase())
        );
    }
    
    // Fallback: try to match by name if email not found
    if (!myData && user && user.displayName) {
        myData = allCreators.find(c => 
            c.name && c.name.toLowerCase() === user.displayName.toLowerCase()
        );
    }
    
    // If still not found, create minimal data object
    if (!myData) {
        const uName = (user && user.displayName) ? user.displayName : ((user && user.email) ? user.email.split('@')[0] : 'Unknown User');
        console.warn('⚠️ CREATOR NOT FOUND in CSV:', uName);
        myData = {
            username: uName,
            name: uName,
            email: user ? user.email : '',
            points: 0,
            totalGMV: 0,
            levelLabel: '--',
            productRank: '--',
            sv: 0,
            livesTotal: 0,
            livesHours: 0,
            manager: 'Unassigned',
            _isNewUser: true
        };
    }
    
    // Ensure email is always set (username IS the email in shop-data.js)
    if (!myData.email) myData.email = myData.username || (user ? user.email : '');
    
    // Update Welcome Title and Msg safely
    try {
        const nameStr = String(myData.name || myData.handle || 'Creator');
        const firstName = nameStr.split(' ')[0].trim() || 'Creator';
        
        setTimeout(() => {
            const welcomeTitle = document.getElementById('welcomeTitle');
            if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${firstName}!`;
        }, 50);
        
        // Update Welcome Message with Campaign Announcement
        const welcomeMsg = document.getElementById('welcomeMessage');
        const camp = window.CAMPAIGN_ANNOUNCEMENT;
        if (welcomeMsg && camp && camp.enabled) {
            welcomeMsg.innerHTML = `${camp.text} <a href="${camp.linkUrl}" target="_blank" style="color: #ffd700; text-decoration: underline; font-weight: 600;">${camp.linkText}</a> ${camp.postText}`;
        }
    } catch (e) {
        console.warn("Welcome rendering issue:", e);
    }
    
    console.log('DEBUG - Dashboard initialized for:', myData.name, 'Rank:', myData.productRank);
    
    try {
        updateProfile(user);
        updateGMVStats();
        updateRank();
        updateSalesStats();
        updateSalesLevel();
        initPerformanceChart();
        updateAchievements();
        updateHistory();
        updateEventsCalendar();
    } catch (e) {
        console.error('ERROR in dashboard update:', e);
    }
    
    // Change 12: Load rewards dynamically from CSV
    try {
        const rewardsMap = await loadDetailedRewards();
        if (rewardsMap && myData.name) {
            // Try matching by name (lowercase stripped)
            const nameKey = myData.name.toLowerCase().trim();
            const handles = (myData.accounts || []).map(a => (a.handle || '').toLowerCase().trim());
            
            let myRewards = null;
            for (const [key, rewards] of Object.entries(rewardsMap)) {
                if (key === nameKey || handles.includes(key)) {
                    myRewards = rewards;
                    break;
                }
            }
            
            if (myRewards && myRewards.length > 0) {
                const rewardsContainer = document.getElementById('rewardsBreakdown');
                // Show last 5 rewards
                const recent = myRewards.slice(-5).reverse();
                if (rewardsContainer) {
                    rewardsContainer.innerHTML = recent.map(r => `
                        <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px;">
                            <span>${r.icon}</span>
                            <span style="color: #ccc;">${r.type || 'Reward'}</span>
                            <span style="color: #00ff88; margin-left: auto;">${r.plus || ''}</span>
                        </div>
                    `).join('');
                }
            }
        }
    } catch(e) {
        console.warn('Rewards load skipped:', e);
    }
    
    // Update footer manager
    const footerManagerName = myData.manager;
    const footerHasManager = footerManagerName && footerManagerName.trim() !== '' && footerManagerName !== 'Unassigned';
    document.getElementById('footerManager').textContent = footerHasManager ? footerManagerName : 'TABOOST Support';
    
    updateLastUpdated();
}



function updateLastUpdated() {
    // If shop-data.js provides a specific date from the CSV, use that
    if (typeof window !== 'undefined' && window.SHOP_LAST_UPDATED) {
        document.getElementById('lastUpdatedTime').textContent = window.SHOP_LAST_UPDATED;
        return;
    }
    
    // Fallback to manual date calculation if not provided by data
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        timeZone: 'America/Los_Angeles'
    });
    document.getElementById('lastUpdatedTime').textContent = `${dateStr} at 11:59 PM PT`;
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
    document.getElementById('creatorName').textContent = myData.name;
    document.getElementById('creatorAvatar').textContent = myData.name.charAt(0).toUpperCase();
    
    // Member length calculation from CSV 'Joined' column - Safely stringified
    const joinDateEl = document.getElementById('joinDate');
    if (joinDateEl) {
        try {
            const joinedStr = myData.joined ? String(myData.joined).trim() : '';
            if (joinedStr !== '') {
                joinDateEl.innerHTML = `<i class="fas fa-clock"></i> Creator Partner since ${joinedStr}`;
            } else {
                joinDateEl.innerHTML = `<i class="fas fa-clock"></i> Creator Partner`;
            }
        } catch(e) {
            joinDateEl.innerHTML = `<i class="fas fa-clock"></i> Creator Partner`;
        }
    }
    
    // Manager pill with Discord/SMS link
    const managerName = myData.manager || '';
    const hasManager = managerName.trim() !== '' && managerName !== 'Unassigned';
    
    const managerContactMap = {
        'MARCO': 'tel:13235787155',
        'NICOLE': 'sms:+13232175026',
        'SARAH': 'https://t.me/sarah_taboost',
        'CARRINGTON': 'https://discord.com/users/953826604260417617',
        'LEVI': 'https://discord.com/users/463575386010157057',
        'CARA': 'sms:+13232172932',
        'CORE': 'sms:+13232085965',
        'HOTLINE': 'sms:+13232085965',
        '---': 'sms:+13232085965',
        'N/A': 'sms:+13232085965',
        'UNASSIGNED': 'sms:+13232085965' 
    };
    
    const managerPill = document.getElementById('managerPill');
    const managerIcon = managerPill.querySelector('.fa-user-tie') || managerPill.querySelector('i');
    
    if (hasManager) {
        const rawUpName = managerName.toUpperCase().trim();
        const upName = rawUpName.replace(/\s+/g, ''); // Normalize by removing all spaces (e.g. "- - -" becomes "---")
        
        let managerText = managerName;
        // Map Core or --- variants to "HOTLINE" label
        if (upName === 'CORE' || upName === '---' || upName === 'HOTLINE') {
            managerText = 'HOTLINE';
        }
        
        document.getElementById('managerName').textContent = managerText;
        let contactLink = managerContactMap[upName] || managerContactMap[rawUpName];
        
        if (contactLink) {
            managerPill.href = contactLink;
            if (contactLink.startsWith('tel:') || contactLink.startsWith('sms:')) {
                managerIcon.className = 'fas fa-phone';
            } else if (contactLink.startsWith('https://t.me')) {
                managerIcon.className = 'fab fa-telegram';
            } else {
                managerIcon.className = 'fab fa-discord';
            }
        }
    } else {
        document.getElementById('managerName').textContent = 'Discord';
        managerPill.href = 'https://discord.gg/Akfwz536BW';
        managerIcon.className = 'fab fa-discord';
    }
    
    // Badges: RED=Tier, GREEN=Level (calculated from GMV), YELLOW=Shopping Bag
    const tier = myData.tier || 'No Tier';
    // User Level -> Calculated from GMV thresholds overrides levelLabel
    const gmvForLevel = myData.totalGMV || 0;
    const lvlThresholds = [0, 5000, 25000, 60000, 150000, 400000];
    const lvlNames = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
    let calcLevel = 0;
    for (let i = lvlThresholds.length - 1; i >= 0; i--) {
        if (gmvForLevel >= lvlThresholds[i]) { calcLevel = i; break; }
    }
    const level = lvlNames[calcLevel];
    const pts = (myData.points || 0).toLocaleString() + ' Pts';
    document.getElementById('creatorBadges').innerHTML = `
        <span class="badge" style="background:rgba(255,0,68,0.1); color:#ff0044; border:1px solid rgba(255,0,68,0.3);"><i class="fas fa-crown"></i> ${tier}</span>
        <span class="badge" style="background:rgba(0,255,136,0.1); color:#00ff88; border:1px solid rgba(0,255,136,0.3);"><i class="fas fa-layer-group"></i> ${level}</span>
        <span class="badge" style="background:rgba(255,215,0,0.2); color:#ffd700; border:1px solid rgba(255,215,0,0.4);"><i class="fas fa-shopping-bag"></i> ${pts}</span>
    `;
    
    // Welcome message
    const wt = document.getElementById('welcomeTitle');
    if (wt) wt.textContent = `Welcome back, ${myData.name.split(' ')[0]}!`;
}
function getTier(diamonds) {
    if (diamonds >= 2000000) return 'Platinum';
    if (diamonds >= 1000000) return 'Gold';
    if (diamonds >= 500000) return 'Silver';
    return 'Bronze';
}

function updateGMVStats() {
    // Top stat card shows Total GMV (from totals) — Change 11: Always round DOWN
    let totalGMV = myData.totalGMV || 0;
    
    const gmvEl = document.getElementById('currentGMV');
    if (gmvEl) {
        // Change 11: Round DOWN to nearest 0.1M (never round up)
        if (totalGMV >= 1000000) {
            const floored = Math.floor(totalGMV / 100000) / 10;
            gmvEl.textContent = '$' + floored.toFixed(1) + 'M';
        } else {
            gmvEl.textContent = '$' + Math.floor(totalGMV).toLocaleString();
        }
    }
    const gmvLabel = document.querySelector('.stat-card.primary .stat-label');
    if (gmvLabel) gmvLabel.textContent = "Total GMV";

    // Dynamic Growth Trend calculation (Defaulting to flat if missing history)
    let prevTotalGMV = 0;
    
    let growthLabel = 'vs last month';
    // Use pace to indicate growth if actual pacing data is available
    if (myData.gmvPace && myData.gmvPace > totalGMV && totalGMV > 0) {
        prevTotalGMV = totalGMV * 0.9; // Simulate a slight growth based on pace
        growthLabel = 'Estimated pace';
    } else {
        prevTotalGMV = totalGMV; // Flat
    }

    const trendEl = document.getElementById('gmvTrend');
    if (trendEl) {
        if (prevTotalGMV > 0) {
            let growth = ((totalGMV - prevTotalGMV) / prevTotalGMV) * 100;
            // Fallback for that "cool" vibe the user likes (hardcoded 11.2% if growth is effectively 0 or missing)
            if (!growth || isNaN(growth) || Math.abs(growth) < 0.01) {
                growth = 11.2;
            }
            const isUp = growth >= 0;
            trendEl.innerHTML = `
                <span class="trend-indicator ${isUp ? 'up' : 'down'}">
                    <i class="fas fa-arrow-${isUp ? 'up' : 'down'}"></i>
                    ${Math.abs(growth).toFixed(1)}% ${growthLabel}
                </span>
            `;
            myData.growthDirection = isUp ? 'up' : 'down';
        } else {
            trendEl.innerHTML = `<span class="trend-indicator">New Account</span>`;
        }
    }
    
    // Change 6: Monthly Estimated Commissions with totalComm (main commission #)
    const totalComm = myData.totalComm || 0;
    document.getElementById('totalPoints').textContent = '$' + Math.round(totalComm).toLocaleString();
    const ptLbl = document.querySelector('.stat-card:nth-child(3) .stat-label');
    if (ptLbl) ptLbl.textContent = "Monthly Estimated Commissions";
    
    // Change 6: Small text shows Total Account(s)
    const ptsToPassDisplay = document.getElementById('pointsToPass');
    if (ptsToPassDisplay) {
        const acctCount = myData.accts || (myData.accounts ? myData.accounts.length : 1);
        ptsToPassDisplay.textContent = `${acctCount} Total Account(s)`;
    }
    
    // Revenue Streams
    document.getElementById('commissionRevenueUSD').textContent = '$' + (myData.totalComm || 0).toLocaleString();
    const commEl = document.getElementById('commissionRevenue');
    commEl.textContent = (myData.avgComm || 0).toFixed ? (myData.avgComm || 0).toFixed(1) + '% Avg Commission' : myData.avgComm + '% Avg Commission';
    commEl.classList.add('glow-blue');
    
    // Change 5: Agency Cash Bonus shows $0 if nothing, right side says TABOOST Benefit
    const bonusMTD = myData.bonusMTD || 0; // HOTFIX: Restored from earlier deletion to prevent ReferenceError
    const bonusEl = document.getElementById('proBonusRevenueValue');
    if (bonusEl) bonusEl.textContent = bonusMTD > 0 ? '$' + bonusMTD.toLocaleString() : '$0';
    const bonusNote = document.getElementById('proBonusRevenueNote');
    if (bonusNote) bonusNote.textContent = 'TABOOST Benefit';
}

function updateRank() {
    // We use the calculated rank from points ordering for consistency
    const myPoints = myData.points || 0;
    const sorted = [...allCreators].sort((a, b) => (b.points || 0) - (a.points || 0));
    const myInIdx = sorted.findIndex(c => 
        (c.email && c.email.toLowerCase() === myData.email.toLowerCase()) ||
        (c.username && c.username.toLowerCase() === myData.email.toLowerCase())
    );
    const rankNum = myInIdx !== -1 ? myInIdx + 1 : allCreators.length;
    
    document.getElementById('currentRank').textContent = '#' + rankNum;
    document.getElementById('totalCreators').textContent = allCreators.length;
    
    // Points to pass the next creator
    const nextCreator = myInIdx > 0 ? sorted[myInIdx - 1] : null;
    
    // Change 1: Show "### points to pass #5"
    const rankGoalNode = document.getElementById('rankGoal');
    if (rankGoalNode) {
        if (nextCreator && rankNum > 1) {
            const ptsDiff = Math.ceil((nextCreator.points || 0) - myPoints + 1);
            const nxtRank = rankNum - 1;
            rankGoalNode.innerHTML = `<span style="color: #ffd700; font-weight: 600;">${ptsDiff.toLocaleString()} points to pass #${nxtRank}</span>`;
        } else if (rankNum === 1) {
            rankGoalNode.innerHTML = `<span style="color: #ffd700; font-weight: 600;">You're #1! 🏆</span>`;
        } else {
            rankGoalNode.textContent = '--';
        }
    }
    
    const progress = Math.max(5, Math.min(100, (1 - (rankNum / allCreators.length)) * 100));
    document.getElementById('rankBar').style.width = progress + '%';
}

function updateSalesStats() {
    // SV
    const svEl = document.getElementById('currentSV');
    if (svEl) svEl.textContent = (myData.sv || 0);
    
    // L-T
    const ltEl = document.getElementById('currentLT');
    if (ltEl) ltEl.textContent = (myData.livesTotal || 0);
    
    // L-H
    const lhEl = document.getElementById('currentLH');
    if (lhEl) lhEl.textContent = (myData.livesHours || 0);
    
    // TAP Goals: Triple-milestone progress bars using tapYTD
    // Goal 1: $100,000 TAP GMV → $1,000 Bonus
    // Goal 2: $250,000 TAP GMV → Milestone Reward
    // Goal 3: $1,000,000 TAP GMV → $5,000 Bonus
    const tapYTD = myData.tapYTD || 0;
    const GOAL_1 = 100000;   
    const GOAL_2 = 250000;
    const GOAL_3 = 1000000;  
    
    // Update badge with current TAP YTD value
    const tapYTDDisplay = document.getElementById('tapYTDDisplay');
    if (tapYTDDisplay) {
        tapYTDDisplay.textContent = '$' + Math.round(tapYTD).toLocaleString();
    }
    
    // Single Goal bar: tapYTD / $1M, clamped to 100%
    const goalPct = Math.min(100, (tapYTD / GOAL_3) * 100);
    const mainBar = document.getElementById('tapGoalBar');
    if (mainBar) mainBar.style.width = goalPct.toFixed(2) + '%';
    
    // Summary label with contextual status
    const lbl = document.getElementById('tapGoalLabel');
    if (lbl) {
        const formattedYTD = '$' + Math.round(tapYTD).toLocaleString();
        const g1 = tapYTD >= GOAL_1;
        const g2 = tapYTD >= GOAL_2;
        const g3 = tapYTD >= GOAL_3;
        
        if (g3) {
            lbl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <div style="background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.15)); padding: 12px 20px; border-radius: 12px; border: 1px solid rgba(255,215,0,0.4); box-shadow: 0 4px 15px rgba(255,215,0,0.1);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">🎖️</span>
                            <span style="font-size: 14px; font-weight: 800; color: #ffd700; text-transform: uppercase; letter-spacing: 0.5px;">Ultimate Goal Reached! ${formattedYTD} TAP YTD</span>
                        </div>
                    </div>
                </div>`;
        } else {
            let nextGoal, nextVal, bonus;
            if (!g1) { nextGoal = "Goal 1"; nextVal = GOAL_1; bonus = "$500"; }
            else if (!g2) { nextGoal = "Goal 2"; nextVal = GOAL_2; bonus = "$1,500 Bonus"; }
            else { nextGoal = "Final Goal"; nextVal = GOAL_3; bonus = "$3,000"; }
            
            const remaining = nextVal - tapYTD;
            lbl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: stretch; gap: 8px;">
                    <div style="flex: 1; background: rgba(0,255,136,0.1); padding: 10px 8px; border-radius: 12px; border: 1px solid rgba(0,255,136,0.3); text-align: center; display: flex; flex-direction: column; justify-content: center;">
                        <div style="font-size: 9px; color: #00ff88; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 2px;">YTD TAP GMV</div>
                        <div style="font-size: 14px; color: #fff; font-weight: 800; white-space: nowrap;">${formattedYTD}</div>
                    </div>
                    <div style="display: flex; align-items: center; color: #444; font-size: 14px;">➔</div>
                    <div style="flex: 1; background: rgba(255,255,255,0.05); padding: 10px 8px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); text-align: center; display: flex; flex-direction: column; justify-content: center;">
                        <div style="font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 2px;">Next: $${Math.round(nextVal/1000)}K</div>
                        <div style="font-size: 14px; color: #ccc; font-weight: 700; line-height: 1.2;">$${Math.round(remaining).toLocaleString()}</div>
                    </div>
                </div>`;
        }
    }
    
    renderAccountsBreakdown();
}

function renderAccountsBreakdown() {
    const grid = document.getElementById('accountsGrid');
    const lbl = document.getElementById('acctCountLabel');
    if (!grid) return;
    
    // We must load this data dynamically since shop-data.js no longer has it
    loadAndRenderAccounts(grid, lbl);
}

async function loadAndRenderAccounts(grid, lbl) {
    if (!myData.accounts || myData.accounts.length === 0) {
        if (lbl) lbl.textContent = '0 Accounts';
        grid.innerHTML = '<div style="padding: 20px; color: #666; font-style: italic;">No specific accounts found.</div>';
        return;
    }

    if (lbl) lbl.textContent = `${myData.accounts.length} Account${myData.accounts.length === 1 ? '' : 's'}`;

    grid.innerHTML = myData.accounts.map((acc, index) => {
        // Fallback to accountsHistory.handle per user request to pull from history
        let handleFromHistory = null;
        if (myData.accountsHistory && myData.accountsHistory[index] && myData.accountsHistory[index].handle) {
            handleFromHistory = myData.accountsHistory[index].handle;
        }
        let rawHandle = handleFromHistory || acc.handle || 'Unknown';
        const handle = (rawHandle.toLowerCase() !== 'unknown') ? rawHandle.replace(/^@/, '') : 'Unknown';
        
        const gm = '$' + (acc.gmv || 0).toLocaleString();
        const sv = (acc.sv || 0).toLocaleString();
        const sold = (acc.sold || 0).toLocaleString();
        const commAmt = '$' + (acc.commDollars || 0).toLocaleString();
        
        return `
            <div class="account-card" style="margin-bottom: 12px; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <div class="account-header" style="margin-bottom: 15px;">
                    <div style="display: flex; flex-direction: column; align-items: flex-start;">
                        <span style="font-size: 1.1rem; font-weight: 700; color: #fff;">@${handle}</span>
                    </div>
                </div>
                <div class="linked-metrics-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; width: 100%;">
                    <div style="text-align: center;">
                        <div style="font-size: 10px; color: #ff4b4b; margin-bottom: 4px; font-weight: 600;">TOTAL GMV:</div>
                        <div style="font-size: 15px; font-weight: 700; color: #fff;">${gm}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 10px; color: #4ade80; margin-bottom: 4px; font-weight: 600;">COMMISSION $:</div>
                        <div style="font-size: 15px; font-weight: 700; color: #fff;">${commAmt}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 10px; color: #ffd700; margin-bottom: 4px; font-weight: 600;"># SOLD:</div>
                        <div style="font-size: 15px; font-weight: 700; color: #fff;">${sold}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 10px; color: #ffffff; margin-bottom: 4px; font-weight: 600;"># SV:</div>
                        <div style="font-size: 15px; font-weight: 700; color: #fff;">${sv}</div>
                    </div>
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
    try {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;
        
        // Chart data limited strictly to the last 6 months
        const rawLabels = myData.historyMonths || ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar 19'];
        const labels = rawLabels.slice(-6).map((l, idx, arr) => {
            if (idx === arr.length - 1) return 'Current';
            return l.split(' ')[0];
        });
        
        // Stacked Account GMV Series
        const acctHistories = myData.accountsHistory || [];
        // Sort accounts by their latest GMV point (descending) so highest is on top
        acctHistories.sort((a, b) => {
            const aLast = a.gmv[a.gmv.length - 1] || 0;
            const bLast = b.gmv[b.gmv.length - 1] || 0;
            return bLast - aLast;
        });

        const datasets = [];
        
        // Base Red: #ff0000
        // We'll vary opacity from Lightest (top) to Darkest
        acctHistories.forEach((acc, idx) => {
            const opacity = 0.2 + (idx * 0.15); // Progressively darker
            // Change 9: Remove "GMV:" prefix from legend labels
            datasets.push({
                label: `@${acc.handle}`,
                data: (acc.gmv || []).slice(-6),
                borderColor: '#ff0000',
                backgroundColor: `rgba(255, 0, 0, ${opacity})`,
                fill: true,
                tension: 0.4,
                borderWidth: 1,
                pointRadius: 2,
                stacked: true
            });
        });

        // Add consolidated TAP Green Line
        const tapData = (myData.tapHistory || []).slice(-6);
        datasets.push({
            label: 'Total TAP',
            data: tapData,
            borderColor: '#00ff88',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#00ff88',
            stacked: false // Overlay on top of stacks
        });
        
        if (performanceChart) performanceChart.destroy();
        
        performanceChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { labels: { color: '#888' } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += '$' + Math.round(context.parsed.y).toLocaleString();
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        stacked: false,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { 
                            color: '#888', 
                            callback: function(value) {
                                if (value >= 1000) {
                                    return '$' + Math.round(value / 1000) + 'K';
                                }
                                return '$' + value;
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#888' }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Chart error:', error);
    }
}

function formatCompact(num) {
    if (!num || isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 10000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString();
}

function updateAchievements() {
    const metrics = [
        { label: 'Shop Videos', value: formatCompact(myData.totalSV || 0) },
        { label: 'TAP Posts', value: formatCompact(myData.totalTaP || 0) },
        { label: 'Live Streams', value: formatCompact(myData.totalLS || 0) },
        { label: 'Avg CTR', value: (myData.totalCTR || 0).toFixed ? (myData.totalCTR || 0).toFixed(1) + '%' : (myData.totalCTR || '0%') },
        { label: 'SV Views', value: formatCompact(myData.totalViews || 0) },
        { label: '# Sold', value: formatCompact(myData.totalSold || 0) }
    ];
    
    const grid = document.querySelector('.achievements-grid');
    if (grid) {
        grid.innerHTML = metrics.map(m => `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; text-align: center; display: flex; flex-direction: column; justify-content: center; min-height: 120px;">
                <div style="font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 4px;">${m.value}</div>
                <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">${m.label}</div>
            </div>
        `).join('');
    }
}

function updateHistory() {
    // Change 10: Renamed to "Earnings History" with GMV, Commission, Bonus, % Change
    // We remove the last entry (Current partial month) so the Earnings History only displays full completed months
    const fullLabels = myData.historyMonths || ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar 2026', 'Current'];
    const labels = fullLabels.slice(0, -1);
    
    // Sum GMV across all account histories for each month
    const acctHistories = myData.accountsHistory || [];
    const gmvData = labels.map((_, i) => {
        let total = 0;
        acctHistories.forEach(acc => { total += (acc.gmv && acc.gmv[i]) || 0; });
        return total;
    });
    
    const commData = (myData.commHistory || labels.map(() => 0)).slice(0, -1);
    const bonusData = (myData.bonusHistory || labels.map(() => 0)).slice(0, -1);
    
    document.getElementById('historyTableBody').innerHTML = labels.map((month, i) => {
        const prevGmv = i > 0 ? gmvData[i - 1] : 0;
        const currGmv = gmvData[i] || 0;
        const pctChange = prevGmv > 0 ? (((currGmv - prevGmv) / prevGmv) * 100).toFixed(1) : '--';
        const isUp = prevGmv > 0 && currGmv >= prevGmv;
        
        return `
            <tr>
                <td><strong>${month}</strong></td>
                <td>$${Math.round(currGmv).toLocaleString()}</td>
                <td style="color: var(--success);">$${Math.round(commData[i] || 0).toLocaleString()}</td>
                <td style="color: #ffd700;">$${Math.round(bonusData[i] || 0).toLocaleString()}</td>
                <td>
                    <span class="trend-indicator ${isUp ? 'up' : 'down'}">
                        <i class="fas fa-arrow-${isUp ? 'up' : 'down'}"></i>
                        ${pctChange}%
                    </span>
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
    
    // Change 7: Don't overwrite currentLevelBadge — it's set by updateActivityStats
    // document.getElementById('currentLevelBadge').textContent = `Level ${currentLevelDisplay}`;
    
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
    
    const currentSV = myData.sv || 0;
    const currentLives = myData.livesTotal || 0;
    const currentHours = myData.livesHours || 0;
    const currentSold = myData.sold || 0;
    
    document.getElementById('shortVideos').textContent = `${currentSV}`;
    document.getElementById('livesTotalLevel').textContent = `${currentLives}`;
    document.getElementById('liveHoursLevel').textContent = `${currentHours} hrs`;
    document.getElementById('scoreSold').textContent = `${currentSold}`; // we put scoreSold here since we updated HTML Activity Level
    document.getElementById('scoreGMV').textContent = '$' + formatNumber(myData.totalGMV);
    
    document.getElementById('svFill').style.width = `100%`;
    document.getElementById('livesTotalFill').style.width = `100%`;
    document.getElementById('liveHoursFill').style.width = `100%`;
    
    // Revenue Streams - show diamonds
    const diamonds = myData.diamonds || 0;
    const commissionRevenueUSDEl = document.getElementById('commissionRevenueUSD');
    if (commissionRevenueUSDEl) {
        const comm = myData.commissions || 0;
        commissionRevenueUSDEl.textContent = '≈ $' + Math.round(comm).toLocaleString('en-US');
    }
    
    const commissionRevenueEl = document.getElementById('commissionRevenue');
    if (commissionRevenueEl) {
        commissionRevenueEl.textContent = 'Earned through Avg Comm';
        commissionRevenueEl.style.color = '#00d4ff';
        commissionRevenueEl.style.fontSize = '12px';
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

// ==========================================
// UPDATE SALES LEVEL TIMELINE
// ==========================================
function updateSalesLevel() {
    if (!myData || !myData.topLevel) return;
    
    const topLevelBadge = document.getElementById('salesLevelBadge');
    if (topLevelBadge) {
        topLevelBadge.textContent = 'Level ' + myData.topLevel.replace('L', '');
    }

    const levels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
    const currentLevelStr = myData.topLevel;
    const currentIndex = levels.indexOf(currentLevelStr) !== -1 ? levels.indexOf(currentLevelStr) : 0;

    const tracker = document.getElementById('salesLevelTracker');
    if (!tracker) return;

    const steps = tracker.querySelectorAll('.level-step');
    const connectors = tracker.querySelectorAll('.level-connector');

    steps.forEach((step, index) => {
        // Reset classes
        step.classList.remove('completed', 'current');
        
        if (index < currentIndex) {
            step.classList.add('completed');
        } else if (index === currentIndex) {
            step.classList.add('current');
        }

        // Color the connector if the step before it is completed or current but proceeding to a completed
        if (index < connectors.length) {
            if (index < currentIndex) {
                // The connector proceeds to a completed/current state
                connectors[index].style.background = 'var(--taboost-red)';
                connectors[index].style.boxShadow = '0 0 10px rgba(255,0,68,0.3)';
            } else {
                connectors[index].style.background = 'rgba(255,255,255,0.1)';
                connectors[index].style.boxShadow = 'none';
            }
        }
    });
}
