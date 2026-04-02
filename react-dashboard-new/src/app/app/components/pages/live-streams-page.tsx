import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import { KpiTile } from '../shared/kpi-tile';
import { TierChip } from '../shared/tier-chip';
import type { Creator } from '../../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface Props { onCreatorClick: (c: Creator) => void; }

const STREAMERS = CREATORS.filter(c => c.hours > 0).sort((a, b) => b.hours - a.hours);
const ACTIVE = CREATORS.filter(c => c.diamonds > 0);
const TOTAL_HRS = CREATORS.reduce((s, c) => s + c.hours, 0);
const AVG_HRS = ACTIVE.length > 0 ? (TOTAL_HRS / ACTIVE.length).toFixed(1) : '0';
const MAX_CREATOR = STREAMERS[0];

const EFFICIENCY = [...ACTIVE]
  .filter(c => c.hours > 0)
  .map(c => ({ ...c, dph: Math.round(c.diamonds / c.hours) }))
  .sort((a, b) => b.dph - a.dph);

const BRACKETS = [
  { label: '30h+', min: 30, max: Infinity },
  { label: '20-29h', min: 20, max: 29 },
  { label: '10-19h', min: 10, max: 19 },
  { label: '5-9h', min: 5, max: 9 },
  { label: '1-4h', min: 1, max: 4 },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function LiveStreamsPage({ onCreatorClick }: Props) {
  const top15 = STREAMERS.slice(0, 15).map(c => ({
    name: c.name.slice(0, 12), hours: c.hours, fill: MANAGER_COLORS[c.manager] ?? '#ff0044', creator: c,
  }));

  const bracketData = BRACKETS.map(b => ({
    label: b.label,
    count: STREAMERS.filter(c => c.hours >= b.min && c.hours <= b.max).length,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Total Hours" value={fmt(TOTAL_HRS)} sub="This month" />
        <KpiTile label="Streaming Now" value="47" sub="Live right now" trend="up" color="#22c55e" />
        <KpiTile label="Avg Hours / Creator" value={`${AVG_HRS}h`} sub="Active creators" />
        <KpiTile label="Max Hours" value={`${MAX_CREATOR?.hours ?? 0}h`} sub={MAX_CREATOR?.name ?? ''} color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a]">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">TOP 15 STREAMERS</span>
          </div>
          <div className="p-4" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top15} layout="vertical" margin={{ left: 80, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#888', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 4, fontSize: 11 }} formatter={(v: number) => [`${v}h`, 'Hours']} />
                <Bar dataKey="hours" radius={[0, 2, 2, 0]}>
                  {top15.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a]">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">HOURS DISTRIBUTION</span>
          </div>
          <div className="p-4 space-y-3 mt-4">
            {bracketData.map(b => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-gray-400 w-14">{b.label}</span>
                <div className="flex-1 h-5 bg-[#1a1a1a] rounded overflow-hidden">
                  <div className="h-full shimmer-bar" style={{ width: `${Math.min(100, (b.count / STREAMERS.length) * 500)}%` }} />
                </div>
                <span className="text-[10px] font-mono text-gray-500 w-8">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Efficiency Table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">EFFICIENCY RANKING — DIAMONDS / HOUR</span>
          <span className="text-[10px] font-mono text-amber-400">Sorted by ◆/hr</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
                <th className="py-2 px-3 text-center w-8">#</th>
                <th className="py-2 px-3 text-left">CREATOR</th>
                <th className="py-2 px-3 text-left">MANAGER</th>
                <th className="py-2 px-3 text-left">DIAMONDS</th>
                <th className="py-2 px-3 text-left">HOURS</th>
                <th className="py-2 px-3 text-left">◆/HR</th>
                <th className="py-2 px-3 text-left">TIER</th>
              </tr>
            </thead>
            <tbody>
              {EFFICIENCY.slice(0, 50).map((c, i) => (
                <tr key={c.id}
                  className="border-b border-[#111] hover:bg-[#ff0044]/5 cursor-pointer transition-colors"
                  onClick={() => onCreatorClick(c)}
                >
                  <td className="py-2 px-3 text-xs font-mono text-gray-600 text-center">{i + 1}</td>
                  <td className="py-2 px-3">
                    <div className="text-xs text-white font-dm-sans">{c.name}</div>
                    <div className="text-[10px] text-gray-600 font-mono">{c.badge}</div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs font-mono font-bold" style={{ color: MANAGER_COLORS[c.manager] ?? '#888' }}>{c.manager}</span>
                  </td>
                  <td className="py-2 px-3 text-xs font-mono text-white font-bold">{fmt(c.diamonds)}</td>
                  <td className="py-2 px-3 text-xs font-mono text-gray-400">{c.hours}h</td>
                  <td className="py-2 px-3">
                    <span className="text-sm font-mono font-bold text-amber-400">{fmt(c.dph)}</span>
                  </td>
                  <td className="py-2 px-3"><TierChip tier={c.tier} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
