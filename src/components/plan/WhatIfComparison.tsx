import { autoStops, estimateCosts, type PlanState } from "@/lib/plan-engine";

export default function WhatIfComparison({
  currentPlan,
  onSelectDays,
}: {
  currentPlan: PlanState;
  onSelectDays: (days: number) => void;
}) {
  const variants = [7, 10, 14].map(days => {
    const stops = autoStops(days, currentPlan.direction);
    const hardestDay = stops.reduce((max, s) => s.walkScore > max.walkScore ? s : max, stops[0]);
    const costs = estimateCosts(days - 1);
    const avgMiles = Math.round((102 / days) * 10) / 10;

    return { days, stops, hardestDay, costs, avgMiles };
  });

  return (
    <div className="bg-surface-container-low rounded-xl p-4">
      <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-base">compare_arrows</span>
        Compare Paces
      </h3>

      <div className="grid grid-cols-3 gap-2">
        {variants.map(v => {
          const isActive = v.days === currentPlan.days;
          return (
            <button
              key={v.days}
              onClick={() => onSelectDays(v.days)}
              className={`rounded-lg p-3 text-center transition-all border ${
                isActive
                  ? "bg-primary/5 border-primary"
                  : "bg-white border-outline-variant/20 hover:border-primary/30"
              }`}
            >
              <p className={`text-lg font-bold ${isActive ? "text-primary" : "text-secondary"}`}>{v.days}</p>
              <p className="text-[10px] text-secondary">days</p>

              <div className="mt-2 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-secondary">Avg/day</span>
                  <span className="font-bold text-primary">{v.avgMiles}mi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Hardest</span>
                  <span className={`font-bold ${v.hardestDay.walkScore > 7 ? "text-red-600" : v.hardestDay.walkScore > 4 ? "text-amber-600" : "text-green-600"}`}>
                    {v.hardestDay.walkScore}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Cost</span>
                  <span className="font-bold text-primary">£{v.costs.total.toLocaleString()}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
