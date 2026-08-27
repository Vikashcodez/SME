export function ProgressRing({ value = 0, max = 100, size = 68, strokeWidth = 7, color = "#10B981", trackColor = "#EEF1F6", centerLabel, centerSubLabel }) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, (value / safeMax) * 100);
  const clampedPct = Math.min(pct, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedPct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      {(centerLabel !== undefined || centerSubLabel !== undefined) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel !== undefined && <span className="text-[13px] font-bold text-slate-800 tabular-nums leading-none">{centerLabel}</span>}
          {centerSubLabel !== undefined && <span className="text-[9px] text-slate-400 leading-none mt-1">{centerSubLabel}</span>}
        </div>
      )}
    </div>
  );
}
