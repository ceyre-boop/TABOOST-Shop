import { CREATORS } from '../../data/creators';

const TICKER_CREATORS = CREATORS
  .filter(c => c.diamonds > 0)
  .sort((a, b) => b.diamonds - a.diamonds)
  .slice(0, 15);

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function TickerTape() {
  const items = [...TICKER_CREATORS, ...TICKER_CREATORS];

  return (
    <div className="h-8 bg-[#0a0a0a] border-b border-[#1a1a1a] overflow-hidden flex items-center shrink-0">
      <div className="ticker-scroll flex items-center whitespace-nowrap gap-0" style={{ width: 'max-content' }}>
        {items.map((c, i) => {
          const up = c.last30Days >= c.prevMonth;
          return (
            <span key={i} className="flex items-center gap-1 px-3">
              <span className="text-gray-500 font-mono text-[10px]">◆</span>
              <span className="text-[#ff0044] font-mono text-[11px]">|</span>
              <span className="text-gray-300 font-mono text-[11px] uppercase">{c.name}</span>
              <span className="text-white font-mono text-[11px] font-bold">{fmt(c.diamonds)}</span>
              <span className={`font-mono text-[11px] ${up ? 'text-green-400' : 'text-red-400'}`}>
                {up ? '▲' : '▼'}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
