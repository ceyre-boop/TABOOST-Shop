import { useState, useMemo } from 'react';
import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import { CreatorRow } from '../shared/creator-row';
import type { Creator } from '../../types';

interface Props { search: string; onCreatorClick: (c: Creator) => void; }

const MANAGERS = Array.from(new Set(CREATORS.map(c => c.manager))).sort();
const PAGE_SIZE = 25;

export function CreatorsPage({ search, onCreatorClick }: Props) {
  const [managerFilter, setManagerFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let r = CREATORS;
    if (managerFilter !== 'ALL') r = r.filter(c => c.manager === managerFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(c => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q));
    }
    return r.sort((a, b) => b.diamonds - a.diamonds);
  }, [search, managerFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function setMgr(m: string) { setManagerFilter(m); setPage(1); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-gray-500">{filtered.length} creators</span>
        <button className="border border-[#333] text-gray-400 hover:text-white hover:border-[#ff0044] text-xs font-mono px-3 py-1 rounded transition-colors">
          EXPORT CSV
        </button>
      </div>

      {/* Manager Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMgr('ALL')}
          className={`text-[10px] font-mono px-2.5 py-1 rounded transition-colors ${managerFilter === 'ALL' ? 'bg-[#ff0044] text-white' : 'bg-[#111] text-gray-400 hover:text-[#ff0044] border border-[#222]'}`}
        >
          ALL
        </button>
        {MANAGERS.slice(0, 21).map(m => (
          <button
            key={m}
            onClick={() => setMgr(m)}
            className={`text-[10px] font-mono px-2.5 py-1 rounded transition-colors ${managerFilter === m ? 'text-white' : 'bg-[#111] text-gray-400 hover:text-white border border-[#222]'}`}
            style={managerFilter === m ? { background: MANAGER_COLORS[m] ?? '#ff0044', borderColor: MANAGER_COLORS[m] ?? '#ff0044' } : {}}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
                <th className="py-2 px-3 text-center">#</th>
                <th className="py-2 px-3 text-left">CREATOR</th>
                <th className="py-2 px-3 text-left">MANAGER</th>
                <th className="py-2 px-3 text-left">TIER</th>
                <th className="py-2 px-3 text-left">DIAMONDS</th>
                <th className="py-2 px-3 text-left">REWARDS</th>
                <th className="py-2 px-3 text-left">HRS</th>
                <th className="py-2 px-3 text-left">SCORE</th>
                <th className="py-2 px-3 text-left">PACE</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c, i) => (
                <tr
                  key={c.id}
                  className="border-b border-[#111] hover:bg-[#ff0044]/5 cursor-pointer transition-colors group"
                  onClick={() => onCreatorClick(c)}
                >
                  <td className="py-2 px-3 text-xs font-mono text-gray-600 text-center">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-white font-dm-sans group-hover:text-[#ff0044]">{c.name}</div>
                      <span className="text-[10px] bg-[#111] text-gray-500 px-1 rounded font-mono">{c.badge}</span>
                    </div>
                    <div className="text-[10px] text-gray-600 font-mono">{c.handle}</div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs font-mono font-bold" style={{ color: MANAGER_COLORS[c.manager] ?? '#888' }}>{c.manager}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{
                      background: c.tier === 1 ? '#7c2d12' : c.tier === 2 ? '#1e3a5f' : c.tier === 3 ? '#14532d' : '#1c1c1c',
                      color: c.tier === 1 ? '#fbbf24' : c.tier === 2 ? '#60a5fa' : c.tier === 3 ? '#4ade80' : '#d1d5db',
                    }}>T{c.tier}</span>
                  </td>
                  <td className="py-2 px-3 text-xs font-mono text-white font-bold tabular-nums">
                    {c.diamonds >= 1000 ? `${(c.diamonds / 1000).toFixed(0)}K` : c.diamonds}
                  </td>
                  <td className="py-2 px-3 text-xs font-mono text-green-400 tabular-nums">
                    ${c.rewards >= 1000 ? `${(c.rewards / 1000).toFixed(0)}K` : c.rewards}
                  </td>
                  <td className="py-2 px-3 text-xs font-mono text-gray-400 tabular-nums">{c.hours}h</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${c.score}%`,
                          background: c.score >= 70 ? '#22c55e' : c.score >= 40 ? '#f59e0b' : '#ef4444'
                        }} />
                      </div>
                      <span className="text-[10px] font-mono text-gray-600">{c.score}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-[10px] font-mono ${c.dayPace >= 70 ? 'text-green-400' : c.dayPace >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                      {c.dayPace}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-[#111] flex items-center justify-between bg-[#0a0a0a]">
          <span className="text-[10px] font-mono text-gray-600">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} creators
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-600">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="text-xs font-mono px-3 py-1 bg-[#111] border border-[#222] text-gray-400 rounded hover:border-[#ff0044] hover:text-white disabled:opacity-30 transition-colors">
              PREV
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="text-xs font-mono px-3 py-1 bg-[#111] border border-[#222] text-gray-400 rounded hover:border-[#ff0044] hover:text-white disabled:opacity-30 transition-colors">
              NEXT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
