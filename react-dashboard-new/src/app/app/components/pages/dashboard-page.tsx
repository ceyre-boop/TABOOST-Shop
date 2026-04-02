import { CREATORS, ACTIVE_CREATORS, TOTAL_DIAMONDS, TOTAL_REWARDS, TOTAL_HOURS, MANAGER_COLORS } from '../../data/creators';
import { KpiTile } from '../shared/kpi-tile';
import { TierChip } from '../shared/tier-chip';
import { ScoreBar } from '../shared/score-bar';
import { CreatorRow } from '../shared/creator-row';
import type { Creator, Tier } from '../../types';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';

interface Props { onCreatorClick: (c: Creator) => void; }

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const SORTED = [...CREATORS].sort((a, b) => b.diamonds - a.diamonds);
const TOP_EARNERS = [...CREATORS].sort((a, b) => b.rewards - a.rewards).slice(0, 10);
const TOP_PERFORMERS = SORTED.slice(0, 20);

const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const TOP5 = SORTED.slice(0, 5);

function buildEquityCurve() {
  return MONTHS.map((month, i) => {
    const obj: Record<string, number | string> = { month };
    TOP5.forEach(c => {
      const factor = [0.3, 0.45, 0.6, 0.75, 0.9, 1.0][i];
      const variance = 0.85 + Math.random() * 0.3;
      obj[c.name] = Math.floor(c.diamonds * factor * variance);
    });
    return obj;
  });
}

const CURVE_DATA = buildEquityCurve();
const CURVE_COLORS = ['#ff0044', '#f97316', '#a855f7', '#06b6d4', '#84cc16'];

const TIER_DIST: Record<string, number> = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0, T6: 0 };
CREATORS.forEach(c => { TIER_DIST[`T${c.tier}`]++; });

const MONTHLY_GOAL = 1200000;
const TODAY_DIAMONDS = 47203;
const STREAMING_NOW = 47;
const MARCH_PCT = 94;

export function DashboardPage({ onCreatorClick }: Props) {
  const totalDiamondsDisplay = fmt(TOTAL_DIAMONDS);
  const totalRewardsDisplay = fmt(TOTAL_REWARDS);
  const goalRemaining = fmt(MONTHLY_GOAL - (TOTAL_DIAMONDS * 0.015));

  return (
    <div className="space-y-5">
      {/* P&L Bar */}
      <div className="bg-[#0d0d0d] border border-[#ff0044]/30 rounded p-4 red-glow">
        <div className="flex items-center gap-2 mb-3">
          <span className="live-dot inline-block w-2 h-2 rounded-full bg-green-400" />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">TODAY'S PERFORMANCE</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-[10px] font-mono text-gray-500">TODAY'S DIAMONDS</div>
            <div className="text-3xl font-bebas text-green-400">+{TODAY_DIAMONDS.toLocaleString()}</div>
          </div>
          <div className="w-px h-10 bg-[#222]" />
          <div>
            <div className="text-[10px] font-mono text-gray-500">STREAMING NOW</div>
            <div className="text-3xl font-bebas text-white">{STREAMING_NOW}</div>
          </div>
          <div className="w-px h-10 bg-[#222]" />
          <div>
            <div className="text-[10px] font-mono text-gray-500">MARCH GOAL</div>
            <div className="text-3xl font-bebas text-amber-400">{MARCH_PCT}%</div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
              <span>PROGRESS TO MONTHLY TARGET</span>
              <span className="text-amber-400">{goalRemaining} TO GO</span>
            </div>
            <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div className="h-full rounded-full shimmer-bar" style={{ width: `${MARCH_PCT}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Total Creators" value="802" sub="Active agency" />
        <KpiTile label="Total Diamonds" value={totalDiamondsDisplay} sub="+8.5% MoM" trend="up" color="#ff0044" />
        <KpiTile label="Total Rewards" value={`$${totalRewardsDisplay}`} sub="All time" trend="up" color="#22c55e" />
        <KpiTile label="Hours Streamed" value={fmt(TOTAL_HOURS)} sub="This month" color="#f59e0b" />
      </div>

      {/* Two Column */}
      <div className="grid grid-cols-1 xl:grid-cols-[65fr_35fr] gap-4">
        {/* Top Performers */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden card-hover">
          <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">TOP PERFORMERS</span>
            <span className="text-[10px] font-mono text-gray-600">This Month</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111]">
                  <th className="py-2 px-3 text-center">#</th>
                  <th className="py-2 px-3 text-left">CREATOR</th>
                  <th className="py-2 px-3 text-left">MANAGER</th>
                  <th className="py-2 px-3 text-left">TIER</th>
                  <th className="py-2 px-3 text-left">DIAMONDS</th>
                  <th className="py-2 px-3 text-left">REWARDS</th>
                  <th className="py-2 px-3 text-left">HRS</th>
                  <th className="py-2 px-3 text-left">SCORE</th>
                </tr>
              </thead>
              <tbody>
                {TOP_PERFORMERS.map((c, i) => (
                  <CreatorRow key={c.id} creator={c} rank={i + 1} onClick={onCreatorClick} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">
          {/* Top Earners */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover">
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">TOP EARNERS</span>
            </div>
            <div className="p-3 space-y-2">
              {TOP_EARNERS.map((c, i) => {
                const mgColor = MANAGER_COLORS[c.manager] ?? '#888';
                return (
                  <div key={c.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-[#ff0044]/5 px-1 py-1 rounded transition-colors"
                    onClick={() => onCreatorClick(c)}
                  >
                    <span className="text-[10px] font-mono text-gray-600 w-4 text-right">{i + 1}</span>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bebas text-white shrink-0"
                      style={{ background: `${mgColor}44` }}>
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-300 flex-1 truncate font-dm-sans">{c.name}</span>
                    <span className="text-xs font-mono text-green-400">${fmt(c.rewards)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agency Health */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover">
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">AGENCY HEALTH — TIER DIST.</span>
            </div>
            <div className="p-4 space-y-2">
              {Object.entries(TIER_DIST).reverse().map(([t, count]) => {
                const pct = Math.floor((count / 802) * 100);
                const color = t === 'T1' ? '#fbbf24' : t === 'T2' ? '#60a5fa' : t === 'T3' ? '#4ade80' : t === 'T4' ? '#d1d5db' : t === 'T5' ? '#a78bfa' : '#f87171';
                return (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono w-6" style={{ color }}>{t}</span>
                    <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Diamond Equity Curve */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">DIAMOND EQUITY CURVE — TOP 5</span>
          <div className="flex items-center gap-3">
            {TOP5.map((c, i) => (
              <div key={c.id} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: CURVE_COLORS[i] }} />
                <span className="text-[10px] font-mono text-gray-500">{c.name.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={CURVE_DATA}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 4, fontSize: 11 }}
                labelStyle={{ color: '#999', fontFamily: 'DM Mono' }}
                formatter={(v: number, name: string) => [fmt(v), name]}
              />
              {TOP5.map((c, i) => (
                <Area
                  key={c.id}
                  type="monotone"
                  dataKey={c.name}
                  stroke={CURVE_COLORS[i]}
                  fill={`${CURVE_COLORS[i]}15`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
