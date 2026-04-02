import { useMemo } from 'react';
import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import { KpiTile } from '../shared/kpi-tile';
import type { Creator } from '../../types';

interface Props { onCreatorClick: (c: Creator) => void; }

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

interface ManagerStats {
  name: string; color: string; count: number; diamonds: number;
  rewards: number; avgHours: number; topCreators: Creator[];
}

export function ManagersPage({ onCreatorClick }: Props) {
  const managers = useMemo<ManagerStats[]>(() => {
    const map = new Map<string, Creator[]>();
    CREATORS.forEach(c => {
      if (!map.has(c.manager)) map.set(c.manager, []);
      map.get(c.manager)!.push(c);
    });
    return Array.from(map.entries()).map(([name, creators]) => ({
      name, color: MANAGER_COLORS[name] ?? '#888',
      count: creators.length,
      diamonds: creators.reduce((s, c) => s + c.diamonds, 0),
      rewards: creators.reduce((s, c) => s + c.rewards, 0),
      avgHours: creators.length > 0 ? Math.round(creators.reduce((s, c) => s + c.hours, 0) / creators.length) : 0,
      topCreators: [...creators].sort((a, b) => b.diamonds - a.diamonds).slice(0, 3),
    })).sort((a, b) => b.diamonds - a.diamonds);
  }, []);

  const topMgr = managers[0];
  const avgCreators = Math.round(CREATORS.length / managers.length);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Total Managers" value={String(managers.length)} />
        <KpiTile label="Avg Creators / Mgr" value={String(avgCreators)} />
        <KpiTile label="Top Manager" value={topMgr?.name ?? ''} sub={fmt(topMgr?.diamonds ?? 0) + ' ◆'} trend="up" />
        <KpiTile label="Best Portfolio ROI" value="+347%" sub="MARCO" trend="up" color="#22c55e" />
      </div>

      {/* Manager Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {managers.map((m, rank) => (
          <div key={m.name} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bebas shrink-0"
                style={{ background: m.color, boxShadow: `0 0 12px ${m.color}40` }}>
                {m.name[0]}
              </div>
              <div className="flex-1">
                <div className="text-lg font-bebas text-white">{m.name}</div>
                <div className="text-[10px] font-mono text-gray-500">RANK #{rank + 1} MANAGER</div>
              </div>
            </div>

            {/* Diamond share bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] font-mono text-gray-600 mb-1">
                <span>DIAMOND SHARE</span>
                <span style={{ color: m.color }}>{fmt(m.diamonds)}</span>
              </div>
              <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${(m.diamonds / (topMgr?.diamonds ?? 1)) * 100}%`,
                  background: m.color,
                }} />
              </div>
            </div>

            {/* Stats 2x2 */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: 'CREATORS', value: String(m.count) },
                { label: 'DIAMONDS', value: fmt(m.diamonds), colored: true },
                { label: 'REWARDS', value: `$${fmt(m.rewards)}` },
                { label: 'AVG HRS', value: `${m.avgHours}h` },
              ].map(s => (
                <div key={s.label} className="bg-[#0a0a0a] rounded p-2">
                  <div className="text-[9px] font-mono text-gray-600">{s.label}</div>
                  <div className="text-sm font-mono font-bold" style={{ color: s.colored ? m.color : '#fff' }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Top creators */}
            <div>
              <div className="text-[9px] font-mono text-gray-600 mb-1">TOP CREATORS</div>
              {m.topCreators.map(c => (
                <div key={c.id}
                  className="flex items-center justify-between py-0.5 cursor-pointer hover:text-[#ff0044] transition-colors"
                  onClick={() => onCreatorClick(c)}
                >
                  <span className="text-[10px] font-mono text-gray-400">{c.name.slice(0, 16)}</span>
                  <span className="text-[10px] font-mono" style={{ color: m.color }}>{fmt(c.diamonds)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Rankings Table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">MANAGER RANKINGS</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
                <th className="py-2 px-3 text-center w-8">#</th>
                <th className="py-2 px-3 text-left">MANAGER</th>
                <th className="py-2 px-3 text-left">TEAM</th>
                <th className="py-2 px-3 text-left">DIAMONDS</th>
                <th className="py-2 px-3 text-left">REWARDS</th>
                <th className="py-2 px-3 text-left">AVG HRS</th>
                <th className="py-2 px-3 text-left">TOP CREATOR</th>
                <th className="py-2 px-3 text-left">SHARE</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m, i) => {
                const share = ((m.diamonds / (CREATORS.reduce((s, c) => s + c.diamonds, 0))) * 100).toFixed(1);
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <tr key={m.name} className="border-b border-[#111] hover:bg-[#ff0044]/5 transition-colors">
                    <td className="py-2 px-3 text-xs font-mono text-gray-600 text-center">
                      {i < 3 ? medals[i] : i + 1}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bebas text-white"
                          style={{ background: m.color }}>
                          {m.name[0]}
                        </div>
                        <span className="text-xs font-bebas text-white" style={{ color: m.color }}>{m.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs font-mono text-gray-400">{m.count}</td>
                    <td className="py-2 px-3 text-xs font-mono text-white font-bold">{fmt(m.diamonds)}</td>
                    <td className="py-2 px-3 text-xs font-mono text-green-400">${fmt(m.rewards)}</td>
                    <td className="py-2 px-3 text-xs font-mono text-gray-400">{m.avgHours}h</td>
                    <td className="py-2 px-3 text-xs font-mono text-gray-300">{m.topCreators[0]?.name.slice(0, 14) ?? '-'}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${share}%`, background: m.color }} />
                        </div>
                        <span className="text-[10px] font-mono text-gray-500">{share}%</span>
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
