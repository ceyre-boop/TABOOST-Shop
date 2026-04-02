import { useMemo } from 'react';
import { CREATORS } from '../../data/creators';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

function fmt(n: number) {
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const GENRE_COLORS = ['#ff0044','#f97316','#a855f7','#06b6d4','#84cc16','#ec4899','#14b8a6','#f59e0b','#6366f1','#10b981'];

export function GenrePortfolioPage() {
  const genres = useMemo(() => {
    const map = new Map<string, typeof CREATORS>();
    CREATORS.filter(c => c.diamonds > 0).forEach(c => {
      if (!map.has(c.badge)) map.set(c.badge, []);
      map.get(c.badge)!.push(c);
    });
    return Array.from(map.entries()).map(([genre, creators], i) => ({
      genre, color: GENRE_COLORS[i % GENRE_COLORS.length],
      count: creators.length,
      avgDiamonds: Math.round(creators.reduce((s, c) => s + c.diamonds, 0) / creators.length),
      avgHours: Math.round(creators.reduce((s, c) => s + c.hours, 0) / creators.length),
      avgScore: Math.round(creators.reduce((s, c) => s + c.score, 0) / creators.length),
      avgRatio: parseFloat((creators.reduce((s, c) => s + (c.diamonds > 0 ? c.rewards / c.diamonds : 0), 0) / creators.length).toFixed(2)),
    })).sort((a, b) => b.avgDiamonds - a.avgDiamonds);
  }, []);

  const maxDiamonds = Math.max(...genres.map(g => g.avgDiamonds));

  const radarData = useMemo(() => [
    'avgDiamonds', 'avgHours', 'avgScore', 'avgRatio',
  ].map(key => {
    const obj: Record<string, number | string> = { metric: key.replace('avg', '').replace('Diamonds', 'Diamonds').replace('Hours', 'Hours') };
    genres.forEach(g => { obj[g.genre] = (g as unknown as Record<string, number>)[key]; });
    return obj;
  }), [genres]);

  return (
    <div className="space-y-5">
      {/* Genre stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {genres.map(g => (
          <div key={g.genre} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-3 card-hover">
            <div className="text-xs font-bebas mb-1" style={{ color: g.color }}>{g.genre}</div>
            <div className="text-lg font-bebas text-white">{g.count}</div>
            <div className="text-[9px] font-mono text-gray-600">creators</div>
            <div className="mt-2 space-y-0.5">
              <div className="flex justify-between text-[9px] font-mono"><span className="text-gray-600">AVG ◆</span><span className="text-gray-300">{fmt(g.avgDiamonds)}</span></div>
              <div className="flex justify-between text-[9px] font-mono"><span className="text-gray-600">AVG HRS</span><span className="text-gray-300">{g.avgHours}h</span></div>
              <div className="flex justify-between text-[9px] font-mono"><span className="text-gray-600">AVG SCORE</span><span className="text-gray-300">{g.avgScore}</span></div>
              <div className="flex justify-between text-[9px] font-mono"><span className="text-gray-600">RATIO</span><span className="text-amber-400">{g.avgRatio.toFixed(1)}x</span></div>
            </div>
            <div className="mt-2 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(g.avgDiamonds / maxDiamonds) * 100}%`, background: g.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Radar chart */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">GENRE COMPARISON RADAR</span>
        </div>
        <div className="p-4" style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
              <PolarGrid stroke="#1a1a1a" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 4, fontSize: 11 }} />
              {genres.slice(0, 5).map(g => (
                <Radar key={g.genre} name={g.genre} dataKey={g.genre} stroke={g.color} fill={g.color} fillOpacity={0.1} />
              ))}
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'DM Mono' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
                <th className="py-2 px-4 text-left">GENRE</th>
                <th className="py-2 px-4 text-left">CREATORS</th>
                <th className="py-2 px-4 text-left">AVG ◆</th>
                <th className="py-2 px-4 text-left">AVG HOURS</th>
                <th className="py-2 px-4 text-left">AVG SCORE</th>
                <th className="py-2 px-4 text-left">AVG RATIO</th>
                <th className="py-2 px-4 text-left">RECOMMENDATION</th>
              </tr>
            </thead>
            <tbody>
              {genres.map(g => (
                <tr key={g.genre} className="border-b border-[#111] hover:bg-[#ff0044]/5 transition-colors">
                  <td className="py-2 px-4">
                    <span className="text-xs font-bebas" style={{ color: g.color }}>{g.genre}</span>
                  </td>
                  <td className="py-2 px-4 text-xs font-mono text-gray-400">{g.count}</td>
                  <td className="py-2 px-4 text-xs font-mono text-white font-bold">{fmt(g.avgDiamonds)}</td>
                  <td className="py-2 px-4 text-xs font-mono text-gray-400">{g.avgHours}h</td>
                  <td className="py-2 px-4 text-xs font-mono" style={{ color: g.avgScore >= 60 ? '#22c55e' : g.avgScore >= 40 ? '#f59e0b' : '#ef4444' }}>{g.avgScore}</td>
                  <td className="py-2 px-4">
                    <span className="text-xs font-mono" style={{ color: g.avgRatio >= 3 ? '#fbbf24' : g.avgRatio >= 1 ? '#d1d5db' : '#555' }}>{g.avgRatio.toFixed(1)}x</span>
                  </td>
                  <td className="py-2 px-4 text-[10px] font-mono text-gray-500">
                    {g.avgDiamonds === Math.max(...genres.map(x => x.avgDiamonds)) ? '✅ RECRUIT MORE' :
                      g.avgScore < 40 ? '⚠️ TRAINING NEEDED' :
                      g.avgRatio >= 3 ? '💎 HIGH LOYALTY' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
