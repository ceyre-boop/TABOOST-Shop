// Taboost 3x3 Rolling Calendar - Top-left is always today
// Supports multi-day events

function generateRollingCalendar() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Generate 31 days starting from today (rolling month)
    const days = [];
    for (let i = 0; i < 31; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        days.push({
            dayName: dayNames[date.getDay()],
            date: `${monthNames[date.getMonth()]} ${date.getDate()}`,
            fullDate: date,
            isToday: i === 0,
            events: []
        });
    }
    
    // Define events with start/end dates (can span multiple days)
    const events = [
        {
            id: 1,
            title: "TABOOST x Coachella",
            type: "special",
            time: "All Day",
            startDate: new Date(2026, 3, 9),
            endDate: new Date(2026, 3, 12),
            color: "#ffd700"
        },
        {
            id: 2,
            title: "CIDER SBD",
            type: "campaign",
            time: "Launch",
            startDate: new Date(2026, 3, 14),
            endDate: new Date(2026, 3, 20),
            color: "#00d4ff"
        },
        {
            id: 3,
            title: "TikTok Summit",
            type: "event",
            time: "Summit",
            startDate: new Date(2026, 3, 16),
            endDate: new Date(2026, 3, 16),
            color: "#ff0050"
        },
        {
            id: 4,
            title: "Mother’s Day Campaign",
            type: "campaign",
            time: "Promo",
            startDate: new Date(2026, 3, 29),
            endDate: new Date(2026, 4, 3),
            color: "#ff85a1"
        },
        {
            id: 5,
            title: "Bloomin Deals",
            type: "sale",
            time: "Sale",
            startDate: new Date(2026, 4, 13),
            endDate: new Date(2026, 4, 17),
            color: "#00ff88"
        },
        {
            id: 6,
            title: "Father’s Day Campaign",
            type: "campaign",
            time: "Promo",
            startDate: new Date(2026, 5, 5),
            endDate: new Date(2026, 5, 7),
            color: "#4a90e2"
        },
        {
            id: 7,
            title: "Fun in the Sun Sale",
            type: "sale",
            time: "Major",
            startDate: new Date(2026, 6, 22),
            endDate: new Date(2026, 6, 26),
            color: "#f5a623"
        }
    ];
    
    // Add events to days
    days.forEach(day => {
        events.forEach(event => {
            // Check recurring events
            if (event.recurring) {
                if (day.fullDate.getDay() === event.recurring.dayOfWeek) {
                    day.events.push({
                        title: event.title,
                        type: event.type,
                        time: event.time,
                        color: event.color,
                        isMultiDay: false
                    });
                }
            }
            // Check specific date range events (multi-day)
            if (event.startDate && event.endDate) {
                const d = new Date(day.fullDate); d.setHours(0,0,0,0);
                const s = new Date(event.startDate); s.setHours(0,0,0,0);
                const e = new Date(event.endDate); e.setHours(0,0,0,0);
                
                const dayTime = d.getTime();
                const startTime = s.getTime();
                const endTime = e.getTime();
                
                if (dayTime >= startTime && dayTime <= endTime) {
                    day.events.push({
                        title: event.title,
                        type: event.type,
                        time: dayTime === startTime ? (s.getTime() === e.getTime() ? event.time : 'Starts') : dayTime === endTime ? 'Ends' : 'Ongoing',
                        color: event.color,
                        isMultiDay: true,
                        isStart: dayTime === startTime,
                        isEnd: dayTime === endTime
                    });
                }
            }
        });
    });
    
    return {
        currentDateRange: `${days[0].date} - ${days[30].date}`,
        days: days,
        taboostCampaigns: [],
        tiktokCampaigns: []
    };
}

// Generate the calendar data
const rollingCalendar = generateRollingCalendar();

// Also export for use in updateEventsCalendar function
function getRollingCalendarData() {
    return generateRollingCalendar();
}