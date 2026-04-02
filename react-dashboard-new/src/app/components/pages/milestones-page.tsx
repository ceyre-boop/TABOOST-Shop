import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import { KpiTile } from '../shared/kpi-tile';
import { TierChip } from '../shared/tier-chip';
import type { Creator, Tier } from '../../types';

interface Props { onCreatorClick: (c: Creator) => void; }

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const ACTIVE = CREATORS.filter(c => c.diamonds > 0 && c.tier > 1);
const NEAR = ACTIVE.filter(c => {
  const pct = c.diamonds / c.tierGoal;
  return pct >= 0.7 && pct < 1.0;
}).sort((a, b) => (b.diamonds / b.tierGoal) - (a.diamonds / a.tierGoal));

const AVG_COMPLETION = Math.round(
  ACTIVE.reduce((s, c) => s + Math.min(100, (c.diamonds / c.tierGoal) * 100), 0) / ACTIVE.length
);

const FASTEST = [...ACTIVE].sort((a, b) => (b.diamonds - b.prevMonth) - (a.diamonds - a.prevMonth))[0];

export function MilestonesPage({ onCreatorClick }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Near Promotion" value={String(NEAR.length)} sub="70%+ to next tier" trend="up" color="#22c55e" />
        <KpiTile label="Avg Completion" value={`${AVG_COMPLETION}%`} sub="To next tier" />
        <KpiTile label="Fastest Riser" value={FASTEST?.name?.slice(0, 10) ?? ''} sub={`${fmt(FASTEST?.diamonds ?? 0)} this month`} trend="up" />
        <KpiTile label="Tier Promotions" value="+23" sub="This month" trend="up" color="#22c55e" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Near tier-up cards */}
        <div>
          <div className="text-[10px] font-mono text-green-500 uppercase tracking-widest mb-3">
            CLOSE TO TIER UP — PUSH THEM OVER
          </div>
          <div className="space-y-3">
            {NEAR.slice(0, 8).map(c => {
              const pct = Math.min(100, Math.round((c.diamonds / c.tierGoal) * 100));
              const remaining = Math.max(0, c.tierGoal - c.diamonds);
              const dpr = c.daysStreamed > 0 ? c.diamonds / c.daysStreamed : 0;
              const hrsNeeded = dpr > 0 ? Math.round(remaining / (dpr / (c.hours / c.daysStreamed || 1))) : 0;
              const isPush = pct >= 95;

              return (
                <div key={c.id}
                  className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4 card-hover cursor-pointer"
                  onClick={() => onCreatorClick(c)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-dm-sans text-white">{c.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono" style={{ color: MANAGER_COLORS[c.manager] ?? '#888' }}>{c.manager}</span>
                        <TierChip tier={c.tier} />
                        <span className="text-[10px] font-mono text-gray-500">→</span>
                        <TierChip tier={Math.max(1, c.tier - 1) as Tier} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bebas text-white">{pct}%</div>
                      {isPush && <div className="text-[10px] font-mono text-[#ff0044]">🔥 PUSH THEM OVER!</div>}
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                    <span>{fmt(c.diamonds)} / {fmt(c.tierGoal)}</span>
                    <span className="text-amber-400">~{hrsNeeded}h to goal</span>
                  </div>
                  <div className="h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full shimmer-bar rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full table */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a]">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">ALL ACTIVE — TIER PROGRESS</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 600 }}>
            <table className="w-full">
              <thead className="sticky top-0 bg-[#0a0a0a]">
                <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111]">
                  <th className="py-2 px-3 text-left">CREATOR</th>
                  <th className="py-2 px-3 text-left">TIER</th>
                  <th className="py-2 px-3 text-left">GOAL</th>
                  <th className="py-2 px-3 text-left">PROGRESS</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVE.sort((a, b) => (b.diamonds / b.tierGoal) - (a.diamonds / a.tierGoal)).map(c => {
                  const pct = Math.min(100, Math.round((c.diamonds / c.tierGoal) * 100));
                  const rem = Math.max(0, c.tierGoal - c.diamonds);
                  return (
                    <tr key={c.id}
                      className="border-b border-[#0f0f0f] hover:bg-[#ff0044]/5 cursor-pointer transition-colors"
                      onClick={() => onCreatorClick(c)}
                    >
                      <td className="py-1.5 px-3 text-xs text-white font-dm-sans">{c.name.slice(0, 14)}</td>
                      <td className="py-1.5 px-3"><TierChip tier={c.tier} /></td>
                      <td className="py-1.5 px-3 text-[10px] font-mono text-gray-500">{fmt(c.tierGoal)}</td>
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${pct}%`,
                              background: pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444',
                            }} />
                          </div>
                          <span className="text-[10px] font-mono text-gray-500">{pct}%</span>
                          <span className="text-[10px] font-mono text-gray-600">{fmt(rem)} left</span>
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
    </div>
  );
}
