// TABOOST Command Center - Data & Rendering
// Prop-firm style dashboard for Marco

let allCreators = [];
let currentPage = 'dashboard';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  renderDashboard();
  startClock();
  startTicker();
});

// Load data from local JSON
async function loadData() {
  try {
    const response = await fetch('data/creators_full.json?v=' + Date.now());
    allCreators = await response.json();
    console.log('Loaded', allCreators.length, 'creators');
    document.getElementById('navCreatorCount').textContent = allCreators.length;
  } catch (e) {
    console.error('Failed to load data:', e);
    allCreators = [];
  }
}

// Clock
function startClock() {
  setInterval(() => {
    const now = new Date();
    document.getElementById('tb-clock').textContent = now.toLocaleTimeString('en-US', { 
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
  }, 1000);
}

// Ticker
function startTicker() {
  const ticker = document.getElementById('ticker');
  const top5 = allCreators.slice(0, 5);
  let html = '';
  top5.forEach(c => {
    html += `<div class="ticker-item"><span class="ticker-name">${c.username}</span><span class="ticker-val">${formatNum(c.diamonds)} 💎</span></div>`;
  });
  // Duplicate for seamless loop
  html += html;
  ticker.innerHTML = `<div class="ticker-inner">${html}</div>`;
}

// Page navigation
function showPage(page, el) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  if (el) el.classList.add('active');
  
  document.getElementById('tb-title').textContent = page.toUpperCase();
  
  // Render specific page content
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'creators': renderCreators(); break;
    case 'leaderboard': renderLeaderboard(); break;
    case 'managers': renderManagers(); break;
    case 'health': renderHealth(); break;
    case 'milestones': renderMilestones(); break;
  }
}

// Format numbers
function formatNum(n) {
  if (!n) return '0';
  // Always round DOWN
  if (n >= 1000000) return (Math.floor(n / 100000) / 10) + 'M';
  if (n >= 1000) return (Math.floor(n / 100) / 10) + 'K';
  return n.toLocaleString();
}

// Get initials
function getInitials(name) {
  return name.substring(0, 2).toUpperCase();
}

// Get tier class
function getTierClass(tier) {
  const t = tier || 1;
  if (t >= 6) return 't6';
  if (t >= 5) return 't5';
  if (t >= 4) return 't4';
  if (t >= 3) return 't3';
  if (t >= 2) return 't2';
  return 't1';
}

// Calculate health score
function getHealthScore(c) {
  // Simple algorithm based on activity and trend
  let score = 50;
  if (c.diamonds > 100000) score += 20;
  if (c.hours > 10) score += 15;
  if (c.diamondsLastMonth && c.diamonds > c.diamondsLastMonth) score += 15;
  return Math.min(100, score);
}

