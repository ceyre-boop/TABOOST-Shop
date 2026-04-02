import type { Creator } from '../../types';
import { TierChip } from './tier-chip';
import { ScoreBar } from './score-bar';
import { MANAGER_COLORS } from '../../data/creators';

interface Props {
  creator: Creator;
  rank: number;
  onClick: (c: Creator) => void;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function CreatorRow({ creator, rank, onClick }: Props) {
  const mgColor = MANAGER_COLORS[creator.manager] ?? '#888';
  return (
    <tr
      className="border-b border-[#111] hover:bg-[#ff0044]/5 cursor-pointer transition-colors group"
      onClick={() => onClick(creator)}
    >
      <td className="py-2 px-3 text-xs font-mono text-gray-500 text-center w-8">
        {rank <= 3 ? MEDALS[rank - 1] : <span className="text-gray-600">{rank}</span>}
      </td>
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bebas text-white shrink-0"
            style={{ background: `${mgColor}33`, border: `1px solid ${mgColor}66` }}>
            {creator.name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-xs text-white font-dm-sans group-hover:text-[#ff0044] transition-colors">
              {creator.name}
            </div>
            <div className="text-[10px] text-gray-600 font-mono">{creator.handle}</div>
          </div>
          <span className="text-[10px] bg-[#111] text-gray-500 px-1 rounded font-mono">{creator.badge}</span>
        </div>
      </td>
      <td className="py-2 px-3">
        <span className="text-xs font-mono font-bold" style={{ color: mgColor }}>{creator.manager}</span>
      </td>
      <td className="py-2 px-3"><TierChip tier={creator.tier} /></td>
      <td className="py-2 px-3 text-xs font-mono text-white tabular-nums font-bold">{fmt(creator.diamonds)}</td>
      <td className="py-2 px-3 text-xs font-mono text-green-400 tabular-nums">${fmt(creator.rewards)}</td>
      <td className="py-2 px-3 text-xs font-mono text-gray-400 tabular-nums">{creator.hours}h</td>
      <td className="py-2 px-3 w-28"><ScoreBar score={creator.score} /></td>
    </tr>
  );
}
