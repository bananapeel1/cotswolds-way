export default function WalkScoreGauge({ score }: { score: number }) {
  const label = score <= 3 ? "Easy day" : score <= 6 ? "Moderate" : score <= 8 ? "Tough" : "Very demanding";
  const color = score <= 3 ? "bg-green-500" : score <= 6 ? "bg-amber-500" : score <= 8 ? "bg-red-500" : "bg-red-700";
  const textColor = score <= 3 ? "text-green-700" : score <= 6 ? "text-amber-700" : score <= 8 ? "text-red-700" : "text-red-800";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className={`text-[10px] font-bold ${textColor} whitespace-nowrap`}>{score}/10 {label}</span>
    </div>
  );
}
