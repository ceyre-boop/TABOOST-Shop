import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import { KpiTile } from '../shared/kpi-tile';
import { TierChip } from '../shared/tier-chip';
import type { Creator, Tier } from '../../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface Props { onCreatorClick: (c: Creator) => void; }

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const SORTED = [...CREATORS].sort((a, b) => b.diamonds - a.diamonds);
const TOP15 = SORTED.slice(0, 15);
const TOTAL = CREATORS.reduce((s, c) => s + c.diamonds, 0);
const TOP5_SUM = SORTED.slice(0, 5).reduce((s, c) => s + c.diamonds, 0);
const ACTIVE = CREATORS.filter(c => c.diamonds > 0);
const AVG = ACTIVE.length > 0 ? Math.floor(TOTAL / ACTIVE.length) : 0;
const CONC = Math.floor((TOP5_SUM / TOTAL) * 100);

const TIER_COLORS_MAP: Record<number, string> = {
  1: '#fbbf24', 2: '#60a5fa', 3: '#4ade80', 4: '#d1d5db', 5: '#a78bfa', 6: '#f87171',
};

const TIER_DIST_DATA = [6, 5, 4, 3, 2, 1].map(t => ({
  tier: `T${t}`,
  count: CREATORS.filter(c => c.tier === t as Tier).length,
  color: TIER_COLORS_MAP[t],
}));

export function DiamondsPage({ onCreatorClick }: Props) {
  const barData = TOP15.map(c => ({
    name: c.name.slice(0, 12),
    diamonds: c.diamonds,
    fill: MANAGER_COLORS[c.manager] ?? '#ff0044',
    creator: c,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Total Diamonds" value={fmt(TOTAL)} sub="+8.5% MoM" trend="up" />
        <KpiTile label="Top Earner" value={fmt(SORTED[0]?.diamonds ?? 0)} sub={SORTED[0]?.name ?? ''} trend="up" />
        <KpiTile label="Average" value={fmt(AVG)} sub={`${ACTIVE.length} active creators`} />
        <KpiTile label="Concentration" value={`${CONC}%`} sub="Top 5 hold this share" color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top 15 Bar Chart */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a]">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">TOP 15 BY DIAMONDS</span>
          </div>
          <div className="p-4" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 70, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#888', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 4, fontSize: 11 }}
                  formatter={(v: number) => [fmt(v), 'Diamonds']}
                />
                <Bar dataKey="diamonds" radius={[0, 2, 2, 0]}>
                  {barData.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a]">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">TIER DISTRIBUTION</span>
          </div>
          <div className="p-4" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TIER_DIST_DATA} layout="vertical" margin={{ left: 30, right: 40 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="tier" tick={{ fontSize: 11, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 4, fontSize: 11 }}
                  formatter={(v: number, _n: string, p) => [v, p.payload.tier]}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {TIER_DIST_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">ALL CREATORS — DIAMOND RANKING</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
                <th className="py-2 px-3 text-center w-8">#</th>
                <th className="py-2 px-3 text-left">CREATOR</th>
                <th className="py-2 px-3 text-left">MANAGER</th>
                <th className="py-2 px-3 text-left">TIER</th>
                <th className="py-2 px-3 text-left">DIAMONDS</th>
                <th className="py-2 px-3 text-left">LAST 30D</th>
                <th className="py-2 px-3 text-left">PREV MO.</th>
                <th className="py-2 px-3 text-left">MoM</th>
                <th className="py-2 px-3 text-left">SCORE</th>
              </tr>
            </thead>
            <tbody>
              {SORTED.slice(0, 50).map((c, i) => {
                const mom = c.prevMonth > 0 ? ((c.last30Days - c.prevMonth) / c.prevMonth * 100) : 0;
                return (
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
                    <td className="py-2 px-3"><TierChip tier={c.tier} /></td>
                    <td className="py-2 px-3 text-xs font-mono text-white font-bold">{fmt(c.diamonds)}</td>
                    <td className="py-2 px-3 text-xs font-mono text-gray-300">{fmt(c.last30Days)}</td>
                    <td className="py-2 px-3 text-xs font-mono text-gray-400">{fmt(c.prevMonth)}</td>
                    <td className="py-2 px-3">
                      <span className={`text-xs font-mono ${mom >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {mom >= 0 ? '▲' : '▼'}{Math.abs(mom).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${c.score}%`,
                            background: c.score >= 70 ? '#22c55e' : c.score >= 40 ? '#f59e0b' : '#ef4444',
                          }} />
                        </div>
                        <span className="text-[10px] font-mono text-gray-500">{c.score}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
