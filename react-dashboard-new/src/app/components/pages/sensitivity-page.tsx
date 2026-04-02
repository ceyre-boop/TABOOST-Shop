import { useMemo } from 'react';
import { CREATORS } from '../../data/creators';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from 'recharts';

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const FLOOR = 5_000_000;

export function SensitivityPage() {
  const sorted = useMemo(() => [...CREATORS].sort((a, b) => b.diamonds - a.diamonds), []);
  const total = CREATORS.reduce((s, c) => s + c.diamonds, 0);
  const totalRev = CREATORS.reduce((s, c) => s + c.rewards, 0);

  const scenarios = useMemo(() => [
    { label: 'Current', diamonds: total, color: '#22c55e' },
    { label: 'Lose Top 1', diamonds: total - sorted.slice(0, 1).reduce((s, c) => s + c.diamonds, 0), color: '#f59e0b' },
    { label: 'Lose Top 5', diamonds: total - sorted.slice(0, 5).reduce((s, c) => s + c.diamonds, 0), color: '#f97316' },
    { label: 'Lose Top 10', diamonds: total - sorted.slice(0, 10).reduce((s, c) => s + c.diamonds, 0), color: '#ef4444' },
    {
      label: 'No Carrington',
      diamonds: total - CREATORS.filter(c => c.manager === 'CARRINGTON').reduce((s, c) => s + c.diamonds, 0),
      color: '#7f1d1d',
    },
  ], [sorted, total]);

  const mvaCost = useMemo(() => {
    let cumulative = 0;
    let i = sorted.length - 1;
    while (cumulative < totalRev - FLOOR * 5 && i >= 0) {
      cumulative += sorted[i].rewards;
      i--;
    }
    return sorted.length - i - 1;
  }, [sorted, totalRev]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Diamonds', value: fmt(total), color: '#fff' },
          { label: 'Total Revenue', value: `$${fmt(totalRev)}`, color: '#22c55e' },
          { label: 'Floor Threshold', value: `$${fmt(FLOOR * 5)}`, color: '#f59e0b' },
          { label: 'Min Viable Creators', value: String(mvaCost), color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4 card-hover">
            <div className="text-[10px] font-mono text-gray-600">{s.label}</div>
            <div className="text-2xl font-bebas" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Waterfall */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">REVENUE SENSITIVITY — SCENARIO WATERFALL</span>
        </div>
        <div className="p-4" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scenarios} margin={{ top: 20, right: 20, bottom: 20, left: 50 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 4, fontSize: 11 }}
                formatter={(v: number) => [fmt(v), 'Diamonds']}
              />
              <Bar dataKey="diamonds" radius={[3, 3, 0, 0]}>
                {scenarios.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scenario table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">SCENARIO BREAKDOWN</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
              <th className="py-2 px-4 text-left">SCENARIO</th>
              <th className="py-2 px-4 text-left">REMAINING ◆</th>
              <th className="py-2 px-4 text-left">IMPACT</th>
              <th className="py-2 px-4 text-left">% LOSS</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map(s => {
              const loss = total - s.diamonds;
              const pct = ((loss / total) * 100).toFixed(1);
              return (
                <tr key={s.label} className="border-b border-[#111] hover:bg-[#ff0044]/5 transition-colors">
                  <td className="py-2 px-4 text-xs font-dm-sans" style={{ color: s.color }}>{s.label}</td>
                  <td className="py-2 px-4 text-xs font-mono text-white">{fmt(s.diamonds)}</td>
                  <td className="py-2 px-4 text-xs font-mono text-red-400">{loss > 0 ? `-${fmt(loss)}` : '—'}</td>
                  <td className="py-2 px-4 text-xs font-mono" style={{ color: parseFloat(pct) > 10 ? '#ef4444' : '#f59e0b' }}>
                    {parseFloat(pct) > 0 ? `-${pct}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
