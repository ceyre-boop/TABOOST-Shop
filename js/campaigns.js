// Campaigns Manager

// Sample campaigns data (in production, this would come from backend/Google Sheets)
const sampleCampaigns = [
    {
        id: 1,
        title: "Sunday Knockout Tournament",
        description: "Competitive streaming tournament. Top 3 creators win bonus rewards.",
        date: "2026-03-09",
        time: "8:00 PM EST",
        type: "Tournament",
        prize: "$5,000",
        status: "upcoming",
        participants: 12,
        requirements: "Level 3+",
        opted: []
    },
    {
        id: 2,
        title: "Royal Rumble Live Event",
        description: "24-hour streaming marathon. Every hour counts toward bonus pool.",
        date: "2026-03-02",
        time: "12:00 PM EST",
        type: "Marathon",
        prize: "$10,000",
        status: "live",
        participants: 45,
        requirements: "Level 2+",
        opted: ["singleonthemove", "bryton.39"]
    },
    {
        id: 3,
        title: "Music Cypher Collaboration",
        description: "Musicians collaborate live. Cross-promotion opportunity.",
        date: "2026-03-15",
        time: "7:00 PM EST",
        type: "Collaboration",
        prize: "Exposure Boost",
        status: "upcoming",
        participants: 8,
        requirements: "Music category",
        opted: []
    },
    {
        id: 4,
        title: "Monthly Award Ceremony",
        description: "Recognition for top performers. All creators welcome.",
        date: "2026-03-31",
        time: "9:00 PM EST",
        type: "Awards",
        prize: "Trophies + $2,500",
        status: "upcoming",
        participants: 0,
        requirements: "All levels",
        opted: []
    },
    {
        id: 5,
        title: "Gaming Showdown",
        description: "Gaming creators battle for top spot. Viewer voting included.",
        date: "2026-02-25",
        time: "6:00 PM EST",
        type: "Competition",
        prize: "$3,000",
        status: "ended",
        participants: 28,
        requirements: "Gaming category",
        opted: ["freekbass", "skylerclarkk"]
    }
];

let currentUser = null;
let campaigns = [];
let currentFilter = 'all';
let selectedCampaign = null;

async function initCampaigns(user) {
    currentUser = user;
    campaigns = [...sampleCampaigns];
    
    // Load from localStorage if any saved campaigns
    const saved = localStorage.getItem('taboost_campaigns');
    if (saved) {
        const savedData = JSON.parse(saved);
        campaigns = campaigns.map(c => {
            const saved = savedData.find(s => s.id === c.id);
            return saved ? { ...c, opted: saved.opted } : c;
        });
    }
    
    renderCampaigns();
    checkNotifications();
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderCampaigns();
        });
    });
    
    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // For now, only list view implemented
        });
    });
    
    // Create campaign (admin only)
    document.getElementById('createCampaignBtn')?.addEventListener('click', () => {
        alert('Create campaign feature - Would open form to add new campaign');
    });
    
    // Confirm opt-in
    document.getElementById('confirmOptinBtn').addEventListener('click', confirmOptIn);
}

