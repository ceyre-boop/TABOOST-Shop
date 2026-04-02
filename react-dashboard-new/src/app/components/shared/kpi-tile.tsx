interface Props {
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export function KpiTile({ label, value, sub, trend, color = '#ff0044' }: Props) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded card-hover p-4 flex flex-col gap-1 relative overflow-hidden">
      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-bebas text-white tracking-wide">{value}</div>
      {sub && (
        <div className={`text-xs font-mono flex items-center gap-1 ${
          trend === 'up' ? 'text-green-400' :
          trend === 'down' ? 'text-red-400' :
          'text-gray-400'
        }`}>
          {trend === 'up' && '▲'}
          {trend === 'down' && '▼'}
          {sub}
        </div>
      )}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] heartbeat"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
    </div>
  );
}
