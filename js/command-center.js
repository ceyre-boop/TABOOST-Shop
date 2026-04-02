// Command Center - Advanced Analytics & Visualizations

let commandData = null;
let sparklineChart = null;

async function initCommandCenter() {
    await taboostData.loadFromCSV();
    commandData = taboostData.getAllCreators();
    
    updateHeroStats();
    updateActivityFeed();
    updateTopMovers();
    updateGoalTracker();
    updateAchievements();
    updatePredictions();
    
    // Start live updates
    setInterval(() => {
        simulateLiveActivity();
    }, 30000);
}

// Format numbers
function formatNumber(num) {
    if (!num) return '0';
    // Always round DOWN — never show a tier/milestone the creator hasn't actually hit
    if (num >= 1000000) return (Math.floor(num / 100000) / 10) + 'M';
    if (num >= 1000) return (Math.floor(num / 100) / 10) + 'K';
    return num.toLocaleString();
}

function formatFullNumber(num) {
    return (num || 0).toLocaleString();
}

// Update Hero Stats
function updateHeroStats() {
    const stats = taboostData.calculateTotals();
    
    // Total diamonds
    document.getElementById('heroDiamonds').textContent = formatNumber(stats.totalDiamonds);
    document.getElementById('earnedTotal').textContent = formatNumber(stats.totalEarned);
    document.getElementById('bonusTotal').textContent = formatNumber(stats.totalBonus);
    document.getElementById('heroRewards').textContent = formatNumber(stats.totalEarned + stats.totalBonus);
    
    // Calculate growth vs last month
    const currentTotal = stats.totalDiamonds;
    const lastMonthTotal = commandData.reduce((sum, c) => sum + (c.diamondsLastMonth || 0), 0);
    const growth = lastMonthTotal > 0 ? ((currentTotal - lastMonthTotal) / lastMonthTotal * 100) : 0;
    
    const growthEl = document.getElementById('diamondGrowth');
    growthEl.textContent = Math.abs(growth).toFixed(1) + '%';
    growthEl.parentElement.className = growth >= 0 ? 'trend-up' : 'trend-down';
    growthEl.parentElement.innerHTML = `<i class="fas fa-arrow-${growth >= 0 ? 'up' : 'down'}"></i> ${Math.abs(growth).toFixed(1)}%`;
    
    // Sparkline chart
    createSparkline();
    
    // Currently streaming
    const streaming = commandData.filter(c => c.active === 'Y');
    document.getElementById('streamingNow').textContent = streaming.length;
    
    const avatarsContainer = document.getElementById('streamingAvatars');
    avatarsContainer.innerHTML = streaming.slice(0, 5).map(c => `
        <div class="streaming-avatar" title="${c.username}">${c.username.charAt(0).toUpperCase()}</div>
    `).join('');
    
    if (streaming.length > 5) {
        avatarsContainer.innerHTML += `<div class="streaming-avatar">+${streaming.length - 5}</div>`;
    }
}

