import type { Creator } from '../../types';
import { CREATORS, MANAGER_COLORS } from '../../data/creators';
import { TierChip } from '../shared/tier-chip';
import { ScoreBar } from '../shared/score-bar';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, RadialBarChart, RadialBar } from 'recharts';

interface Props { creator: Creator; onBack: () => void; }

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const MONTHS = ['Jan', 'Feb', 'Mar'];

export function CreatorProfilePage({ creator, onBack }: Props) {
  const allSorted = [...CREATORS].sort((a, b) => b.diamonds - a.diamonds);
  const rank = allSorted.findIndex(c => c.id === creator.id) + 1;
  const sameTier = CREATORS.filter(c => c.tier === creator.tier && c.diamonds > 0).sort((a, b) => b.diamonds - a.diamonds);
  const tierRank = sameTier.findIndex(c => c.id === creator.id) + 1;
  const tierPct = sameTier.length > 0 ? Math.round((1 - (tierRank - 1) / sameTier.length) * 100) : 0;
  const pctToGoal = Math.min(100, Math.round((creator.diamonds / creator.tierGoal) * 100));

  const churnRisk = Math.max(0, Math.min(100,
    38 * (creator.hours < 5 ? 1 : 0) +
    27 * (creator.last30Days < creator.prevMonth * 0.7 ? 1 : 0) +
    22 * (creator.diamonds < creator.prevMonth * 0.5 ? 1 : 0) +
    13 * (tierRank > sameTier.length * 0.7 ? 1 : 0)
  ));

  const dph = creator.hours > 0 ? Math.round(creator.diamonds / creator.hours) : 0;
  const avgDph = sameTier.filter(c => c.hours > 0).reduce((s, c) => s + c.diamonds / c.hours, 0) / (sameTier.filter(c => c.hours > 0).length || 1);
  const efficiencyPct = avgDph > 0 ? Math.round((dph / avgDph) * 100) : 100;

  const volatility = creator.prevMonth > 0
    ? Math.round(Math.abs(creator.last30Days - creator.prevMonth) / creator.prevMonth * 100)
    : 0;

  const equityData = MONTHS.map((m, i) => ({
    month: m,
    diamonds: [creator.twoMonthsAgo, creator.prevMonth, creator.last30Days][i] ?? 0,
  }));

  const mgColor = MANAGER_COLORS[creator.manager] ?? '#888';

  const radialData = [{ value: churnRisk, fill: churnRisk > 60 ? '#ef4444' : churnRisk > 30 ? '#f59e0b' : '#22c55e' }];

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button onClick={onBack}
        className="text-xs font-mono text-gray-500 hover:text-[#ff0044] flex items-center gap-1 transition-colors">
        ← BACK
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Creator view (what they see) */}
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">CREATOR VIEW — PUBLIC</div>

          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-5 card-hover">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bebas text-white"
                style={{ background: `${mgColor}33`, border: `2px solid ${mgColor}` }}>
                {creator.name[0]?.toUpperCase()}
              </div>
              <div>
                <div className="text-2xl font-bebas text-white">{creator.name}</div>
                <div className="text-xs font-mono text-gray-500">{creator.handle}</div>
                <div className="flex items-center gap-2 mt-1">
                  <TierChip tier={creator.tier} />
                  <span className="text-[10px] font-mono text-gray-500">{creator.badge}</span>
                  <span className="text-[10px] font-mono" style={{ color: mgColor }}>{creator.manager}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'DIAMONDS', value: fmt(creator.diamonds), color: '#fff' },
                { label: 'HOURS', value: `${creator.hours}h`, color: '#888' },
                { label: 'REWARDS', value: `$${fmt(creator.rewards)}`, color: '#22c55e' },
                { label: 'DAYS STREAMED', value: String(creator.daysStreamed), color: '#888' },
                { label: 'SCORE', value: `${creator.score}/100`, color: creator.score >= 70 ? '#22c55e' : creator.score >= 40 ? '#f59e0b' : '#ef4444' },
                { label: 'PACE', value: `${creator.dayPace}%`, color: creator.dayPace >= 70 ? '#22c55e' : '#f59e0b' },
              ].map(s => (
                <div key={s.label} className="bg-[#0a0a0a] rounded p-3">
                  <div className="text-[9px] font-mono text-gray-600">{s.label}</div>
                  <div className="text-lg font-bebas" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div className="mb-2 flex justify-between text-[10px] font-mono text-gray-500">
              <span>TIER PROGRESS</span>
              <span className="text-amber-400">{pctToGoal}%</span>
            </div>
            <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden mb-1">
              <div className="h-full shimmer-bar" style={{ width: `${pctToGoal}%` }} />
            </div>
            <div className="text-[10px] font-mono text-gray-600">{fmt(creator.tierLeft)} remaining to T{Math.max(1, creator.tier - 1)}</div>
          </div>

          {/* 3-month equity */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-4 card-hover">
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">3-MONTH DIAMOND HISTORY</div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 4, fontSize: 11 }}
                    formatter={(v: number) => [fmt(v), '◆']} />
                  <Area type="monotone" dataKey="diamonds" stroke="#ff0044" fill="#ff004420" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Marco view (private analytics) */}
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-[#ff0044] uppercase tracking-widest">MARCO VIEW — PRIVATE ANALYTICS</div>

          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-5 card-hover">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'AGENCY RANK', value: `#${rank}`, color: '#fff' },
                { label: 'TIER PERCENTILE', value: `${tierPct}th`, color: tierPct >= 70 ? '#22c55e' : '#f59e0b' },
                { label: 'VOLATILITY', value: `${volatility}%`, color: volatility > 30 ? '#ef4444' : '#22c55e' },
                { label: 'EFFICIENCY', value: `${efficiencyPct}%`, color: efficiencyPct >= 100 ? '#22c55e' : '#f59e0b' },
              ].map(s => (
                <div key={s.label} className="bg-[#0a0a0a] rounded p-3">
                  <div className="text-[9px] font-mono text-gray-600">{s.label}</div>
                  <div className="text-xl font-bebas" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Churn gauge */}
            <div className="flex items-center gap-4">
              <div style={{ width: 80, height: 80 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius={24} outerRadius={36} data={radialData} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#1a1a1a' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="text-[9px] font-mono text-gray-600">CHURN RISK SCORE</div>
                <div className="text-2xl font-bebas" style={{ color: churnRisk > 60 ? '#ef4444' : churnRisk > 30 ? '#f59e0b' : '#22c55e' }}>
                  {churnRisk}/100
                </div>
                <div className="text-[10px] font-mono text-gray-500">
                  {churnRisk > 60 ? 'HIGH RISK' : churnRisk > 30 ? 'MEDIUM RISK' : 'LOW RISK'}
                </div>
              </div>
            </div>

            {/* Coaching notes */}
            <div className="mt-4">
              <div className="text-[10px] font-mono text-gray-500 mb-1">COACHING NOTES</div>
              <textarea
                defaultValue="Review schedule consistency. Discuss stream time optimization."
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2 text-xs font-dm-sans text-gray-300 focus:outline-none focus:border-[#ff0044] resize-none transition-colors"
                rows={3}
              />
            </div>

            {/* Last contact */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-600">LAST MANAGER CONTACT</span>
              <span className="text-xs font-mono text-gray-400">2026-03-05</span>
            </div>
          </div>

          {/* Recommended action */}
          <div className="bg-[#0d0d0d] border border-[#ff0044]/30 rounded p-4">
            <div className="text-[10px] font-mono text-[#ff0044] uppercase tracking-widest mb-2">RECOMMENDED ACTION TODAY</div>
            <p className="text-xs font-dm-sans text-gray-300 leading-relaxed">
              {churnRisk > 60
                ? `⚠️ URGENT: ${creator.name} shows high churn signals. Schedule immediate 1:1 with ${creator.manager}. Review last 7-day activity drop and discuss retention plan.`
                : volatility > 40
                ? `📊 ${creator.name} shows high performance volatility (${volatility}%). Coach on schedule consistency — it's the #1 predictor of long-term diamond growth.`
                : efficiencyPct < 80
                ? `💡 ${creator.name} is underperforming efficiency-wise at ${dph} ◆/hr vs tier avg ${Math.round(avgDph)}. Analyze stream content and time-slot optimization.`
                : `✅ ${creator.name} is in healthy territory. Monitor tier progress — ${fmt(creator.tierLeft)} remaining to next tier. Encourage consistent streaming.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
