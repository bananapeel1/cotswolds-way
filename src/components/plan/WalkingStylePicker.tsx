"use client";

import { usePace } from "@/contexts/PaceContext";
import type { Archetype, Pack } from "@/lib/plan-engine";

const ARCHETYPES: { value: Archetype; label: string; desc: string; icon: string }[] = [
  { value: "gentle", label: "Gentle", desc: "Flat trails, day walks", icon: "🐌" },
  { value: "moderate", label: "Moderate", desc: "Hilly weekenders are fine", icon: "🚶" },
  { value: "fit", label: "Fit", desc: "Multi-day, packs, elevation", icon: "🥾" },
  { value: "strong", label: "Strong", desc: "Long days, light feet", icon: "🏔️" },
];

const PACKS: { value: Pack; label: string }[] = [
  { value: "day", label: "Daypack" },
  { value: "overnight", label: "Overnight" },
  { value: "full", label: "Full kit" },
];

export default function WalkingStylePicker() {
  const { archetype, pack, setArchetype, setPack } = usePace();
  const selected = archetype ?? "moderate";

  return (
    <div>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone mb-3.5">
        Walking style <span className="flex-1 h-px bg-cream-dark" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {ARCHETYPES.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setArchetype(opt.value)}
              className={`relative p-4 rounded-[16px] border-2 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                isSelected
                  ? "border-forest bg-gradient-to-br from-white to-forest/3 shadow-[0_0_0_3px_rgba(45,90,61,0.08),0_4px_16px_rgba(45,90,61,0.08)]"
                  : "border-transparent bg-white hover:border-cream-dark hover:shadow-[0_4px_16px_rgba(45,90,61,0.06)]"
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base mb-2.5 transition-all ${
                isSelected ? "bg-forest text-white" : "bg-cream text-forest"
              }`}>
                {opt.icon}
              </div>
              <h3 className="text-[15px] font-semibold text-ink leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
                {opt.label}
              </h3>
              <p className="text-[12px] text-stone mt-0.5 leading-snug">{opt.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone">Pack</span>
        <div className="inline-flex rounded-full bg-cream/70 p-0.5">
          {PACKS.map((opt) => {
            const isSelected = pack === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setPack(opt.value)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  isSelected
                    ? "bg-white text-forest-deep shadow-[0_1px_3px_rgba(45,90,61,0.12)]"
                    : "text-stone hover:text-forest"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-stone-light flex-1 min-w-[180px]">
          Tunes how long each day actually takes you. Change anytime.
        </span>
      </div>
    </div>
  );
}
