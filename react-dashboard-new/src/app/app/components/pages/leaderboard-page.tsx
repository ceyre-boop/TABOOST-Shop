import { useState, useMemo } from 'react';
import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import { KpiTile } from '../shared/kpi-tile';
import { TierChip } from '../shared/tier-chip';
import { ScoreBar } from '../shared/score-bar';
import type { Creator } from '../../types';

interface Props { onCreatorClick: (c: Creator) => void; }

const PAGE_SIZE = 25;

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function momentum(c: Creator) {
  return (c.last30Days * 4 + c.prevMonth * 2 + c.twoMonthsAgo * 1) / 7;
}

export function LeaderboardPage({ onCreatorClick }: Props) {
  const [mode, setMode] = useState<'diamonds' | 'momentum'>('diamonds');
  const [manager, setManager] = useState('ALL');
  const [page, setPage] = useState(1);

  const MANAGERS = useMemo(() => Array.from(new Set(CREATORS.map(c => c.manager))).sort(), []);

  const sorted = useMemo(() => {
    let r = CREATORS;
    if (manager !== 'ALL') r = r.filter(c => c.manager === manager);
    if (mode === 'diamonds') return [...r].sort((a, b) => b.diamonds - a.diamonds);
    return [...r].sort((a, b) => momentum(b) - momentum(a));
  }, [mode, manager]);

  const diamondRanks = useMemo(() => {
    const m = new Map<string, number>();
    [...CREATORS].sort((a, b) => b.diamonds - a.diamonds).forEach((c, i) => m.set(c.id, i + 1));
    return m;
  }, []);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const ACTIVE = CREATORS.filter(c => c.diamonds > 0);
  const AVG_SCORE = Math.round(ACTIVE.reduce((s, c) => s + c.score, 0) / ACTIVE.length);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Total Creators" value="802" />
        <KpiTile label="Active This Month" value={String(ACTIVE.length)} sub="with diamond data" trend="up" />
        <KpiTile label="Avg Score" value={String(AVG_SCORE)} sub="Agency average" />
        <KpiTile label="Top Momentum" value={CREATORS.sort((a, b) => momentum(b) - momentum(a))[0]?.name.slice(0, 10) ?? ''} sub="Accelerating" trend="up" />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button onClick={() => { setMode('diamonds'); setPage(1); }}
            className={`text-xs font-mono px-4 py-1.5 rounded transition-colors ${mode === 'diamonds' ? 'bg-[#ff0044] text-white' : 'bg-[#111] text-gray-400 border border-[#222] hover:border-[#ff0044]'}`}>
            DIAMOND RANK
          </button>
          <button onClick={() => { setMode('momentum'); setPage(1); }}
            className={`text-xs font-mono px-4 py-1.5 rounded transition-colors ${mode === 'momentum' ? 'bg-[#ff0044] text-white' : 'bg-[#111] text-gray-400 border border-[#222] hover:border-[#ff0044]'}`}>
            MOMENTUM RANK
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {['ALL', ...MANAGERS.slice(0, 10)].map(m => (
            <button key={m} onClick={() => { setManager(m); setPage(1); }}
              className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${manager === m ? 'bg-[#ff0044] text-white' : 'bg-[#111] text-gray-600 border border-[#1a1a1a] hover:text-gray-300'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
                <th className="py-2 px-3 text-center w-8">RANK</th>
                <th className="py-2 px-3 text-left">CREATOR</th>
                <th className="py-2 px-3 text-left">MANAGER</th>
                <th className="py-2 px-3 text-left">TIER</th>
                <th className="py-2 px-3 text-left">DIAMONDS</th>
                <th className="py-2 px-3 text-left">REWARDS</th>
                <th className="py-2 px-3 text-left">HRS</th>
                <th className="py-2 px-3 text-left">SCORE</th>
                {mode === 'momentum' && <th className="py-2 px-3 text-left">MOMENTUM ↑</th>}
              </tr>
            </thead>
            <tbody>
              {paged.map((c, i) => {
                const rank = (page - 1) * PAGE_SIZE + i + 1;
                const medals = ['🥇', '🥈', '🥉'];
                const dphVal = c.hours > 0 ? Math.round(c.diamonds / c.hours) : 0;
                const diamondRank = diamondRanks.get(c.id) ?? 999;
                const momRank = rank;
                const rankDiff = mode === 'momentum' ? diamondRank - momRank : null;

                return (
                  <tr key={c.id}
                    className="border-b border-[#111] hover:bg-[#ff0044]/5 cursor-pointer transition-colors"
                    onClick={() => onCreatorClick(c)}
                  >
                    <td className="py-2 px-3 text-xs font-mono text-gray-500 text-center">
                      {rank <= 3 ? medals[rank - 1] : rank}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bebas text-white shrink-0"
                          style={{ background: `${MANAGER_COLORS[c.manager] ?? '#888'}33` }}>
                          {c.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs text-white font-dm-sans">{c.name}</div>
                          <div className="text-[9px] text-gray-600 font-mono">{c.badge}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-xs font-mono font-bold" style={{ color: MANAGER_COLORS[c.manager] ?? '#888' }}>{c.manager}</span>
                    </td>
                    <td className="py-2 px-3"><TierChip tier={c.tier} /></td>
                    <td className="py-2 px-3">
                      <div>
                        <span className="text-xs font-mono text-white font-bold">{fmt(c.diamonds)}</span>
                        {dphVal > 0 && <div className="text-[9px] font-mono text-gray-600">{fmt(dphVal)}/hr</div>}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs font-mono text-green-400">${fmt(c.rewards)}</td>
                    <td className="py-2 px-3 text-xs font-mono text-gray-400">{c.hours}h</td>
                    <td className="py-2 px-3 w-24"><ScoreBar score={c.score} /></td>
                    {mode === 'momentum' && (
                      <td className="py-2 px-3">
                        <div>
                          <span className="text-xs font-mono text-amber-400 font-bold">{fmt(Math.round(momentum(c)))}</span>
                          {rankDiff !== null && (
                            <div className={`text-[9px] font-mono ${rankDiff > 0 ? 'text-green-400' : rankDiff < 0 ? 'text-red-400' : 'text-gray-600'}`}>
                              {rankDiff > 0 ? `↑${rankDiff}` : rankDiff < 0 ? `↓${Math.abs(rankDiff)}` : '—'} positions
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-[#111] flex items-center justify-between bg-[#0a0a0a]">
          <span className="text-[10px] font-mono text-gray-600">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-600">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="text-xs font-mono px-3 py-1 bg-[#111] border border-[#222] text-gray-400 rounded hover:border-[#ff0044] disabled:opacity-30 transition-colors">PREV</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="text-xs font-mono px-3 py-1 bg-[#111] border border-[#222] text-gray-400 rounded hover:border-[#ff0044] disabled:opacity-30 transition-colors">NEXT</button>
          </div>
        </div>
      </div>
    </div>
  );
}
