import { useMemo } from 'react';
import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import { TierChip } from '../shared/tier-chip';
import type { Creator } from '../../types';

interface Props { onCreatorClick: (c: Creator) => void; }

function fmt(n: number) {
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function HoursTrapPage({ onCreatorClick }: Props) {
  const trapped = useMemo(() =>
    CREATORS.filter(c => c.hours >= 25 && c.score < 50 && c.diamonds > 0)
      .sort((a, b) => b.hours - a.hours),
    []);

  const tierAvgDph = useMemo(() => {
    const map = new Map<number, number[]>();
    CREATORS.filter(c => c.hours > 0 && c.diamonds > 0).forEach(c => {
      if (!map.has(c.tier)) map.set(c.tier, []);
      map.get(c.tier)!.push(c.diamonds / c.hours);
    });
    const result = new Map<number, number>();
    map.forEach((vals, tier) => result.set(tier, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)));
    return result;
  }, []);

  return (
    <div className="space-y-5">
      <div className="bg-[#0d0d0d] border border-[#ff0044]/30 rounded p-5 red-glow">
        <div className="text-xs font-mono text-[#ff0044] uppercase tracking-widest mb-2">⚠️ HOURS TRAP DETECTION</div>
        <p className="text-xs font-dm-sans text-gray-300 leading-relaxed mb-2">
          <span className="text-[#ff0044] font-bold">{trapped.length} creators</span> are streaming 25+ hours with score below 50.
          This is the Hours Trap: maximum effort, below-average results. It's both a retention risk and a welfare concern —
          burnout is the #1 reason high-effort, low-result creators quit suddenly.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-3">
          {[
            { label: 'TRAPPED CREATORS', value: String(trapped.length), color: '#ef4444' },
            { label: 'AVG HOURS', value: trapped.length > 0 ? `${Math.round(trapped.reduce((s, c) => s + c.hours, 0) / trapped.length)}h` : '0h', color: '#f59e0b' },
            { label: 'AVG SCORE', value: trapped.length > 0 ? String(Math.round(trapped.reduce((s, c) => s + c.score, 0) / trapped.length)) : '0', color: '#fff' },
          ].map(s => (
            <div key={s.label} className="bg-[#0a0a0a] rounded p-3">
              <div className="text-[9px] font-mono text-gray-600">{s.label}</div>
              <div className="text-2xl font-bebas" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {trapped.map(c => {
          const dph = Math.round(c.diamonds / c.hours);
          const tierAvg = tierAvgDph.get(c.tier) ?? 1;
          const effPct = Math.round((dph / tierAvg) * 100);
          const intervention = c.hours > 35 ? 'REDUCE HOURS — Burnout risk critical. Schedule streaming break immediately.'
            : effPct < 50 ? 'CHANGE CONTENT — ◆/hr severely below tier avg. Content approach needs full review.'
            : 'OPTIMIZE SCHEDULE — Shift stream times to higher-traffic windows.';

          return (
            <div key={c.id}
              className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4 card-hover cursor-pointer"
              onClick={() => onCreatorClick(c)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-900/40 flex items-center justify-center text-white font-bebas text-sm">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-dm-sans text-white">{c.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono" style={{ color: MANAGER_COLORS[c.manager] ?? '#888' }}>{c.manager}</span>
                      <TierChip tier={c.tier} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-red-400 font-bold">{c.hours}h streamed</div>
                  <div className="text-xs font-mono text-gray-500">Score: {c.score}/100</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-[#0a0a0a] rounded p-2">
                  <div className="text-[9px] font-mono text-gray-600">◆/HR ACTUAL</div>
                  <div className="text-sm font-mono text-red-400 font-bold">{fmt(dph)}</div>
                </div>
                <div className="bg-[#0a0a0a] rounded p-2">
                  <div className="text-[9px] font-mono text-gray-600">TIER AVG ◆/HR</div>
                  <div className="text-sm font-mono text-gray-300">{fmt(tierAvg)}</div>
                </div>
                <div className="bg-[#0a0a0a] rounded p-2">
                  <div className="text-[9px] font-mono text-gray-600">EFFICIENCY</div>
                  <div className="text-sm font-mono" style={{ color: effPct < 70 ? '#ef4444' : '#f59e0b' }}>{effPct}%</div>
                </div>
              </div>
              <div className="bg-[#ff0044]/10 border border-[#ff0044]/20 rounded px-3 py-2">
                <span className="text-[10px] font-mono text-[#ff0044]">INTERVENTION: </span>
                <span className="text-[10px] font-mono text-gray-300">{intervention}</span>
              </div>
            </div>
          );
        })}

        {trapped.length === 0 && (
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-8 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-sm font-mono text-green-400">No hours-trapped creators detected</div>
          </div>
        )}
      </div>
    </div>
  );
}
