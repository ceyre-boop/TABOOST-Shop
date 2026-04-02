import type { Tier } from '../../types';

const TIER_COLORS: Record<Tier, { bg: string; text: string }> = {
  1: { bg: '#7c2d12', text: '#fbbf24' },
  2: { bg: '#1e3a5f', text: '#60a5fa' },
  3: { bg: '#14532d', text: '#4ade80' },
  4: { bg: '#1c1c1c', text: '#d1d5db' },
  5: { bg: '#1a1a2e', text: '#a78bfa' },
  6: { bg: '#1a0a0a', text: '#f87171' },
};

export function TierChip({ tier }: { tier: Tier }) {
  const c = TIER_COLORS[tier];
  return (
    <span
      className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
      style={{ background: c.bg, color: c.text }}
    >
      T{tier}
    </span>
  );
}
