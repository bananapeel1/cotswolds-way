export default function WalkScoreGauge({ score, compact }: { score: number; compact?: boolean }) {
  const label = score <= 3 ? "Easy" : score <= 6 ? "Moderate" : score <= 8 ? "Tough" : "Demanding";
  const bg = score <= 3 ? "bg-green-500" : score <= 6 ? "bg-amber-500" : score <= 8 ? "bg-orange-500" : "bg-red-600";
  const textBg = score <= 3 ? "bg-green-50 text-green-800" : score <= 6 ? "bg-amber-50 text-amber-800" : score <= 8 ? "bg-orange-50 text-orange-800" : "bg-red-50 text-red-800";

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${textBg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${bg}`} />
        {label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bg} transition-all`} style={{ width: `${score * 10}%` }} />
      </div>
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${textBg}`}>
        <span className="text-xs font-bold">{score}</span>
        <span className="text-[10px] font-medium">{label}</span>
      </div>
    </div>
  );
}
