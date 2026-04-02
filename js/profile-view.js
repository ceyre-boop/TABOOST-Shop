/**
 * TABOOST-Shop Profile Controller
 * Hydrates structurally-synced profile.html with specific creator data.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Protection & Auth Check
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return; 

    // 2. Identify Creator
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('id') || currentUser.creatorId || currentUser.id;
    
    // Ensure shop-data is loaded
    if (typeof allShopData === 'undefined') {
        console.error('shop-data.js not loaded');
        return;
    }

    // Find creator in dataset
    const creator = allShopData.find(c => (c.creatorId || c.id || "").toString() === (targetId || "").toString());

    if (!creator) {
        console.warn('Creator not found:', targetId);
        // Fallback to current user if param fails
        hydrateProfile(currentUser);
        initCharts(currentUser);
        renderAwards(currentUser);
    } else {
        hydrateProfile(creator);
        initCharts(creator);
        renderAwards(creator);
    }
    
    // Global components
    renderCalendar();
    updateLastUpdated();
});

function hydrateProfile(c) {
    document.title = `${c.name} | TABOOST Shop`;
    document.getElementById('creatorName').textContent = c.name;
    document.getElementById('managerNameFooter').textContent = c.manager || 'your manager';

    // Badges (Level + Tier)
    const badgesContainer = document.getElementById('creatorBadges');
    badgesContainer.innerHTML = `
        <span class="badge badge-level">Level ${c.level || 1}</span>
        <span class="badge badge-tier">Tier ${c.tier || 1}</span>
    `;
    document.getElementById('currentLevelBadge').textContent = `Level ${c.level || 1}`;

    // Main Stats
    document.getElementById('currentGMV').textContent = formatCurrency(c.totalGMV || 0);
    document.getElementById('totalPoints').textContent = (c.points || 0).toLocaleString();
    document.getElementById('totalPointsEarned').textContent = `Total Points Earned: ${(c.points || 0).toLocaleString()}`;

    // Rank
    document.getElementById('currentRank').textContent = c.rankLabel || '#--';
    const rankPercent = 100 - (parseInt(c.rankLabel?.replace('#', '') || 100) / 2.37);
    document.getElementById('rankBar').style.width = `${Math.min(100, Math.max(10, rankPercent))}%`;

    // Revenue section
    document.getElementById('commissionsUSD').textContent = formatCurrency((c.points || 0) * 0.01); // Mock 1 cent per point
    document.getElementById('commissionsRaw').textContent = `${(c.points || 0).toLocaleString()} points`;

    // Progress Tabs
    updateProgress('sv', c.sv || 0, 22);
    updateProgress('sold', c.sold || 0, 500);
    updateProgress('tap', c.tap || 0, 1000);

    // Greetings
    const greeting = ["Keep grinding!", "You're doing great!", "Let's secure the bag!", "Hustle mode on!"][Math.floor(Math.random()*4)];
    document.getElementById('welcomeMessage').textContent = greeting;
}

function updateProgress(prefix, value, goal) {
    const textElem = document.getElementById(`${prefix}Progress`);
    const fillElem = document.getElementById(`${prefix}Fill`);
    if (textElem) textElem.textContent = `${value.toLocaleString()} / ${goal.toLocaleString()}`;
    if (fillElem) fillElem.style.width = `${Math.min(100, (value / goal) * 100)}%`;
}

function formatCurrency(num) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(num);
}

function updateLastUpdated() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('lastUpdatedTime').textContent = `${dateStr} at 5:00 PM PT`;
}

function initCharts(c) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    const history = c.history || {};
    const data = [history.m5||0, history.m4||0, history.m3||0, history.m2||0, history.m1||0, c.totalGMV||0];
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'Now'],
            datasets: [{
                label: 'GMV',
                data: data,
                borderColor: '#ff0050',
                backgroundColor: 'rgba(255, 0, 80, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#888' } },
                x: { grid: { display: false }, ticks: { color: '#888' } }
            }
        }
    });
}

function renderAwards(c) {
    const grid = document.getElementById('awardsGrid');
    const count = document.getElementById('awardCount');
    const awards = [
        { name: 'Million Club', icon: '💎', unlocked: c.totalGMV >= 1000000 },
        { name: 'SV Master', icon: '🎬', unlocked: c.sv >= 50 },
        { name: 'TaP King', icon: '📈', unlocked: c.tap >= 2000 },
        { name: 'Top Tier', icon: '🌟', unlocked: c.tier >= 3 },
        { name: 'Points Pro', icon: '💰', unlocked: c.points >= 1000 },
        { name: 'Growth Star', icon: '🚀', unlocked: true }
    ];

    const unlockedCount = awards.filter(a => a.unlocked).length;
    count.textContent = `${unlockedCount} unlocked`;

    grid.innerHTML = awards.map(a => `
        <div class="achievement-item ${a.unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon">${a.icon}</div>
            <div class="achievement-info">
                <div class="achievement-name">${a.name}</div>
            </div>
        </div>
    `).join('');
}

function renderCalendar() {
    const calendarContainer = document.getElementById('weeklyCalendar');
    const rangeElem = document.getElementById('calendarRange');
    const calendarData = typeof generateRollingCalendar === 'function' ? generateRollingCalendar() : [];
    
    if (calendarData.length > 0) {
        rangeElem.textContent = `${calendarData[0].displayDate} - ${calendarData[calendarData.length-1].displayDate}`;
    }

    calendarContainer.innerHTML = calendarData.map(day => `
        <div class="calendar-day ${day.isToday ? 'today' : ''}">
            <div class="day-header">
                <span class="day-name">${day.name}</span>
                <span class="day-date">${day.date}</span>
                <span class="day-month">${day.month}</span>
            </div>
            <div class="day-events">
                ${day.events.map(ev => `
                    <div class="event-pill ${ev.type}">
                        <span class="event-time">${ev.time}</span>
                        <span class="event-title">${ev.title}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}
