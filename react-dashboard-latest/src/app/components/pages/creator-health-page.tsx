import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import { KpiTile } from '../shared/kpi-tile';
import { TierChip } from '../shared/tier-chip';
import type { Creator } from '../../types';

interface Props { onCreatorClick: (c: Creator) => void; }

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const ACTIVE = CREATORS.filter(c => c.diamonds > 0);
const HEALTHY = ACTIVE.filter(c => c.score >= 70);
const WATCHLIST = ACTIVE.filter(c => c.score >= 40 && c.score < 70);
const AT_RISK = ACTIVE.filter(c => c.score < 40);
const AVG_SCORE = Math.round(ACTIVE.reduce((s, c) => s + c.score, 0) / ACTIVE.length);

const TOP_HEALTH = [...HEALTHY].sort((a, b) => b.score - a.score).slice(0, 6);
const AT_RISK_TOP = [...AT_RISK].sort((a, b) => a.score - b.score).slice(0, 6);

const TOTAL_RISK_REVENUE = AT_RISK.reduce((s, c) => s + c.rewards, 0);

export function CreatorHealthPage({ onCreatorClick }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Healthy (70+)" value={String(HEALTHY.length)} sub="Strong performers" trend="up" color="#22c55e" />
        <KpiTile label="Watch List (40-69)" value={String(WATCHLIST.length)} sub="Needs attention" color="#f59e0b" />
        <KpiTile label="At Risk (<40)" value={String(AT_RISK.length)} sub="Intervention needed" trend="down" color="#ef4444" />
        <KpiTile label="Avg Score" value={`${AVG_SCORE}/100`} sub="Agency average" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Healthy */}
        <div>
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">TOP PERFORMERS — ACCOUNT HEALTH</div>
          <div className="space-y-3">
            {TOP_HEALTH.map(c => {
              const pctToGoal = Math.min(100, Math.round((c.diamonds / c.tierGoal) * 100));
              const remaining = Math.max(0, c.tierGoal - c.diamonds);
              return (
                <div key={c.id}
                  className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4 card-hover cursor-pointer relative overflow-hidden"
                  onClick={() => onCreatorClick(c)}
                >
                  <div className="absolute top-3 right-3">
                    <span className="live-dot inline-block w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bebas text-sm shrink-0"
                      style={{ background: `${MANAGER_COLORS[c.manager] ?? '#888'}33`, border: `1px solid ${MANAGER_COLORS[c.manager] ?? '#888'}66` }}>
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-dm-sans text-white">{c.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono" style={{ color: MANAGER_COLORS[c.manager] ?? '#888' }}>{c.manager}</span>
                        <TierChip tier={c.tier} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bebas text-white">{fmt(c.diamonds)}</div>
                      <div className="text-[9px] font-mono text-gray-600">DIAMONDS THIS MONTH</div>
                    </div>
                  </div>
                  <div className="mb-1 flex justify-between text-[10px] font-mono text-gray-500">
                    <span>{pctToGoal}% to T{c.tier - 1 > 0 ? c.tier - 1 : 1} goal</span>
                    <span className="text-green-400">{fmt(remaining)} remaining</span>
                  </div>
                  <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pctToGoal}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* At Risk */}
        <div>
          <div className="text-[10px] font-mono text-red-500 uppercase tracking-widest mb-3">AT-RISK CREATORS</div>
          <div className="space-y-3">
            {AT_RISK_TOP.map(c => {
              const decline = c.prevMonth > 0 ? ((c.last30Days - c.prevMonth) / c.prevMonth * 100).toFixed(1) : '0';
              return (
                <div key={c.id}
                  className="bg-[#0d0d0d] border border-red-900/40 rounded p-4 cursor-pointer hover:border-red-500/40 transition-colors relative"
                  onClick={() => onCreatorClick(c)}
                >
                  <div className="absolute top-3 right-3">
                    <span className="risk-dot inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bebas text-sm shrink-0 bg-red-900/40">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-dm-sans text-white">{c.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-gray-500">{c.manager}</span>
                        <TierChip tier={c.tier} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bebas text-red-400">{fmt(c.diamonds)}</div>
                      <div className="text-[9px] font-mono text-gray-600">Score: {c.score}/100</div>
                      <div className="text-[10px] font-mono text-red-400">{parseFloat(decline) < 0 ? '▼' : '▲'}{Math.abs(parseFloat(decline))}% MoM</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Insight box */}
          <div className="mt-4 bg-[#0d0d0d] border border-[#ff0044]/30 rounded p-4">
            <div className="text-[10px] font-mono text-[#ff0044] uppercase tracking-widest mb-2">AI RISK SUMMARY</div>
            <p className="text-xs font-dm-sans text-gray-400 leading-relaxed">
              <span className="text-[#ff0044] font-bold">{AT_RISK.length} creators flagged</span> with risk score below 40.
              Estimated monthly revenue at risk: <span className="text-amber-400 font-bold">${fmt(TOTAL_RISK_REVENUE)}</span>.
              Primary risk factors: declining stream hours, stagnant diamond growth, and peer comparison gap.
              Recommend immediate manager outreach for bottom 5 by score.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