// Create hero sparkline
function createSparkline() {
    const ctx = document.getElementById('heroSparkline');
    if (!ctx) return;
    
    // Get top 20 for sparkline
    const data = commandData
        .slice(0, 20)
        .map(c => c.diamonds || 0);
    
    if (sparklineChart) {
        sparklineChart.destroy();
    }
    
    sparklineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(data.length).fill(''),
            datasets: [{
                data: data,
                borderColor: '#ff0044',
                borderWidth: 2,
                fill: true,
                backgroundColor: 'rgba(255, 0, 68, 0.1)',
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

// Activity Feed
function updateActivityFeed() {
    const activities = generateActivities();
    const container = document.getElementById('activityList');
    
    container.innerHTML = activities.slice(0, 10).map(a => `
        <div class="activity-item">
            <div class="activity-icon ${a.type}">
                <i class="fas ${a.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${a.title}</div>
                <div class="activity-desc">${a.desc}</div>
            </div>
            <div class="activity-time">${a.time}</div>
        </div>
    `).join('');
}

function generateActivities() {
    const activities = [];
    
    // Recent awards from Last Label
    commandData.forEach(c => {
        if (c.lastLabel && c.lastLabel.trim()) {
            activities.push({
                type: 'award',
                icon: 'fa-trophy',
                title: c.username,
                desc: c.lastLabel,
                time: 'Recent'
            });
        }
        
        // Milestones (high diamonds)
        if (c.diamonds > 2000000) {
            activities.push({
                type: 'milestone',
                icon: 'fa-gem',
                title: `${c.username} hit ${formatNumber(c.diamonds)} diamonds!`,
                desc: 'Incredible milestone reached',
                time: 'This month'
            });
        }
        
        // Bonus awards
        if (c.rewards?.bonus > 5000) {
            activities.push({
                type: 'bonus',
                icon: 'fa-gift',
                title: `${c.username} earned bonus`,
                desc: `${formatNumber(c.rewards.bonus)} bonus awarded`,
                time: 'Recent'
            });
        }
    });
    
    return activities.sort(() => Math.random() - 0.5);
}

function simulateLiveActivity() {
    const randomCreator = commandData[Math.floor(Math.random() * commandData.length)];
    const container = document.getElementById('activityList');
    
    const newActivity = document.createElement('div');
    newActivity.className = 'activity-item';
    newActivity.innerHTML = `
        <div class="activity-icon milestone">
            <i class="fas fa-broadcast-tower"></i>
        </div>
        <div class="activity-content">
            <div class="activity-title">${randomCreator.username}</div>
            <div class="activity-desc">Started streaming</div>
        </div>
        <div class="activity-time">Just now</div>
    `;
    
    container.insertBefore(newActivity, container.firstChild);
    if (container.children.length > 10) {
        container.removeChild(container.lastChild);
    }
}

// Top Movers
function updateTopMovers() {
    const filter = document.getElementById('moverFilter')?.value || 'growth';
    let sorted = [...commandData];
    
    switch(filter) {
        case 'growth':
            sorted.sort((a, b) => {
                const ga = parseFloat(a.growthPercent) || -999;
                const gb = parseFloat(b.growthPercent) || -999;
                return gb - ga;
            });
            break;
        case 'diamonds':
            sorted.sort((a, b) => (b.diamonds || 0) - (a.diamonds || 0));
            break;
        case 'hours':
            sorted.sort((a, b) => (b.hours || 0) - (a.hours || 0));
            break;
    }
    
    const top3 = sorted.slice(0, 3);
    const container = document.getElementById('moversGrid');
    
    container.innerHTML = top3.map((c, i) => {
        const growth = parseFloat(c.growthPercent) || 0;
        const sparklineData = generateSparklineData(c);
        
        return `
            <div class="mover-card">
                <div class="mover-rank">#${i + 1}</div>
                <div class="mover-header">
                    <div class="mover-avatar">${c.username.charAt(0).toUpperCase()}</div>
                    <div class="mover-info">
                        <h4>${c.username}</h4>
                        <span>${c.manager || 'Unassigned'}</span>
                    </div>
                </div>
                <div class="mover-stats">
                    <div class="mover-stat">
                        <div class="value" style="color: var(--taboost-red);">${formatNumber(c.diamonds)}</div>
                        <div class="label">Diamonds</div>
                    </div>
                    <div class="mover-stat">
                        <div class="value" style="color: ${growth >= 0 ? 'var(--taboost-success)' : 'var(--taboost-red)'};">
                            ${growth > 0 ? '+' : ''}${growth}%
                        </div>
                        <div class="label">Growth</div>
                    </div>
                </div>
                <canvas class="mover-sparkline" id="sparkline-${i}"></canvas>
            </div>
        `;
    }).join('');
    
    // Create sparklines
    setTimeout(() => {
        top3.forEach((c, i) => {
            createMiniSparkline(`sparkline-${i}`, c);
        });
    }, 100);
}

function generateSparklineData(creator) {
    // Simulate trend data from historical
    return [
        creator.diamondsTwoMonthsAgo || 0,
        creator.diamondsLastMonth || 0,
        creator.diamonds || 0
    ];
}

function createMiniSparkline(id, creator) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    
    const data = generateSparklineData(creator);
    const trend = data[2] > data[0];
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['', '', ''],
            datasets: [{
                data: data,
                borderColor: trend ? '#00ff88' : '#ff0044',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { display: false } }
        }
    });
}

// Goal Tracker
function updateGoalTracker() {
    const goals = commandData
        .filter(c => c.hoursGoal)
        .map(c => {
            const percent = Math.min(100, ((c.hours || 0) / c.hoursGoal) * 100);
            let status = 'on-track';
            if (percent < 50) status = 'at-risk';
            else if (percent < 80) status = 'behind';
            
            return { ...c, percent, status };
        })
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 5);
    
    const onTrack = goals.filter(g => g.status === 'on-track').length;
    document.getElementById('onTrackCount').textContent = `${onTrack}/${goals.length}`;
    
    const container = document.getElementById('goalList');
    container.innerHTML = goals.map(g => `
        <div class="goal-item">
            <div class="goal-header">
                <span class="goal-name">${g.username}</span>
                <span class="goal-status ${g.status}">${g.status.replace('-', ' ').toUpperCase()}</span>
            </div>
            <div class="goal-bar">
                <div class="goal-fill ${g.status}" style="width: ${g.percent}%"></div>
            </div>
            <div class="goal-numbers">
                <span>${g.hours?.toFixed(1)}h / ${g.hoursGoal}h</span>
                <span>${g.percent.toFixed(0)}%</span>
            </div>
        </div>
    `).join('');
}

