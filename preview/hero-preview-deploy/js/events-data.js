// Taboost Events Calendar Data
// Upcoming events, cyphers, and agency activities

const taboostEvents = [
    {
        date: "2025-03-20",
        title: "Diamond Rush Challenge",
        type: "challenge",
        time: "All Day",
        description: "24-hour streaming challenge. Top 10 earners get bonus rewards!",
        icon: "💎"
    },
    {
        date: "2025-03-22",
        title: "Creator Workshop: Growth Tips",
        type: "workshop",
        time: "7:00 PM EST",
        description: "Learn proven strategies to grow your audience and increase engagement.",
        icon: "📈"
    },
    {
        date: "2025-03-27",
        title: "Live Q&A with Marco",
        type: "qa",
        time: "6:00 PM EST",
        description: "Monthly live session. Ask questions, get answers, share feedback.",
        icon: "🎙️"
    },
    {
        date: "2025-04-03",
        title: "Spring Creator Showcase",
        type: "showcase",
        time: "8:00 PM EST",
        description: "Featured performances from top Taboost creators. Open mic slots available!",
        icon: "🌟"
    }
];

// Helper function to format date
function formatEventDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get event type color
function getEventTypeColor(type) {
    const colors = {
        cypher: '#ff0044',
        challenge: '#00ff88',
        workshop: '#ffaa00',
        qa: '#0088ff',
        showcase: '#ff00ff'
    };
    return colors[type] || '#888';
}
