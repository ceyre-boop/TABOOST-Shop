import { useState } from 'react';

export function SettingsPage() {
  const [theme, setTheme] = useState<'black' | 'dark' | 'red'>('black');
  const [name, setName] = useState('Marco');
  const [email, setEmail] = useState('marco@taboost.io');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 max-w-4xl">
      {/* Profile */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-6 card-hover">
        <div className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-4">PROFILE SETTINGS</div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono text-gray-600 block mb-1">DISPLAY NAME</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#ff0044] transition-colors" />
          </div>
          <div>
            <label className="text-[10px] font-mono text-gray-600 block mb-1">EMAIL</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#ff0044] transition-colors" />
          </div>
          <div>
            <label className="text-[10px] font-mono text-gray-600 block mb-1">ROLE</label>
            <input value="Admin" disabled
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-3 py-2 text-sm font-mono text-gray-600 cursor-not-allowed" />
          </div>
          <button className="w-full bg-[#ff0044] hover:bg-[#cc0033] text-white text-xs font-mono py-2 rounded transition-colors">
            SAVE CHANGES
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Appearance */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-5 card-hover">
          <div className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-3">APPEARANCE</div>
          <div className="flex gap-2">
            {(['black', 'dark', 'red'] as const).map(t => (
              <button key={t} onClick={() => setTheme(t)}
                className={`flex-1 text-xs font-mono py-1.5 rounded transition-colors ${
                  theme === t ? 'bg-[#ff0044] text-white' : 'bg-[#111] text-gray-400 border border-[#222] hover:border-[#ff0044]'
                }`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-5 card-hover">
          <div className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-3">DATA MANAGEMENT</div>
          <div className="flex flex-col gap-2">
            <button className="w-full bg-[#ff0044] hover:bg-[#cc0033] text-white text-xs font-mono py-2 rounded transition-colors">
              REFRESH DATA
            </button>
            <button className="w-full bg-[#111] border border-[#222] text-gray-400 hover:text-white text-xs font-mono py-2 rounded transition-colors">
              CLEAR CACHE
            </button>
            <button className="w-full border border-[#ff0044]/50 text-[#ff0044] hover:bg-[#ff0044]/10 text-xs font-mono py-2 rounded transition-colors">
              LOGOUT
            </button>
          </div>
        </div>

        {/* Last sync */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-5 card-hover">
          <div className="text-[10px] font-mono text-gray-600 mb-1">LAST SYNC</div>
          <div className="text-sm font-mono text-gray-300">2026-03-08 17:30:00 UTC</div>
          <div className="text-[10px] font-mono text-green-400 mt-1">● All systems nominal</div>
        </div>
      </div>
    </div>
  );
}
