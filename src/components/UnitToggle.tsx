"use client";

import { useUnits } from "@/contexts/UnitContext";

export default function UnitToggle() {
  const { system, toggle } = useUnits();

  return (
    <div className="inline-flex items-center bg-surface-container-high rounded-full p-0.5" role="radiogroup" aria-label="Unit system">
      <button
        role="radio"
        aria-checked={system === "imperial"}
        onClick={system === "imperial" ? undefined : toggle}
        className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all duration-200 ${
          system === "imperial"
            ? "bg-forest text-white shadow-sm"
            : "text-secondary hover:text-secondary/70"
        }`}
      >
        MI
      </button>
      <button
        role="radio"
        aria-checked={system === "metric"}
        onClick={system === "metric" ? undefined : toggle}
        className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all duration-200 ${
          system === "metric"
            ? "bg-forest text-white shadow-sm"
            : "text-secondary hover:text-secondary/70"
        }`}
      >
        KM
      </button>
    </div>
  );
}
