const ALERTS = [
  {
    id: '1', type: 'critical' as const, borderColor: '#ef4444',
    title: '5 Rookies Below Hour Requirements',
    message: 'fresh_felix, beginner_beth, new_nikki, rookie_ray and 1 more are significantly below minimum streaming hours for their tier.',
    time: '2 hours ago', chip: 'CRITICAL',
  },
  {
    id: '2', type: 'achievement' as const, borderColor: '#22c55e',
    title: 'singleonthemove Reached 4.8M Total Diamonds',
    message: 'singleonthemove has crossed the 4.8M lifetime diamond milestone under manager MARCO. Significant achievement.',
    time: '5 hours ago', chip: 'ACHIEVEMENT',
  },
  {
    id: '3', type: 'new' as const, borderColor: '#888',
    title: 'lancektyree Joined Under CARRINGTON',
    message: 'New creator lancektyree has been added to the agency under manager CARRINGTON. First 30-day window started.',
    time: '1 day ago', chip: 'NEW',
  },
  {
    id: '4', type: 'info' as const, borderColor: '#555',
    title: 'Weekly Performance Report Ready',
    message: 'The automated weekly performance digest for the period Mar 1–7 is ready for download.',
    time: '2 days ago', chip: 'INFO',
  },
  {
    id: '5', type: 'reminder' as const, borderColor: '#f59e0b',
    title: 'Manager Sync Tomorrow 2PM EST',
    message: 'Scheduled manager alignment call for Q1 review. All managers invited. Agenda: tier promotions, at-risk review.',
    time: '2 days ago', chip: 'REMINDER',
  },
];

const SUMMARY = [
  { label: 'Critical', count: 1, color: '#ef4444' },
  { label: 'Achievement', count: 1, color: '#22c55e' },
  { label: 'New', count: 1, color: '#888' },
  { label: 'Info', count: 1, color: '#555' },
  { label: 'Reminder', count: 1, color: '#f59e0b' },
];

export function AlertsPage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[65fr_35fr] gap-5">
      <div className="space-y-3">
        {ALERTS.map(a => (
          <div key={a.id}
            className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4 flex gap-4"
            style={{ borderLeft: `3px solid ${a.borderColor}` }}
          >
            <div className="flex-1">
              <div className="text-sm font-dm-sans text-white mb-1">{a.title}</div>
              <div className="text-xs font-dm-sans text-gray-400 mb-2">{a.message}</div>
              <div className="text-[10px] font-mono text-gray-600">{a.time}</div>
            </div>
            <div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{
                background: `${a.borderColor}20`, color: a.borderColor, border: `1px solid ${a.borderColor}40`
              }}>
                {a.chip}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-5 card-hover h-fit">
        <div className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-4">ALERT SUMMARY</div>
        <div className="space-y-3">
          {SUMMARY.map(s => (
            <div key={s.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-xs font-mono text-gray-400">{s.label}</span>
              </div>
              <span className="text-sm font-bebas" style={{ color: s.color }}>{s.count}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
          <div className="text-[10px] font-mono text-gray-600">TOTAL ALERTS</div>
          <div className="text-2xl font-bebas text-white">5</div>
        </div>
      </div>
    </div>
  );
}
