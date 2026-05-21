"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { DayStop, PlanState } from "@/lib/plan-engine";
import { trackEvent, trackOutboundClick } from "@/lib/track";

const PLAN_STORAGE_KEY = "cotswold-plan";

const DIFF_BG: Record<DayStop["difficulty"], string> = {
  easy: "bg-forest-light/15 text-forest-deep",
  moderate: "bg-amber-warm/15 text-amber-warm",
  strenuous: "bg-terracotta/15 text-terracotta",
};

export default function SharedPlanView({
  id,
  plan,
  createdAt,
}: {
  id: string;
  plan: PlanState;
  createdAt: string;
}) {
  const router = useRouter();

  // Count this view exactly once per mount.
  useEffect(() => {
    trackEvent("plan_opened_shared", { id, days: plan.days });
  }, [id, plan.days]);

  const totalMiles = useMemo(
    () => plan.stops.reduce((sum, s) => sum + s.miles, 0),
    [plan.stops],
  );
  const bookedStays = useMemo(
    () => plan.stops.filter((s) => s.accommodation && !s.restDay).length,
    [plan.stops],
  );
  const totalStays = useMemo(
    () => plan.stops.filter((s) => !s.restDay).length,
    [plan.stops],
  );

  const openInPlanner = useCallback(() => {
    try {
      localStorage.setItem(
        PLAN_STORAGE_KEY,
        JSON.stringify({ version: 1, plan, savedAt: new Date().toISOString() }),
      );
    } catch {
      // ignore
    }
    router.push("/plan");
  }, [plan, router]);

  const dateLabel = useMemo(() => {
    try {
      return new Date(createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }, [createdAt]);

  return (
    <main className="max-w-[760px] mx-auto px-6 py-12">
      <section className="text-center mb-8">
        <span className="inline-flex items-center gap-2 bg-tertiary/10 text-tertiary rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Shared itinerary
        </span>
        <h1 className="text-4xl md:text-[40px] font-medium text-ink mb-3" style={{ fontFamily: "var(--font-serif)" }}>
          {plan.days}-Day Cotswold Way
        </h1>
        <p className="text-[14px] text-stone max-w-md mx-auto">
          {plan.direction === "north_to_south"
            ? "Chipping Campden → Bath"
            : "Bath → Chipping Campden"}
          {" · "}
          {Math.round(totalMiles)} miles
          {" · "}
          shared {dateLabel}
        </p>
      </section>

      <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_1px_3px_rgba(30,63,43,0.06)] mb-6">
        <div className="px-5 py-3 bg-forest/4 text-[11px] font-semibold uppercase tracking-[0.1em] text-forest-deep flex items-center justify-between">
          <span>Itinerary · {bookedStays}/{totalStays} stays picked</span>
        </div>
        <ul className="divide-y divide-cream-dark/50">
          {plan.stops.map((s) => (
            <DayRow key={s.day} stop={s} />
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[12px] text-stone-light">
          Plans aren&apos;t personalised for you — open in your planner to tune pace, dates, and stays.
        </span>
        <button
          onClick={openInPlanner}
          className="px-5 py-2.5 rounded-full bg-tertiary text-white text-[13px] font-semibold hover:bg-terracotta transition-colors"
        >
          Open in my planner →
        </button>
      </div>
    </main>
  );
}

function DayRow({ stop }: { stop: DayStop }) {
  return (
    <li className="px-5 py-4 flex items-start gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-forest text-white text-[14px] font-semibold flex items-center justify-center">
        {stop.day}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-ink text-[15px]">{stop.village}</span>
          <span className="text-[12px] text-stone">{stop.miles} mi</span>
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${DIFF_BG[stop.difficulty]}`}>
            {stop.difficulty}
          </span>
        </div>
        {stop.accommodation ? (
          <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[13px] text-ink-light">
              <span className="font-medium text-ink">{stop.accommodation.name}</span>
              <span className="text-stone-light"> · {stop.accommodation.propertyType}</span>
            </div>
            {stop.accommodation.websiteUrl && (
              <a
                href={stop.accommodation.websiteUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() =>
                  trackOutboundClick({
                    source: "planner",
                    target: stop.accommodation!.websiteUrl!,
                    label: stop.accommodation!.name,
                    meta: { slug: stop.accommodation!.slug, day: stop.day, village: stop.village, surface: "shared_plan" },
                  })
                }
                className="text-[12px] font-semibold text-tertiary hover:text-terracotta underline-offset-2 hover:underline whitespace-nowrap"
              >
                Book direct ↗
              </a>
            )}
          </div>
        ) : (
          <div className="mt-1 text-[12px] text-stone-light">No stay picked</div>
        )}
      </div>
    </li>
  );
}