function renderCampaigns() {
    const list = document.getElementById('campaignsList');
    const empty = document.getElementById('emptyState');
    
    let filtered = campaigns;
    
    // Apply filter
    if (currentFilter === 'upcoming') {
        filtered = campaigns.filter(c => c.status === 'upcoming');
    } else if (currentFilter === 'live') {
        filtered = campaigns.filter(c => c.status === 'live');
    } else if (currentFilter === 'ended') {
        filtered = campaigns.filter(c => c.status === 'ended');
    } else if (currentFilter === 'opted') {
        filtered = campaigns.filter(c => c.opted.includes(currentUser?.username));
    }
    
    // Sort: live first, then upcoming by date, then ended
    filtered.sort((a, b) => {
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (b.status === 'live' && a.status !== 'live') return 1;
        if (a.status === 'ended' && b.status !== 'ended') return 1;
        if (b.status === 'ended' && a.status !== 'ended') return -1;
        return new Date(a.date) - new Date(b.date);
    });
    
    if (filtered.length === 0) {
        list.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    
    list.style.display = 'flex';
    empty.style.display = 'none';
    
    list.innerHTML = filtered.map(c => {
        const date = new Date(c.date);
        const isOpted = c.opted.includes(currentUser?.username);
        const canOptIn = c.status !== 'ended' && !isOpted;
        
        return `
            <div class="campaign-card ${isOpted ? 'opted-in' : ''} ${c.status === 'live' ? 'live' : ''}">
                <div class="campaign-date">
                    <span class="month">${date.toLocaleDateString('en-US', {month: 'short'})}</span>
                    <span class="day">${date.getDate()}</span>
                    <span class="time">${c.time}</span>
                </div>
                
                <div class="campaign-info">
                    <div class="campaign-title">
                        ${c.title}
                        ${c.status === 'live' ? '<span class="status-badge live">Live Now</span>' : ''}
                    </div>
                    <div class="campaign-desc">${c.description}</div>
                    <div class="campaign-meta">
                        <span><i class="fas fa-trophy"></i> ${c.prize}</span>
                        <span><i class="fas fa-tag"></i> ${c.type}</span>
                        <span><i class="fas fa-check-circle"></i> ${c.requirements}</span>
                    </div>
                </div>
                
                <div class="campaign-status">
                    ${!isOpted ? `<span class="status-badge ${c.status}">${c.status}</span>` : ''}
                    <span class="participant-count">
                        <i class="fas fa-users"></i> ${c.participants + c.opted.length} joined
                    </span>
                </div>
                
                ${c.status !== 'ended' ? `
                    <button class="optin-btn ${isOpted ? 'opted' : ''}" 
                            onclick="${canOptIn ? `openOptInModal(${c.id})` : ''}"
                            ${isOpted ? 'disabled' : ''}>
                        ${isOpted ? '<i class="fas fa-check"></i> Opted In' : '<i class="fas fa-plus"></i> Opt In'}
                    </button>
                ` : '<span style="color: #666; font-size: 13px;">Ended</span>'}
            </div>
        `;
    }).join('');
}

function openOptInModal(campaignId) {
    selectedCampaign = campaigns.find(c => c.id === campaignId);
    if (!selectedCampaign) return;
    
    const modal = document.getElementById('optinModal');
    const preview = document.getElementById('modalCampaignPreview');
    
    preview.innerHTML = `
        <h4>${selectedCampaign.title}</h4>
        <p>${selectedCampaign.description}</p>
        <div style="margin-top: 10px; font-size: 13px; color: #888;">
            <span><i class="fas fa-calendar"></i> ${new Date(selectedCampaign.date).toLocaleDateString()}</span>
            <span style="margin-left: 15px;"><i class="fas fa-trophy"></i> ${selectedCampaign.prize}</span>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('optinModal').classList.remove('active');
    selectedCampaign = null;
}

function confirmOptIn() {
    if (!selectedCampaign || !currentUser) return;
    
    // Add user to opted list
    selectedCampaign.opted.push(currentUser.username);
    selectedCampaign.participants++;
    
    // Save to localStorage
    localStorage.setItem('taboost_campaigns', JSON.stringify(campaigns));
    
    // Send alert (in production, this would notify admin)
    sendOptInAlert(selectedCampaign, currentUser);
    
    // Close modal and re-render
    closeModal();
    renderCampaigns();
    checkNotifications();
    
    // Show success
    showToast(`Opted in to ${selectedCampaign.title}! Admin has been notified.`);
}

function sendOptInAlert(campaign, user) {
    // In production: Send to backend, email, Slack, etc.
    const alerts = JSON.parse(localStorage.getItem('taboost_alerts') || '[]');
    alerts.push({
        id: Date.now(),
        type: 'optin',
        message: `${user.name} opted in to "${campaign.title}"`,
        timestamp: new Date().toISOString(),
        read: false
    });
    localStorage.setItem('taboost_alerts', JSON.stringify(alerts));
    
    // Update notification dot
    updateNotificationDot();
}

function checkNotifications() {
    const alerts = JSON.parse(localStorage.getItem('taboost_alerts') || '[]');
    const unread = alerts.filter(a => !a.read).length;
    
    if (unread > 0) {
        updateNotificationDot(unread);
    }
}

function updateNotificationDot(count) {
    const dot = document.getElementById('notifDot');
    if (count > 0) {
        dot.style.display = 'block';
    } else {
        dot.style.display = 'none';
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: var(--taboost-success);
        color: black;
        padding: 15px 25px;
        border-radius: 10px;
        font-weight: 600;
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('optinModal');
    if (e.target === modal) {
        closeModal();
    }
});
