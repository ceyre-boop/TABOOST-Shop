import { useEffect, useState } from 'react';
import type { PageId } from '../../app';

interface Props {
  pageTitle: string;
  onNavigate: (p: PageId) => void;
}

export function Topbar({ pageTitle, onNavigate }: Props) {
  const [time, setTime] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTime(`${h}:${m}:${s}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-[54px] bg-black/80 backdrop-blur border-b border-[#1a1a1a] flex items-center px-6 gap-4 shrink-0 z-10">
      <h1 className="font-bebas text-2xl text-white tracking-widest flex-1">{pageTitle}</h1>

      <div className="flex items-center gap-1.5">
        <span className="live-dot inline-block w-2 h-2 rounded-full bg-green-400 shrink-0" />
        <span className="text-green-400 font-mono text-xs tracking-widest">LIVE</span>
      </div>

      <span className="font-mono text-sm text-gray-300 tabular-nums">{time}</span>

      <button className="border border-[#333] text-gray-400 hover:text-white hover:border-[#ff0044] text-xs font-mono px-3 py-1 rounded transition-colors">
        EXPORT
      </button>

      <button
        onClick={() => onNavigate('alerts')}
        className="bg-[#ff0044] text-white text-xs font-mono px-3 py-1 rounded flex items-center gap-1.5 hover:bg-[#cc0033] transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        ALERTS 3
      </button>
    </header>
  );
}