// Achievements
function updateAchievements() {
    const achievements = [
        { name: 'Diamond King', icon: '👑', find: () => commandData.reduce((max, c) => (c.diamonds || 0) > (max.diamonds || 0) ? c : max) },
        { name: 'Growth Beast', icon: '🚀', find: () => commandData.reduce((max, c) => (parseFloat(c.growthPercent) || -999) > (parseFloat(max.growthPercent) || -999) ? c : max) },
        { name: 'Stream Master', icon: '📺', find: () => commandData.reduce((max, c) => (c.liveStreams || 0) > (max.liveStreams || 0) ? c : max) },
        { name: 'Hour Crusher', icon: '⏰', find: () => commandData.reduce((max, c) => (c.hours || 0) > (max.hours || 0) ? c : max) },
        { name: 'Reward King', icon: '💰', find: () => commandData.reduce((max, c) => (c.rewards?.earned || 0) > (max.rewards?.earned || 0) ? c : max) },
        { name: 'Top Score', icon: '🎯', find: () => commandData.reduce((max, c) => (c.score || 0) > (max.score || 0) ? c : max) }
    ];
    
    const container = document.getElementById('trophyGrid');
    container.innerHTML = achievements.map(a => {
        const winner = a.find();
        const value = a.name === 'Diamond King' ? formatNumber(winner.diamonds) :
                     a.name === 'Growth Beast' ? (winner.growthPercent || '0%') :
                     a.name === 'Stream Master' ? (winner.liveStreams || 0) + ' streams' :
                     a.name === 'Hour Crusher' ? (winner.hours || 0).toFixed(1) + 'h' :
                     a.name === 'Reward King' ? formatNumber(winner.rewards?.earned) :
                     (winner.score || 0) + ' pts';
        
        return `
            <div class="trophy-item" onclick="location.href='creator-detail.html?user=${winner.username}'">
                <div class="trophy-icon">${a.icon}</div>
                <div class="trophy-name">${a.name}</div>
                <div class="trophy-holder">${winner.username}</div>
                <div class="trophy-value">${value}</div>
            </div>
        `;
    }).join('');
}

// Predictions
function updatePredictions() {
    const currentTotal = commandData.reduce((sum, c) => sum + (c.diamonds || 0), 0);
    const daysInMonth = 30;
    const currentDay = Math.max(1, Math.min(daysInMonth, new Date().getDate()));
    const projectedTotal = Math.round(currentTotal * (daysInMonth / currentDay));
    
    const lastMonthTotal = commandData.reduce((sum, c) => sum + (c.diamondsLastMonth || 0), 0);
    const change = lastMonthTotal > 0 ? ((projectedTotal - lastMonthTotal) / lastMonthTotal * 100) : 0;
    
    document.getElementById('projectedTotal').textContent = formatNumber(projectedTotal);
    
    const changeEl = document.getElementById('projectedChange');
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs last month`;
    changeEl.style.color = change >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';
    
    // Create prediction chart
    createPredictionChart(currentTotal, projectedTotal, lastMonthTotal);
    
    // Insights
    const topPerformer = commandData.reduce((max, c) => (c.diamonds || 0) > (max.diamonds || 0) ? c : max);
    const avgGrowth = commandData.reduce((sum, c) => sum + (parseFloat(c.growthPercent) || 0), 0) / commandData.length;
    
    document.getElementById('predictionInsights').innerHTML = `
        <p><strong>💡 Insights:</strong></p>
        <p>• ${topPerformer.username} is leading with ${formatNumber(topPerformer.diamonds)} diamonds</p>
        <p>• Agency average growth is ${avgGrowth.toFixed(1)}%</p>
        <p>• On track for ${formatNumber(projectedTotal)} total this month</p>
    `;
}

function createPredictionChart(current, projected, lastMonth) {
    const ctx = document.getElementById('predictionChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Last Month', 'Current', 'Projected'],
            datasets: [{
                data: [lastMonth, current, projected],
                backgroundColor: ['#444', '#ff0044', '#a855f7'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#888', font: { size: 10 } }, grid: { display: false } },
                y: { display: false }
            }
        }
    });
}

// Event listeners
document.getElementById('moverFilter')?.addEventListener('change', updateTopMovers);

document.getElementById('refreshBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    await initCommandCenter();
    setTimeout(() => btn.classList.remove('spinning'), 500);
});
