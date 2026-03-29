import { estimateCosts } from "@/lib/plan-engine";

export default function CostEstimator({ days }: { days: number }) {
  const nights = days - 1;
  const costs = estimateCosts(nights);

  const rows = [
    { label: "Accommodation", detail: `${nights} nights x £${costs.perNight}`, amount: costs.accommodation, icon: "bed" },
    { label: "Luggage transfer", detail: `${nights} days x £12`, amount: costs.luggage, icon: "luggage" },
    { label: "Pub lunches", detail: `${days} days x £15`, amount: costs.lunches, icon: "restaurant" },
    { label: "Dinners", detail: `${nights} nights x £25`, amount: costs.dinners, icon: "dinner_dining" },
  ];

  return (
    <div className="bg-surface-container-low rounded-xl p-4">
      <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
        Estimated Budget
      </h3>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xs text-secondary">{row.icon}</span>
              <div>
                <p className="text-xs text-primary">{row.label}</p>
                <p className="text-[10px] text-secondary">{row.detail}</p>
              </div>
            </div>
            <span className="text-sm font-bold text-primary">£{row.amount}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
        <span className="text-sm font-bold text-primary">Total</span>
        <span className="text-lg font-bold text-primary">£{costs.total.toLocaleString()}</span>
      </div>

      <p className="text-[10px] text-secondary mt-2">Based on average B&B prices along the trail. Actual costs may vary.</p>
    </div>
  );
}
