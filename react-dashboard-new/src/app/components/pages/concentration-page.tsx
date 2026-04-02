import { useMemo } from 'react';
import { CREATORS, MANAGER_COLORS } from '../../data/creators';

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

interface MgrStats { name: string; diamonds: number; share: number; }

export function ConcentrationPage() {
  const mgrStats = useMemo<MgrStats[]>(() => {
    const map = new Map<string, number>();
    CREATORS.forEach(c => map.set(c.manager, (map.get(c.manager) ?? 0) + c.diamonds));
    const total = CREATORS.reduce((s, c) => s + c.diamonds, 0);
    return Array.from(map.entries())
      .map(([name, diamonds]) => ({ name, diamonds, share: diamonds / total }))
      .sort((a, b) => b.diamonds - a.diamonds);
  }, []);

  const hhi = useMemo(() => Math.round(mgrStats.reduce((s, m) => s + (m.share * 100) ** 2, 0)), [mgrStats]);

  const carrington = mgrStats.find(m => m.name === 'CARRINGTON');
  const hhiWithout = useMemo(() => {
    if (!carrington) return hhi;
    const remaining = mgrStats.filter(m => m.name !== 'CARRINGTON');
    const remTotal = remaining.reduce((s, m) => s + m.diamonds, 0);
    return Math.round(remaining.reduce((s, m) => s + ((m.diamonds / remTotal) * 100) ** 2, 0));
  }, [mgrStats, carrington, hhi]);

  const hhiStatus = hhi < 1500 ? { label: 'HEALTHY', color: '#22c55e' } : hhi < 2500 ? { label: 'MODERATE', color: '#f59e0b' } : { label: 'CONCENTRATED', color: '#ef4444' };

  const totalDiamonds = CREATORS.reduce((s, c) => s + c.diamonds, 0);

  return (
    <div className="space-y-5">
      {/* HHI score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-6 card-hover flex flex-col items-center justify-center">
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">HHI CONCENTRATION INDEX</div>
          <div className="text-6xl font-bebas" style={{ color: hhiStatus.color }}>{hhi.toLocaleString()}</div>
          <div className="text-xs font-mono mt-1" style={{ color: hhiStatus.color }}>{hhiStatus.label}</div>
          <div className="text-[10px] font-mono text-gray-600 mt-2 text-center">
            {'{>'} 2500 = dangerous concentration
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-6 card-hover">
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">WHAT IF CARRINGTON LEAVES?</div>
          <div className="flex items-end gap-4">
            <div>
              <div className="text-[9px] font-mono text-gray-600">CURRENT HHI</div>
              <div className="text-3xl font-bebas" style={{ color: hhiStatus.color }}>{hhi.toLocaleString()}</div>
            </div>
            <div className="text-gray-600 font-mono pb-1">→</div>
            <div>
              <div className="text-[9px] font-mono text-gray-600">WITHOUT CARRINGTON</div>
              <div className="text-3xl font-bebas text-green-400">{hhiWithout.toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-3 text-[10px] font-dm-sans text-gray-400">
            Revenue lost: <span className="text-red-400 font-bold">${fmt(carrington?.diamonds ? carrington.diamonds * 5 : 0)}</span> estimated
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-5 card-hover">
          <div className="text-[10px] font-mono text-[#ff0044] uppercase tracking-widest mb-2">RISK CALLOUT</div>
          <p className="text-xs font-dm-sans text-gray-400 leading-relaxed">
            An HHI above 2500 indicates dangerous monopoly concentration. Redistribute top creators across managers, 
            and recruit to diversify revenue streams. CARRINGTON departure would significantly reduce concentration.
          </p>
        </div>
      </div>

      {/* Proportional area (treemap-style) */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">DIAMOND SHARE BY MANAGER</span>
        </div>
        <div className="p-4 flex flex-wrap gap-1" style={{ minHeight: 200 }}>
          {mgrStats.map(m => {
            const pct = m.share * 100;
            const color = MANAGER_COLORS[m.name] ?? '#888';
            const w = Math.max(40, Math.round(pct * 8));
            const h = Math.max(40, Math.round(pct * 4));
            return (
              <div key={m.name}
                className="flex flex-col items-center justify-center rounded border text-center overflow-hidden shrink-0"
                style={{ width: w, height: h, background: `${color}22`, borderColor: `${color}44` }}
                title={`${m.name}: ${pct.toFixed(1)}%`}
              >
                {pct > 5 && <div className="text-[9px] font-bebas" style={{ color }}>{m.name}</div>}
                {pct > 3 && <div className="text-[9px] font-mono text-gray-400">{pct.toFixed(1)}%</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">MANAGER CONCENTRATION TABLE</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
              <th className="py-2 px-4 text-left">#</th>
              <th className="py-2 px-4 text-left">MANAGER</th>
              <th className="py-2 px-4 text-left">DIAMONDS</th>
              <th className="py-2 px-4 text-left">SHARE</th>
              <th className="py-2 px-4 text-left">HHI CONTRIBUTION</th>
            </tr>
          </thead>
          <tbody>
            {mgrStats.map((m, i) => {
              const color = MANAGER_COLORS[m.name] ?? '#888';
              const hhiContrib = Math.round((m.share * 100) ** 2);
              return (
                <tr key={m.name} className="border-b border-[#111] hover:bg-[#ff0044]/5 transition-colors">
                  <td className="py-2 px-4 text-xs font-mono text-gray-600">{i + 1}</td>
                  <td className="py-2 px-4">
                    <span className="text-xs font-bebas" style={{ color }}>{m.name}</span>
                  </td>
                  <td className="py-2 px-4 text-xs font-mono text-white font-bold">{fmt(m.diamonds)}</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${m.share * 100}%`, background: color }} />
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">{(m.share * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-xs font-mono text-amber-400">{hhiContrib}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
