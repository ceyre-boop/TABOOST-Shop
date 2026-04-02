const REPORTS = [
  { emoji: '📊', title: 'CREATOR REPORT', desc: 'Full creator performance breakdown with tier analysis and trends' },
  { emoji: '💎', title: 'DIAMONDS REPORT', desc: 'Diamond earnings, MoM changes, and concentration analysis' },
  { emoji: '🏆', title: 'PERFORMANCE SUMMARY', desc: 'Agency-wide performance metrics and KPI summary' },
  { emoji: '👔', title: 'MANAGER REPORT', desc: 'Manager portfolio performance, ROI, and team metrics' },
  { emoji: '🌱', title: 'ROOKIE REPORT', desc: 'First 30-day analysis and long-term success predictions' },
  { emoji: '📡', title: 'STREAMING REPORT', desc: 'Hours streamed, efficiency ranking, and live stream analytics' },
];

const EXPORTS = [
  { name: 'creators_march_2026.csv', type: 'CSV', date: '2026-03-07 14:22', size: '284 KB' },
  { name: 'performance_summary_q1.pdf', type: 'PDF', date: '2026-03-05 09:10', size: '1.2 MB' },
  { name: 'manager_report_feb.csv', type: 'CSV', date: '2026-03-01 11:45', size: '96 KB' },
  { name: 'diamonds_feb_2026.pdf', type: 'PDF', date: '2026-02-28 16:30', size: '876 KB' },
  { name: 'rookie_jan_cohort.csv', type: 'CSV', date: '2026-02-15 08:00', size: '52 KB' },
];

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORTS.map(r => (
          <div key={r.title} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-5 card-hover flex flex-col gap-3">
            <div className="text-3xl">{r.emoji}</div>
            <div className="text-xl font-bebas text-white">{r.title}</div>
            <div className="text-xs font-dm-sans text-gray-400 flex-1">{r.desc}</div>
            <button className="w-full bg-[#ff0044] hover:bg-[#cc0033] text-white text-xs font-mono py-2 rounded transition-colors">
              DOWNLOAD
            </button>
          </div>
        ))}
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">RECENT EXPORTS</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
              <th className="py-2 px-4 text-left">FILENAME</th>
              <th className="py-2 px-4 text-left">TYPE</th>
              <th className="py-2 px-4 text-left">GENERATED</th>
              <th className="py-2 px-4 text-left">SIZE</th>
              <th className="py-2 px-4 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {EXPORTS.map(e => (
              <tr key={e.name} className="border-b border-[#111] hover:bg-[#ff0044]/5 transition-colors">
                <td className="py-3 px-4 text-xs font-mono text-gray-300">{e.name}</td>
                <td className="py-3 px-4">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${e.type === 'CSV' ? 'bg-blue-900/50 text-blue-400' : 'bg-red-900/50 text-red-400'}`}>
                    {e.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs font-mono text-gray-500">{e.date}</td>
                <td className="py-3 px-4 text-xs font-mono text-gray-500">{e.size}</td>
                <td className="py-3 px-4">
                  <button className="text-[10px] font-mono text-gray-400 hover:text-[#ff0044] border border-[#222] hover:border-[#ff0044] px-2 py-0.5 rounded transition-colors">
                    ↓ DL
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
