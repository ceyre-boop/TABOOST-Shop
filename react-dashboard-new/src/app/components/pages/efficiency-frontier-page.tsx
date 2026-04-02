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

export function EfficiencyFrontierPage({ onCreatorClick }: Props) {
  const active = useMemo(() => CREATORS.filter(c => c.diamonds > 0 && c.hours > 0), []);

  const avgDph = useMemo(() => {
    const sum = active.reduce((s, c) => s + c.diamonds / c.hours, 0);
    return sum / active.length;
  }, [active]);

  const points = useMemo(() => active.map(c => {
    const predicted = Math.round(avgDph * c.hours);
    const gap = c.diamonds - predicted;
    const over = gap >= 0;
    return {
      x: c.hours, y: c.diamonds, predicted, gap,
      fill: over ? '#22c55e' : gap < -50000 ? '#7f1d1d' : '#ef4444',
      creator: c, name: c.name,
    };
  }), [active, avgDph]);

  const trendData = useMemo(() => {
    const maxH = Math.max(...active.map(c => c.hours));
    return [{ x: 0, y: 0 }, { x: maxH, y: Math.round(avgDph * maxH) }];
  }, [active, avgDph]);

  const underperformers = useMemo(() =>
    [...points].filter(p => p.gap < 0).sort((a, b) => a.gap - b.gap).slice(0, 20),
    [points]);

  return (
    <div className="space-y-5">
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-4">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">EFFICIENCY FRONTIER</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[10px] font-mono text-gray-500">Overperforming</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] font-mono text-gray-500">Underperforming</span></div>
          </div>
          <span className="text-[10px] font-mono text-gray-600 ml-auto">Avg ◆/hr: {fmt(Math.round(avgDph))}</span>
        </div>
        <div className="p-4" style={{ height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
              <XAxis dataKey="x" name="Hours" type="number" tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} label={{ value: 'Hours Streamed', position: 'insideBottom', fill: '#555', fontSize: 10 }} />
              <YAxis dataKey="y" name="Diamonds" type="number" tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip
                content={({ active: a, payload }) => {
                  if (!a || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#111] border border-[#333] rounded p-2 text-[10px] font-mono">
                      <div className="text-white">{d.name}</div>
                      <div className="text-gray-400">{d.x}h · {fmt(d.y)} ◆</div>
                      <div className="text-gray-500">Predicted: {fmt(d.predicted)}</div>
                      <div style={{ color: d.gap >= 0 ? '#22c55e' : '#ef4444' }}>Gap: {d.gap >= 0 ? '+' : ''}{fmt(d.gap)}</div>
                    </div>
                  );
                }}
              />
              <ReferenceLine segment={trendData.map(p => ({ x: p.x, y: p.y }))} stroke="#ff0044" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Scatter data={points} onClick={d => onCreatorClick(d.creator)}>
                {points.map((p, i) => <Cell key={i} fill={p.fill} fillOpacity={0.7} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Underperformers table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">COACHING PRIORITIES — BIGGEST GAPS</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
                <th className="py-2 px-3 text-left">CREATOR</th>
                <th className="py-2 px-3 text-left">MANAGER</th>
                <th className="py-2 px-3 text-left">HOURS</th>
                <th className="py-2 px-3 text-left">ACTUAL ◆</th>
                <th className="py-2 px-3 text-left">PREDICTED ◆</th>
                <th className="py-2 px-3 text-left">GAP</th>
              </tr>
            </thead>
            <tbody>
              {underperformers.map((p, i) => (
                <tr key={i} className="border-b border-[#111] hover:bg-[#ff0044]/5 cursor-pointer transition-colors"
                  onClick={() => onCreatorClick(p.creator)}>
                  <td className="py-2 px-3 text-xs text-white font-dm-sans">{p.name}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs font-mono" style={{ color: MANAGER_COLORS[p.creator.manager] ?? '#888' }}>{p.creator.manager}</span>
                  </td>
                  <td className="py-2 px-3 text-xs font-mono text-gray-400">{p.x}h</td>
                  <td className="py-2 px-3 text-xs font-mono text-white">{fmt(p.y)}</td>
                  <td className="py-2 px-3 text-xs font-mono text-gray-400">{fmt(p.predicted)}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs font-mono text-red-400">{fmt(p.gap)}</span>
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
