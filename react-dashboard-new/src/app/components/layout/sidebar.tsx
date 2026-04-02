import { useState } from 'react';
import type { PageId } from '../../app';

interface Props {
  currentPage: PageId;
  onNavigate: (p: PageId) => void;
  search: string;
  onSearch: (s: string) => void;
}

interface NavItem { id: PageId; label: string; badge?: number | string; }
interface NavSection { title: string; items: NavItem[]; }

const NAV: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'creators', label: 'Creators', badge: 802 },
      { id: 'diamonds', label: 'Diamonds' },
      { id: 'streams', label: 'Live Streams' },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { id: 'managers', label: 'Managers' },
      { id: 'leaderboard', label: 'Leaderboard' },
      { id: 'health', label: 'Creator Health', badge: '!' },
      { id: 'milestones', label: 'Milestones' },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { id: 'archetypes', label: 'Archetypes' },
      { id: 'efficiency', label: 'Efficiency Frontier' },
      { id: 'cohort', label: 'Cohort Analysis' },
      { id: 'churn', label: 'Churn Risk' },
      { id: 'volatility', label: 'Volatility Map' },
      { id: 'concentration', label: 'Concentration' },
      { id: 'hours-trap', label: 'Hours Trap' },
      { id: 'reward-ratio', label: 'Reward Ratio' },
      { id: 'sensitivity', label: 'Sensitivity' },
      { id: 'genre', label: 'Genre Portfolio' },
      { id: 'consistency', label: 'Consistency' },
    ],
  },
  {
    title: 'REPORTS',
    items: [
      { id: 'reports', label: 'Reports' },
      { id: 'alerts', label: 'Alerts', badge: 3 },
      { id: 'settings', label: 'Settings' },
    ],
  },
];

export function Sidebar({ currentPage, onNavigate, search, onSearch }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="flex flex-col bg-black border-r border-[#1a1a1a] shrink-0 overflow-y-auto"
      style={{ width: collapsed ? 56 : 200, transition: 'width 0.2s' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-[#1a1a1a] cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="w-7 h-7 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
            <polygon points="14,2 26,9 26,19 14,26 2,19 2,9" fill="#ff0044" opacity="0.9"/>
            <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill="#080808"/>
            <polygon points="14,11 18,13.5 18,16.5 14,19 10,16.5 10,13.5" fill="#ff0044"/>
          </svg>
        </div>
        {!collapsed && (
          <span className="font-bebas text-2xl text-white tracking-widest">TABOOST</span>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-[#1a1a1a]">
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search creators..."
            className="w-full bg-[#111] border border-[#222] rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#ff0044] font-mono"
          />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2">
        {NAV.map(section => (
          <div key={section.title} className="mb-2">
            {!collapsed && (
              <div className="px-4 py-1 text-[10px] font-mono text-gray-600 tracking-widest">{section.title}</div>
            )}
            {section.items.map(item => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-xs transition-colors text-left group ${
                    active
                      ? 'text-[#ff0044] bg-[#ff0044]/10 border-r-2 border-[#ff0044]'
                      : 'text-gray-400 hover:text-[#ff0044] hover:bg-[#ff0044]/5'
                  }`}
                >
                  {!collapsed && (
                    <>
                      <span className="flex-1 font-dm-sans">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          active ? 'bg-[#ff0044] text-white' : 'bg-[#1a1a1a] text-gray-500 group-hover:bg-[#ff0044]/20 group-hover:text-[#ff0044]'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: active ? '#ff0044' : '#333' }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-[#1a1a1a] flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#ff0044] flex items-center justify-center text-white text-xs font-bebas shrink-0">M</div>
          <div>
            <div className="text-xs text-white font-dm-sans">Marco</div>
            <div className="text-[10px] text-[#ff0044] font-mono">Admin</div>
          </div>
        </div>
      )}
    </aside>
  );
}
