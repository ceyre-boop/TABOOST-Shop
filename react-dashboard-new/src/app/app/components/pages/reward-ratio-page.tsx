import { useMemo } from 'react';
import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import { TierChip } from '../shared/tier-chip';
import type { Creator } from '../../types';

interface Props { onCreatorClick: (c: Creator) => void; }

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function ratioColor(ratio: number): { color: string; label: string } {
  if (ratio >= 3) return { color: '#fbbf24', label: 'GOLD' };
  if (ratio >= 1) return { color: '#d1d5db', label: 'SILVER' };
  return { color: '#555', label: 'FRAGILE' };
}

export function RewardRatioPage({ onCreatorClick }: Props) {
  const withRatio = useMemo(() =>
    CREATORS.filter(c => c.diamonds > 0)
      .map(c => ({ ...c, ratio: c.diamonds > 0 ? parseFloat((c.rewards / c.diamonds).toFixed(2)) : 0 }))
      .sort((a, b) => b.ratio - a.ratio),
    []);

  const gold = withRatio.filter(c => c.ratio >= 3);
  const silver = withRatio.filter(c => c.ratio >= 1 && c.ratio < 3);
  const fragile = withRatio.filter(c => c.ratio < 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'GOLD (≥3.0)', count: gold.length, color: '#fbbf24', desc: 'Deeply loyal audiences' },
          { label: 'SILVER (1.0-3.0)', count: silver.length, color: '#d1d5db', desc: 'Standard engagement' },
          { label: 'FRAGILE (<1.0)', count: fragile.length, color: '#555', desc: 'Reach without loyalty' },
        ].map(s => (
          <div key={s.label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4 card-hover">
            <div className="text-[10px] font-mono text-gray-600 mb-1">{s.label}</div>
            <div className="text-3xl font-bebas" style={{ color: s.color }}>{s.count}</div>
            <div className="text-[10px] font-mono text-gray-500">{s.desc}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4">
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">ABOUT THIS METRIC</div>
        <p className="text-xs font-dm-sans text-gray-400 leading-relaxed">
          Reward-to-Diamond ratio reveals audience loyalty and gifting intensity independent of raw performance.
          A ratio of 5.0 means the audience gifts 5× more per diamond than a creator with ratio 1.0.
          High ratio + low diamonds = <span className="text-amber-400">hidden gem</span> with loyal micro-audience.
          Low ratio + high diamonds = <span className="text-red-400">structurally fragile</span> — reach without loyalty.
        </p>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">ALL CREATORS — REWARD/DIAMOND RATIO</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
                <th className="py-2 px-3 text-center w-8">#</th>
                <th className="py-2 px-3 text-left">CREATOR</th>
                <th className="py-2 px-3 text-left">MANAGER</th>
                <th className="py-2 px-3 text-left">TIER</th>
                <th className="py-2 px-3 text-left">DIAMONDS</th>
                <th className="py-2 px-3 text-left">REWARDS</th>
                <th className="py-2 px-3 text-left">RATIO</th>
                <th className="py-2 px-3 text-left">LOYALTY</th>
              </tr>
            </thead>
            <tbody>
              {withRatio.slice(0, 50).map((c, i) => {
                const r = ratioColor(c.ratio);
                return (
                  <tr key={c.id}
                    className="border-b border-[#111] hover:bg-[#ff0044]/5 cursor-pointer transition-colors"
                    onClick={() => onCreatorClick(c)}
                  >
                    <td className="py-2 px-3 text-xs font-mono text-gray-600 text-center">{i + 1}</td>
                    <td className="py-2 px-3 text-xs text-white font-dm-sans">{c.name}</td>
                    <td className="py-2 px-3">
                      <span className="text-xs font-mono" style={{ color: MANAGER_COLORS[c.manager] ?? '#888' }}>{c.manager}</span>
                    </td>
                    <td className="py-2 px-3"><TierChip tier={c.tier} /></td>
                    <td className="py-2 px-3 text-xs font-mono text-white">{fmt(c.diamonds)}</td>
                    <td className="py-2 px-3 text-xs font-mono text-green-400">${fmt(c.rewards)}</td>
                    <td className="py-2 px-3">
                      <span className="text-xl font-bebas" style={{ color: r.color }}>{c.ratio.toFixed(2)}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: `${r.color}22`, color: r.color }}>
                        {r.label}
                      </span>
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