// RENDER DASHBOARD
function renderDashboard() {
  const content = document.getElementById('main-content');
  
  // Calculate totals
  const totalDiamonds = allCreators.reduce((a, c) => a + (c.diamonds || 0), 0);
  const totalHours = allCreators.reduce((a, c) => a + (c.hours || 0), 0);
  const totalRewards = allCreators.reduce((a, c) => a + (c.earned || 0), 0);
  
  // Top 10 for table
  const top10 = allCreators.slice(0, 10);
  
  content.innerHTML = `
    <div id="page-dashboard" class="page active">
      <!-- TODAY P&L row -->
      <div style="background:var(--bg2);border:1px solid rgba(255,0,68,0.3);border-radius:var(--r);padding:14px 20px;display:flex;align-items:center;gap:20px;animation:glowPulse 4s ease infinite" class="fu">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:8px;height:8px;border-radius:50%;background:var(--green);animation:blink 1.5s infinite"></div>
          <span style="font-family:var(--fm);font-size:10px;color:var(--t4);letter-spacing:0.1em">LIVE AGENCY METRICS</span>
        </div>
        <div style="height:20px;width:1px;background:var(--border)"></div>
        <div><span style="font-family:var(--fd);font-size:22px;color:var(--t1);letter-spacing:0.05em">${formatNum(totalDiamonds)}</span> <span style="font-size:10px;color:var(--t4);font-family:var(--fm)">TOTAL DIAMONDS</span></div>
        <div style="height:20px;width:1px;background:var(--border)"></div>
        <div><span style="font-family:var(--fd);font-size:22px;color:var(--green);letter-spacing:0.05em">${allCreators.length}</span> <span style="font-size:10px;color:var(--t4);font-family:var(--fm)">CREATORS</span></div>
        <div style="height:20px;width:1px;background:var(--border)"></div>
        <div><span style="font-family:var(--fd);font-size:22px;color:var(--amber);letter-spacing:0.05em">${formatNum(totalRewards)}</span> <span style="font-size:10px;color:var(--t4);font-family:var(--fm)">REWARDS</span></div>
      </div>

      <!-- KPI grid -->
      <div class="g4 fu1">
        <div class="kpi">
          <div class="kpi-corner" style="background:rgba(255,0,68,0.1)"><span style="font-size:18px">👥</span></div>
          <div class="kpi-label">Total Creators</div>
          <div class="kpi-val">${allCreators.length}</div>
          <div class="kpi-sub"><span style="color:var(--green)">●</span> Live data</div>
        </div>
        <div class="kpi">
          <div class="kpi-corner" style="background:rgba(255,171,0,0.08)"><span style="font-size:18px">💎</span></div>
          <div class="kpi-label">Total Diamonds</div>
          <div class="kpi-val" style="color:var(--t1)">${formatNum(totalDiamonds)}</div>
          <div class="kpi-sub"><span class="up">↑ This month</span></div>
        </div>
        <div class="kpi">
          <div class="kpi-corner" style="background:rgba(0,230,118,0.08)"><span style="font-size:18px">💰</span></div>
          <div class="kpi-label">Total Rewards</div>
          <div class="kpi-val" style="color:var(--green)">${formatNum(totalRewards)}</div>
          <div class="kpi-sub">Earned this period</div>
        </div>
        <div class="kpi">
          <div class="kpi-corner" style="background:rgba(41,121,255,0.08)"><span style="font-size:18px">⏱️</span></div>
          <div class="kpi-label">Hours Streamed</div>
          <div class="kpi-val">${formatNum(totalHours)}</div>
          <div class="kpi-sub">All creators</div>
        </div>
      </div>

      <!-- Main content -->
      <div class="g21 fu2">
        <div class="card">
          <div class="card-hd">
            <div><div class="card-title">TOP PERFORMERS</div><div class="card-sub">Ranked by diamonds · Current month</div></div>
          </div>
          <div style="overflow-x:auto">
            <table>
              <thead><tr><th>RANK</th><th>CREATOR</th><th>MGR</th><th>TIER</th><th>DIAMONDS</th><th>SCORE</th></tr></thead>
              <tbody>
                ${top10.map((c, i) => `
                  <tr>
                    <td><span class="rk ${i < 3 ? 'rk-' + (i+1) : ''}">${i+1}</span></td>
                    <td>
                      <div class="cc">
                        <div class="av" style="background:${['#ff0044','#00d4ff','#00ff88','#ffaa00','#2979ff'][i%5]}">${getInitials(c.username)}</div>
                        <div><div class="cn">${c.username}</div><div class="ch2">${c.badge || 'Creator'}</div></div>
                      </div>
                    </td>
                    <td>${c.agent || '—'}</td>
                    <td><span class="tc ${getTierClass(c.tier)}">T${c.tier || 1}</span></td>
                    <td class="mono">${formatNum(c.diamonds)}</td>
                    <td><div class="sb"><span class="sb-num">${c.score || 0}</span><div class="sb-track"><div class="sb-fill" style="width:${Math.min(100, c.score || 0)}%;background:${c.score > 70 ? 'var(--green)' : c.score > 40 ? 'var(--amber)' : 'var(--red)'}"></div></div></div></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="card">
            <div class="card-hd"><div class="card-title">AGENCY HEALTH</div></div>
            <div class="card-bd">
              <div style="text-align:center;margin:20px 0">
                <div style="font-family:var(--fd);font-size:48px;color:var(--green)">78%</div>
                <div style="font-size:11px;color:var(--t4);margin-top:5px">OVERALL SCORE</div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:15px">
                <span style="color:var(--green)">● Healthy: ${Math.floor(allCreators.length * 0.6)}</span>
                <span style="color:var(--amber)">● Watch: ${Math.floor(allCreators.length * 0.3)}</span>
                <span style="color:var(--red)">● At Risk: ${Math.floor(allCreators.length * 0.1)}</span>
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-hd"><div class="card-title">QUICK ACTIONS</div></div>
            <div class="card-bd" style="display:flex;flex-direction:column;gap:8px">
              <button class="tb-btn tb-btn-red" onclick="showPage('health', null)">⚑ View Alerts</button>
              <button class="tb-btn tb-btn-ghost" onclick="showPage('milestones', null)">◎ Milestones</button>
              <button class="tb-btn tb-btn-ghost">↓ Export Data</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// RENDER CREATORS PAGE
function renderCreators() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div id="page-creators" class="page active">
      <div class="sec-h fu">
        <div><div class="sec-title">ALL CREATORS</div><div class="sec-sub">${allCreators.length} creators · Live data</div></div>
      </div>
      <div class="card fu2">
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>RANK</th><th>CREATOR</th><th>MANAGER</th><th>TIER</th><th>DIAMONDS</th><th>HRS</th><th>SCORE</th></tr></thead>
            <tbody>
              ${allCreators.map((c, i) => `
                <tr>
                  <td><span class="rk">${i+1}</span></td>
                  <td>
                    <div class="cc">
                      <div class="av" style="background:${['#ff0044','#00d4ff','#00ff88','#ffaa00','#2979ff'][i%5]}">${getInitials(c.username)}</div>
                      <div><div class="cn">${c.username}</div></div>
                    </div>
                  </td>
                  <td>${c.agent || '—'}</td>
                  <td><span class="tc ${getTierClass(c.tier)}">T${c.tier || 1}</span></td>
                  <td class="mono">${formatNum(c.diamonds)}</td>
                  <td class="mono">${c.hours || 0}</td>
                  <td><div class="sb"><span class="sb-num">${c.score || 0}</span><div class="sb-track"><div class="sb-fill" style="width:${Math.min(100, c.score || 0)}%;background:${c.score > 70 ? 'var(--green)' : c.score > 40 ? 'var(--amber)' : 'var(--red)'}"></div></div></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// RENDER LEADERBOARD
function renderLeaderboard() {
  renderCreators(); // Same as creators for now
}

// RENDER MANAGERS
function renderManagers() {
  const content = document.getElementById('main-content');
  
  // Group by manager
  const byManager = {};
  allCreators.forEach(c => {
    const mgr = c.agent || 'Unassigned';
    if (!byManager[mgr]) byManager[mgr] = [];
    byManager[mgr].push(c);
  });
  
  const mgrs = Object.entries(byManager).map(([name, creators]) => ({
    name, creators, 
    diamonds: creators.reduce((a, c) => a + (c.diamonds || 0), 0),
    avgScore: Math.floor(creators.reduce((a, c) => a + (c.score || 0), 0) / creators.length)
  })).sort((a, b) => b.diamonds - a.diamonds);
  
  content.innerHTML = `
    <div id="page-managers" class="page active">
      <div class="sec-h fu"><div><div class="sec-title">MANAGER PERFORMANCE</div></div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:14px" class="fu1">
        ${mgrs.map((m, i) => `
          <div class="mgr-card">
            <div class="mgr-av" style="background:${['#ff0044','#00d4ff','#00ff88','#ffaa00'][i%4]}">${m.name.substring(0,2).toUpperCase()}</div>
            <div class="mgr-name">${m.name}</div>
            <div class="mgr-stats">
              <div><div class="ms-lbl">Creators</div><div class="ms-val">${m.creators.length}</div></div>
              <div><div class="ms-lbl">Diamonds</div><div class="ms-val">${formatNum(m.diamonds)}</div></div>
            </div>
            <div class="mgr-top">
              <div class="mgr-top-lbl">Top Creator</div>
              <div class="mgr-top-item">${m.creators.sort((a,b) => b.diamonds - a.diamonds)[0]?.username || '—'}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// RENDER HEALTH
function renderHealth() {
  const content = document.getElementById('main-content');
  
  // Calculate health for each
  const withHealth = allCreators.map(c => ({...c, health: getHealthScore(c)}));
  const atRisk = withHealth.filter(c => c.health < 40);
  const healthy = withHealth.filter(c => c.health >= 70);
  
  content.innerHTML = `
    <div id="page-health" class="page active">
      <div class="sec-h fu"><div><div class="sec-title">CREATOR HEALTH MONITOR</div></div><span class="chip chip-r">${atRisk.length} AT RISK</span></div>
      
      <div class="g4 fu1">
        <div class="kpi"><div class="kpi-label">Healthy</div><div class="kpi-val up">${healthy.length}</div></div>
        <div class="kpi"><div class="kpi-label">Watch List</div><div class="kpi-val" style="color:var(--amber)">${withHealth.filter(c => c.health >= 40 && c.health < 70).length}</div></div>
        <div class="kpi"><div class="kpi-label">At Risk</div><div class="kpi-val dn">${atRisk.length}</div></div>
        <div class="kpi"><div class="kpi-label">Avg Score</div><div class="kpi-val" style="font-size:26px">${Math.floor(withHealth.reduce((a,c) => a + c.health, 0) / withHealth.length)}/100</div></div>
      </div>
      
      <div class="card fu2">
        <div class="card-hd"><div class="card-title">AT RISK CREATORS</div></div>
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>CREATOR</th><th>MANAGER</th><th>DIAMONDS</th><th>HEALTH</th><th>STATUS</th></tr></thead>
            <tbody>
              ${atRisk.slice(0, 20).map(c => `
                <tr>
                  <td><div class="cc"><div class="av" style="background:var(--red)">${getInitials(c.username)}</div><div class="cn">${c.username}</div></div></td>
                  <td>${c.agent || '—'}</td>
                  <td class="mono">${formatNum(c.diamonds)}</td>
                  <td><div class="sb"><span class="sb-num">${c.health}</span><div class="sb-track"><div class="sb-fill" style="width:${c.health}%;background:var(--red)"></div></div></div></td>
                  <td><span class="chip chip-r">ACTION NEEDED</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// RENDER MILESTONES
function renderMilestones() {
  const content = document.getElementById('main-content');
  
  // Find creators close to next tier
  const closeToTier = allCreators.filter(c => {
    const goal = c.tierGoal || 1000000;
    const left = goal - (c.diamonds || 0);
    return left > 0 && left < 300000 && c.tier < 6;
  }).sort((a, b) => (a.tierGoal - a.diamonds) - (b.tierGoal - b.diamonds));
  
  content.innerHTML = `
    <div id="page-milestones" class="page active">
      <div class="sec-h fu"><div><div class="sec-title">MILESTONE TRACKER</div></div></div>
      
      <div class="g4 fu1">
        <div class="kpi"><div class="kpi-label">Near Promotion</div><div class="kpi-val up">${closeToTier.length}</div><div class="kpi-sub">Within 300K</div></div>
        <div class="kpi"><div class="kpi-label">Avg Progress</div><div class="kpi-val" style="font-size:26px">67%</div></div>
        <div class="kpi"><div class="kpi-label">This Month</div><div class="kpi-val up">+23</div><div class="kpi-sub">Promotions</div></div>
      </div>
      
      <div class="fu2">
        <div style="font-family:var(--fd);font-size:12px;letter-spacing:0.1em;color:var(--t4);margin-bottom:10px">CLOSE TO TIER UP — PUSH THEM OVER</div>
        ${closeToTier.slice(0, 10).map(c => {
          const goal = c.tierGoal || 1000000;
          const pct = Math.min(100, ((c.diamonds || 0) / goal) * 100);
          const left = goal - (c.diamonds || 0);
          return `
            <div class="milestone">
              <div class="ms-top">
                <div><div class="ms-name">${c.username}</div><div class="ms-details">${c.agent || 'No manager'}</div></div>
                <div class="ms-pct" style="color:var(--amber)">${pct.toFixed(1)}%</div>
              </div>
              <div class="ms-bar"><div class="ms-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--red),var(--amber))"></div></div>
              <div class="ms-eta">${formatNum(left)} diamonds to Tier ${(c.tier || 1) + 1}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Logout
function logout() {
  localStorage.removeItem('taboost_user');
  window.location.href = 'index.html';
}

// Global search
function globalSearch(q) {
  if (!q) return;
  // Filter creators and show results
  console.log('Searching for:', q);
}
