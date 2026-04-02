import { useMemo } from 'react';
import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import type { Creator } from '../../types';
import { ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from 'recharts';

interface Props { onCreatorClick: (c: Creator) => void; }

type Archetype = 'Grinder' | 'Sprinter' | 'Casual' | 'Sleeper';

function getArchetype(c: Creator): Archetype {
  if (c.diamonds === 0) return 'Sleeper';
  const vol = c.prevMonth > 0 ? Math.abs(c.last30Days - c.prevMonth) / c.prevMonth : 0;
  if (c.hours >= 20 && vol < 0.3 && c.score >= 60) return 'Grinder';
  if (c.diamonds > 80000 && vol > 0.4) return 'Sprinter';
  if (c.hours >= 5 && c.hours <= 15) return 'Casual';
  return 'Sleeper';
}

const ARCHETYPE_COLORS: Record<Archetype, string> = {
  Grinder: '#22c55e', Sprinter: '#ff0044', Casual: '#f59e0b', Sleeper: '#555',
};

const ARCHETYPE_EMOJI: Record<Archetype, string> = {
  Grinder: '⚙️', Sprinter: '⚡', Casual: '😊', Sleeper: '💤',
};

const ARCHETYPE_DESC: Record<Archetype, string> = {
  Grinder: '20+ hrs/mo, consistent MoM, score 60+',
  Sprinter: 'High diamonds in bursts, high volatility',
  Casual: '5-15 hrs/mo, plateaued, low score',
  Sleeper: 'Inactive or near-zero diamonds',
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function ArchetypesPage({ onCreatorClick }: Props) {
  const classified = useMemo(() => CREATORS.map(c => ({ ...c, archetype: getArchetype(c) })), []);

  const archetypes: Archetype[] = ['Grinder', 'Sprinter', 'Casual', 'Sleeper'];
  const stats = useMemo(() => archetypes.map(a => {
    const group = classified.filter(c => c.archetype === a);
    const active = group.filter(c => c.diamonds > 0);
    return {
      archetype: a,
      count: group.length,
      avgDiamonds: active.length ? Math.round(active.reduce((s, c) => s + c.diamonds, 0) / active.length) : 0,
      avgHours: group.length ? Math.round(group.reduce((s, c) => s + c.hours, 0) / group.length) : 0,
      avgScore: group.length ? Math.round(group.reduce((s, c) => s + c.score, 0) / group.length) : 0,
    };
  }), [classified]);

  const scatterData = useMemo(() =>
    classified.filter(c => c.diamonds > 0 && c.hours > 0).map(c => ({
      x: c.hours, y: c.diamonds, archetype: c.archetype, name: c.name, id: c.id,
      fill: ARCHETYPE_COLORS[c.archetype], creator: c,
    })),
    [classified]);

  return (
    <div className="space-y-5">
      {/* Cluster cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.archetype} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4 card-hover">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{ARCHETYPE_EMOJI[s.archetype]}</span>
              <span className="text-lg font-bebas" style={{ color: ARCHETYPE_COLORS[s.archetype] }}>{s.archetype.toUpperCase()}</span>
            </div>
            <div className="text-[10px] font-mono text-gray-600 mb-3">{ARCHETYPE_DESC[s.archetype]}</div>
            <div className="text-3xl font-bebas text-white mb-1">{s.count}</div>
            <div className="space-y-1">
              {[
                { label: 'AVG ◆', value: fmt(s.avgDiamonds) },
                { label: 'AVG HRS', value: `${s.avgHours}h` },
                { label: 'AVG SCORE', value: String(s.avgScore) },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-[10px] font-mono">
                  <span className="text-gray-600">{r.label}</span>
                  <span className="text-gray-300">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Scatter plot */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">ARCHETYPE SCATTER — HOURS vs DIAMONDS</span>
          <div className="flex items-center gap-3">
            {archetypes.map(a => (
              <div key={a} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: ARCHETYPE_COLORS[a] }} />
                <span className="text-[10px] font-mono text-gray-500">{a}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4" style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <XAxis dataKey="x" name="Hours" type="number" tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} label={{ value: 'Hours Streamed', position: 'insideBottom', fill: '#555', fontSize: 10, fontFamily: 'DM Mono' }} />
              <YAxis dataKey="y" name="Diamonds" type="number" tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 4, fontSize: 11 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#111] border border-[#333] rounded p-2 text-[10px] font-mono">
                      <div style={{ color: ARCHETYPE_COLORS[d.archetype as Archetype] }}>{d.archetype}</div>
                      <div className="text-white">{d.name}</div>
                      <div className="text-gray-400">{d.x}h · {fmt(d.y)} ◆</div>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterData} onClick={(d) => onCreatorClick(d.creator)}>
                {scatterData.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.7} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
