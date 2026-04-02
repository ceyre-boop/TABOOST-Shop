import { useMemo } from 'react';
import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import type { Creator } from '../../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface Props { onCreatorClick: (c: Creator) => void; }

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function calcChurn(c: Creator): number {
  const activityDrop = c.hours < 5 ? 38 : c.hours < 10 ? 20 : 0;
  const engDecline = c.last30Days < c.prevMonth * 0.7 ? 27 : c.last30Days < c.prevMonth * 0.9 ? 14 : 0;
  const rewardStag = c.diamonds < 20000 ? 22 : 0;
  const peerComp = c.score < 30 ? 13 : c.score < 50 ? 7 : 0;
  return Math.min(100, activityDrop + engDecline + rewardStag + peerComp);
}

const BANDS = [
  { label: '0-20', min: 0, max: 20, color: '#22c55e', status: 'Safe' },
  { label: '21-40', min: 21, max: 40, color: '#84cc16', status: 'Low' },
  { label: '41-60', min: 41, max: 60, color: '#f59e0b', status: 'Medium' },
  { label: '61-80', min: 61, max: 80, color: '#ef4444', status: 'High' },
  { label: '81-100', min: 81, max: 100, color: '#7f1d1d', status: 'Critical' },
];

export function ChurnRiskPage({ onCreatorClick }: Props) {
  const withChurn = useMemo(() => CREATORS.filter(c => c.diamonds > 0).map(c => ({ ...c, churnScore: calcChurn(c) })), []);

  const histogram = useMemo(() => BANDS.map(b => ({
    ...b, count: withChurn.filter(c => c.churnScore >= b.min && c.churnScore <= b.max).length,
  })), [withChurn]);

  const atRisk = useMemo(() => withChurn.filter(c => c.churnScore > 40).sort((a, b) => b.churnScore - a.churnScore), [withChurn]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {BANDS.filter((_, i) => i < 4).map(b => {
          const count = withChurn.filter(c => c.churnScore >= b.min && c.churnScore <= b.max).length;
          return (
            <div key={b.label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4 card-hover relative overflow-hidden">
              <div className="text-[10px] font-mono text-gray-600">{b.status.toUpperCase()}</div>
              <div className="text-2xl font-bebas" style={{ color: b.color }}>{count}</div>
              <div className="text-[10px] font-mono text-gray-500">Risk {b.label}</div>
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: b.color }} />
            </div>
          );
        })}
      </div>

      {/* Histogram */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">CHURN RISK DISTRIBUTION</span>
        </div>
        <div className="p-4" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogram}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 4, fontSize: 11 }} formatter={(v: number) => [v, 'Creators']} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {histogram.map((b, i) => <Cell key={i} fill={b.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* At-risk table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">AT-RISK CREATORS — SCORE {'>'}40</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-gray-600 border-b border-[#111] bg-[#0a0a0a]">
                <th className="py-2 px-3 text-left">CREATOR</th>
                <th className="py-2 px-3 text-left">MANAGER</th>
                <th className="py-2 px-3 text-left">RISK SCORE</th>
                <th className="py-2 px-3 text-left">ACTIVITY</th>
                <th className="py-2 px-3 text-left">ENGAGEMENT</th>
                <th className="py-2 px-3 text-left">STAGNATION</th>
                <th className="py-2 px-3 text-left">REV AT RISK</th>
                <th className="py-2 px-3 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {atRisk.slice(0, 30).map(c => {
                const actFactor = c.hours < 5 ? 38 : c.hours < 10 ? 20 : 0;
                const engFactor = c.last30Days < c.prevMonth * 0.7 ? 27 : 14;
                const stFactor = c.diamonds < 20000 ? 22 : 0;
                return (
                  <tr key={c.id}
                    className="border-b border-[#111] hover:bg-[#ff0044]/5 cursor-pointer transition-colors"
                    onClick={() => onCreatorClick(c)}
                  >
                    <td className="py-2 px-3 text-xs text-white font-dm-sans">{c.name}</td>
                    <td className="py-2 px-3">
                      <span className="text-xs font-mono" style={{ color: MANAGER_COLORS[c.manager] ?? '#888' }}>{c.manager}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-sm font-bebas" style={{ color: c.churnScore > 70 ? '#ef4444' : '#f59e0b' }}>{c.churnScore}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${actFactor}%` }} />
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${engFactor}%` }} />
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full bg-gray-500 rounded-full" style={{ width: `${stFactor}%` }} />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs font-mono text-red-400">${fmt(c.rewards)}</td>
                    <td className="py-2 px-3">
                      <button className="text-[9px] font-mono bg-[#ff0044]/10 text-[#ff0044] border border-[#ff0044]/30 px-2 py-0.5 rounded hover:bg-[#ff0044]/20 transition-colors">
                        OUTREACH
                      </button>
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
