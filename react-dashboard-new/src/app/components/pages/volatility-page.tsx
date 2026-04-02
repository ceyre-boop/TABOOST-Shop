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

type Quadrant = 'HH' | 'LH' | 'HR' | 'LR';

const Q_LABELS: Record<Quadrant, { label: string; color: string; desc: string }> = {
  HH: { label: 'HIGH REWARD HIGH RISK', color: '#f97316', desc: 'Exciting but fragile' },
  LH: { label: 'LOW REWARD HIGH RISK', color: '#ef4444', desc: 'Noise — consider dropping' },
  HR: { label: 'HIGH REWARD LOW RISK', color: '#22c55e', desc: 'Gold portfolio — protect these' },
  LR: { label: 'LOW REWARD LOW RISK', color: '#888', desc: 'Loyal base' },
};

export function VolatilityPage({ onCreatorClick }: Props) {
  const active = useMemo(() => CREATORS.filter(c => c.diamonds > 0 && c.prevMonth > 0), []);

  const points = useMemo(() => active.map(c => {
    const avg = (c.last30Days + c.prevMonth + c.twoMonthsAgo) / 3;
    const vol = avg > 0 ? Math.round(
      Math.sqrt([(c.last30Days - avg) ** 2, (c.prevMonth - avg) ** 2, (c.twoMonthsAgo - avg) ** 2].reduce((a, b) => a + b, 0) / 3) / avg * 100
    ) : 0;
    return { x: c.diamonds, y: vol, creator: c, name: c.name };
  }), [active]);

  const medX = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.x - b.x);
    return sorted[Math.floor(sorted.length / 2)]?.x ?? 0;
  }, [points]);

  const medY = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.y - b.y);
    return sorted[Math.floor(sorted.length / 2)]?.y ?? 0;
  }, [points]);

  const withQ = useMemo(() => points.map(p => {
    const hi_x = p.x >= medX; const hi_y = p.y >= medY;
    const q: Quadrant = hi_x && hi_y ? 'HH' : !hi_x && hi_y ? 'LH' : hi_x && !hi_y ? 'HR' : 'LR';
    return { ...p, q };
  }), [points, medX, medY]);

  return (
    <div className="space-y-5">
      {/* Quadrant legend */}
      <div className="grid grid-cols-2 gap-3">
        {(Object.entries(Q_LABELS) as [Quadrant, typeof Q_LABELS[Quadrant]][]).map(([k, v]) => (
          <div key={k} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-3 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: v.color }} />
            <div>
              <div className="text-[10px] font-mono font-bold" style={{ color: v.color }}>{v.label}</div>
              <div className="text-[10px] font-mono text-gray-500">{v.desc}</div>
            </div>
            <div className="ml-auto text-lg font-bebas text-white">
              {withQ.filter(p => p.q === k).length}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">PORTFOLIO RISK MAP — AVG DIAMONDS vs VOLATILITY</span>
        </div>
        <div className="p-4" style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
              <XAxis dataKey="x" name="Avg Diamonds" type="number" tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} label={{ value: 'Avg Monthly Diamonds', position: 'insideBottom', fill: '#555', fontSize: 10 }} />
              <YAxis dataKey="y" name="Volatility %" type="number" tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} label={{ value: 'Volatility %', angle: -90, position: 'insideLeft', fill: '#555', fontSize: 10 }} />
              <ReferenceLine x={medX} stroke="#333" strokeDasharray="4 2" />
              <ReferenceLine y={medY} stroke="#333" strokeDasharray="4 2" />
              <Tooltip
                content={({ active: a, payload }) => {
                  if (!a || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#111] border border-[#333] rounded p-2 text-[10px] font-mono">
                      <div className="text-white">{d.name}</div>
                      <div className="text-gray-400">{fmt(d.x)} ◆ · {d.y}% vol</div>
                      <div style={{ color: Q_LABELS[d.q as Quadrant].color }}>{Q_LABELS[d.q as Quadrant].label}</div>
                    </div>
                  );
                }}
              />
              <Scatter data={withQ} onClick={d => onCreatorClick(d.creator)}>
                {withQ.map((p, i) => <Cell key={i} fill={Q_LABELS[p.q].color} fillOpacity={0.7} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
