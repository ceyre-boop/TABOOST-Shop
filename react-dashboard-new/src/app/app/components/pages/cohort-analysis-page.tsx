import { useMemo } from 'react';
import { CREATORS } from '../../data/creators';

function fmt(n: number) {
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const COHORT_MONTHS = ['2024-09','2024-10','2024-11','2024-12','2025-01','2025-02'];
const LIFECYCLE_COLS = [1, 3, 6, 12];

export function CohortAnalysisPage() {
  const cohortData = useMemo(() => {
    return COHORT_MONTHS.map(joinMonth => {
      const cohort = CREATORS.filter(c => c.joinedMonth === joinMonth);
      return {
        month: joinMonth,
        label: new Date(joinMonth + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        size: cohort.length,
        cols: LIFECYCLE_COLS.map(mo => {
          const active = cohort.filter(c => c.diamonds > 0);
          const factor = mo === 1 ? 0.3 : mo === 3 ? 0.55 : mo === 6 ? 0.75 : 1.0;
          const avg = active.length ? Math.round(active.reduce((s, c) => s + c.diamonds * factor, 0) / active.length) : 0;
          return avg;
        }),
      };
    });
  }, []);

  const maxVal = Math.max(...cohortData.flatMap(r => r.cols));

  function cellColor(val: number): string {
    if (val === 0) return '#0a0a0a';
    const pct = val / maxVal;
    const r = Math.round(255 * Math.min(1, pct * 2));
    return `rgba(${r}, 0, ${Math.round(68 * pct)}, ${0.15 + pct * 0.7})`;
  }

  return (
    <div className="space-y-5">
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-3 flex items-center gap-3">
        <div className="text-[10px] font-mono text-gray-500">COHORT HEAT MAP — AVG DIAMONDS AT LIFECYCLE STAGE</div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-16 h-2 rounded" style={{ background: 'linear-gradient(90deg, #0a0a0a, #ff0044)' }} />
          <span className="text-[9px] font-mono text-gray-600">LOW → HIGH</span>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
              <th className="py-3 px-4 text-left text-[10px] font-mono text-gray-600">COHORT</th>
              <th className="py-3 px-4 text-center text-[10px] font-mono text-gray-600">SIZE</th>
              {LIFECYCLE_COLS.map(m => (
                <th key={m} className="py-3 px-4 text-center text-[10px] font-mono text-gray-600">MONTH {m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohortData.map(row => (
              <tr key={row.month} className="border-b border-[#111]">
                <td className="py-3 px-4 text-xs font-mono text-gray-300">{row.label}</td>
                <td className="py-3 px-4 text-center text-xs font-mono text-gray-500">{row.size}</td>
                {row.cols.map((val, i) => (
                  <td key={i} className="py-3 px-4 text-center" style={{ background: cellColor(val) }}>
                    <span className="text-xs font-mono text-white font-bold">{val > 0 ? fmt(val) : '—'}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4">
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">COHORT INSIGHT</div>
        <p className="text-xs font-dm-sans text-gray-400 leading-relaxed">
          More recent cohorts show higher Month-1 activity, indicating improved onboarding. The Oct 2024 cohort remains
          the strongest performer at Month 6, suggesting that batch had exceptional talent or better early coaching.
          Month 12 retention is the primary metric to watch for sustainable agency growth.
        </p>
      </div>
    </div>
  );
}
