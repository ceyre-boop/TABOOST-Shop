import { useMemo } from 'react';
import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import type { Creator } from '../../types';
import { ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from 'recharts';

interface Props { onCreatorClick: (c: Creator) => void; }

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function consistencyIndex(c: Creator): number {
  if (c.daysStreamed === 0) return 0;
  const expectedDays = c.daysStreamed;
  const ideal = 28 / 4 * 4; // 4 days/week = 16 days
  const regularity = Math.min(100, Math.round((c.daysStreamed / ideal) * 100));
  const volPenalty = c.prevMonth > 0 ? Math.abs(c.last30Days - c.prevMonth) / c.prevMonth : 0;
  return Math.max(0, Math.min(100, Math.round(regularity * (1 - volPenalty * 0.5))));
}

export function ConsistencyPage({ onCreatorClick }: Props) {
  const active = useMemo(() => CREATORS.filter(c => c.diamonds > 0 && c.hours > 0), []);

  const points = useMemo(() => active.map(c => ({
    x: consistencyIndex(c), y: c.diamonds, creator: c, name: c.name,
  })), [active]);

  const correlation = useMemo(() => {
    const n = points.length;
    if (n < 2) return 0;
    const meanX = points.reduce((s, p) => s + p.x, 0) / n;
    const meanY = points.reduce((s, p) => s + p.y, 0) / n;
    const num = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
    const denX = Math.sqrt(points.reduce((s, p) => s + (p.x - meanX) ** 2, 0));
    const denY = Math.sqrt(points.reduce((s, p) => s + (p.y - meanY) ** 2, 0));
    return denX * denY > 0 ? parseFloat((num / (denX * denY)).toFixed(3)) : 0;
  }, [points]);

  const medX = useMemo(() => {
    const s = [...points].sort((a, b) => a.x - b.x);
    return s[Math.floor(s.length / 2)]?.x ?? 50;
  }, [points]);

  const ranked = useMemo(() => [...active].map(c => ({ ...c, ci: consistencyIndex(c) })).sort((a, b) => b.ci - a.ci), [active]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded p-5 card-hover flex flex-col items-center justify-center">
          <div className="text-[10px] font-mono text-gray-600 mb-1">CORRELATION COEFFICIENT</div>
          <div className="text-5xl font-bebas" style={{ color: correlation > 0.3 ? '#22c55e' : correlation > 0 ? '#f59e0b' : '#ef4444' }}>
            {correlation > 0 ? '+' : ''}{correlation}
          </div>
          <div className="text-[10px] font-mono text-gray-500 mt-1">
            {correlation > 0.5 ? 'STRONG POSITIVE' : correlation > 0.3 ? 'MODERATE POSITIVE' : 'WEAK'}
          </div>
          <div className="text-[10px] font-dm-sans text-gray-600 mt-2 text-center">
            Consistent streamers earn {correlation > 0 ? 'more' : 'similar'} diamonds for same hours
          </div>
        </div>
        <div className="col-span-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4">
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">CONSISTENCY INSIGHT</div>
          <p className="text-xs font-dm-sans text-gray-400 leading-relaxed">
            The consistency index measures how regularly creators stream across the month. A score of 100 means
            perfectly distributed streaming days. The correlation between consistency and diamond earnings
            ({correlation > 0 ? 'r = +' : 'r = '}{correlation}) {correlation > 0.3 ? 'confirms' : 'suggests'} that
            schedule discipline drives performance. Show this to creators to motivate consistent streaming schedules.
          </p>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">CONSISTENCY vs DIAMONDS SCATTER</span>
        </div>
        <div className="p-4" style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
              <XAxis dataKey="x" name="Consistency" type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} label={{ value: 'Consistency Index', position: 'insideBottom', fill: '#555', fontSize: 10 }} />
              <YAxis dataKey="y" name="Diamonds" type="number" tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
              <ReferenceLine x={medX} stroke="#333" strokeDasharray="4 2" label={{ value: 'Median', fill: '#444', fontSize: 9 }} />
              <Tooltip
                content={({ active: a, payload }) => {
                  if (!a || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#111] border border-[#333] rounded p-2 text-[10px] font-mono">
                      <div className="text-white">{d.name}</div>
                      <div className="text-gray-400">CI: {d.x} · {fmt(d.y)} ◆</div>
                    </div>
                  );
                }}
              />
              <Scatter data={points} onClick={d => onCreatorClick(d.creator)}>
                {points.map((p, i) => (
                  <Cell key={i} fill={p.x >= medX ? '#ff0044' : '#444'} fillOpacity={0.7} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rankings */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">CONSISTENCY RANKING</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
              <th className="py-2 px-3 text-center w-8">#</th>
              <th className="py-2 px-3 text-left">CREATOR</th>
              <th className="py-2 px-3 text-left">MANAGER</th>
              <th className="py-2 px-3 text-left">CONSISTENCY</th>
              <th className="py-2 px-3 text-left">DAYS STREAMED</th>
              <th className="py-2 px-3 text-left">DIAMONDS</th>
            </tr>
          </thead>
          <tbody>
            {ranked.slice(0, 30).map((c, i) => (
              <tr key={c.id} className="border-b border-[#111] hover:bg-[#ff0044]/5 cursor-pointer transition-colors" onClick={() => onCreatorClick(c)}>
                <td className="py-2 px-3 text-xs font-mono text-gray-600 text-center">{i + 1}</td>
                <td className="py-2 px-3 text-xs text-white font-dm-sans">{c.name}</td>
                <td className="py-2 px-3">
                  <span className="text-xs font-mono" style={{ color: MANAGER_COLORS[c.manager] ?? '#888' }}>{c.manager}</span>
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#ff0044]" style={{ width: `${c.ci}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-[#ff0044]">{c.ci}</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-xs font-mono text-gray-400">{c.daysStreamed} days</td>
                <td className="py-2 px-3 text-xs font-mono text-white font-bold">{fmt(c.diamonds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
