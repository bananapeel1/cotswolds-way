"use client";

import { useState, useMemo } from "react";
import {
  type DayStop, VILLAGES,
  getStartVillage, getVillagesBetween, insertStopAtVillage,
  removeStopWithWarning, splitDay, insertRestDay, markTransfer,
} from "@/lib/plan-engine";
import WalkScoreGauge from "./WalkScoreGauge";
import { useUnits } from "@/contexts/UnitContext";

export default function CustomisePanel({
  stops,
  direction,
  onUpdateStops,
  onBack,
  onHighlightDays,
}: {
  stops: DayStop[];
  direction: "north_to_south" | "south_to_north";
  onUpdateStops: (stops: DayStop[], days: number) => void;
  onBack: () => void;
  onHighlightDays: (days: number[]) => void;
}) {
  const { formatDistance } = useUnits();
  const [removeWarning, setRemoveWarning] = useState<{ index: number; day: number; miles: number; walkScore: number } | null>(null);
  const [addStopOpenAt, setAddStopOpenAt] = useState<number | null>(null);
  const [expandedNote, setExpandedNote] = useState<number | null>(null);

  const usedVillages = useMemo(() => {
    const s = new Set(stops.map(st => st.village));
    s.add(direction === "north_to_south" ? "Chipping Campden" : "Bath");
    return s;
  }, [stops, direction]);

  const startVillageName = direction === "north_to_south" ? "Chipping Campden" : "Bath";
  const endVillageName = direction === "north_to_south" ? "Bath" : "Chipping Campden";

  function handleRemove(index: number) {
    const result = removeStopWithWarning(stops, index, direction);
    if (result.warning) {
      setRemoveWarning({ index, ...result.warning });
    } else {
      onUpdateStops(result.stops, result.stops.length);
      setRemoveWarning(null);
    }
  }

  function confirmRemove() {
    if (!removeWarning) return;
    const result = removeStopWithWarning(stops, removeWarning.index, direction);
    onUpdateStops(result.stops, result.stops.length);
    setRemoveWarning(null);
  }

  function handleAddStop(villageName: string) {
    const newStops = insertStopAtVillage(stops, villageName, direction);
    onUpdateStops(newStops, newStops.length);
    setAddStopOpenAt(null);
  }

  function handleSplit(dayIndex: number) {
    const result = splitDay(stops, dayIndex, direction);
    if (result) onUpdateStops(result, result.length);
  }

  function handleRestDay(afterIndex: number) {
    const result = insertRestDay(stops, afterIndex);
    onUpdateStops(result, result.length);
  }

  function handleTransferToggle(dayIndex: number) {
    const isCurrentlyTransfer = !!stops[dayIndex].transfer;
    const result = markTransfer(stops, dayIndex, !isCurrentlyTransfer, direction);
    onUpdateStops(result, result.length);
  }

  function handleNoteChange(index: number, note: string) {
    const newStops = stops.map((s, i) => i === index ? { ...s, note } : s);
    onUpdateStops(newStops, newStops.length);
  }

  // Leg connector between stops
  function LegConnector({ fromVillage, toVillage, afterIndex }: { fromVillage: string; toVillage: string; afterIndex: number }) {
    const available = getVillagesBetween(fromVillage, toVillage, direction, usedVillages);
    const isOpen = addStopOpenAt === afterIndex;
    const fromStop = afterIndex >= 0 ? stops[afterIndex] : null;
    const toStop = stops[afterIndex + 1];

    // Don't show gap for rest days (same village)
    if (fromStop?.restDay || toStop?.restDay) {
      return (
        <div className="flex items-center gap-3 pl-[30px] py-1">
          <div className="w-px h-4 bg-cream-dark" />
        </div>
      );
    }

    const miles = toStop ? toStop.miles : 0;

    return (
      <div className="relative flex items-center gap-3 py-2.5 pl-[30px]">
        {/* Vertical connector line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-cream-dark" />

        <span className="relative z-10 text-xs text-stone bg-cream px-2.5 py-0.5 rounded-full tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
          {miles > 0 ? formatDistance(miles) : ""}
        </span>

        <div className="flex items-center gap-1.5 ml-auto">
          {available.length > 0 && (
            <button onClick={() => setAddStopOpenAt(isOpen ? null : afterIndex)}
              className="flex items-center gap-1 text-[11px] font-medium text-stone px-2.5 py-1 rounded-full border border-transparent hover:border-cream-dark hover:bg-white hover:text-forest transition-all">
              + Stop
            </button>
          )}
          <button onClick={() => handleRestDay(afterIndex >= 0 ? afterIndex : 0)}
            className="flex items-center gap-1 text-[11px] font-medium text-stone px-2.5 py-1 rounded-full border border-transparent hover:border-cream-dark hover:bg-white hover:text-forest transition-all">
            🛏️ Rest day
          </button>
        </div>

        {/* Add stop dropdown */}
        {isOpen && available.length > 0 && (
          <div className="absolute left-16 right-4 top-full mt-1 bg-white rounded-xl shadow-lg border border-outline-variant/20 py-1 z-30 max-h-48 overflow-y-auto">
            <p className="px-3 py-1.5 text-[10px] text-stone font-semibold">Add a stop:</p>
            {available.map(v => (
              <button key={v.name} onClick={() => handleAddStop(v.name)}
                className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-forest/5 transition-colors flex items-center justify-between">
                <span>{v.name}</span>
                <span className="text-[10px] text-stone">mile {v.mile}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[26px] font-medium text-ink" style={{ fontFamily: "var(--font-serif)" }}>
          Customise your route
        </h2>
        <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-forest font-medium hover:opacity-70 transition-opacity">
          ← Back to route
        </button>
      </div>
      <p className="text-sm text-stone mb-7 leading-relaxed">
        Add stops, insert rest days, split hard days, or mark transfers. Changes save automatically.
      </p>

      <div className="flex flex-col">
        {/* Start marker */}
        <div className="flex items-center gap-3 px-5 py-3.5 bg-forest-deep rounded-xl text-white">
          <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs">🚩</div>
          <h4 className="text-base font-semibold" style={{ fontFamily: "var(--font-serif)" }}>{startVillageName}</h4>
          <span className="ml-auto text-[11px] uppercase tracking-wider text-white/60 font-medium">Start</span>
        </div>

        {/* Stops with leg connectors */}
        {stops.map((stop, i) => {
          const isLast = i === stops.length - 1;
          const isWarningTarget = removeWarning?.index === i;

          const diffLabel = stop.walkScore >= 7 ? "Tough" : stop.walkScore >= 4 ? "Moderate" : "Easy";
          const diffBarClass = stop.walkScore >= 7 ? "bg-terracotta" : stop.walkScore >= 4 ? "bg-amber-warm" : "bg-forest-light";
          const diffLabelClass = stop.walkScore >= 7 ? "text-terracotta" : stop.walkScore >= 4 ? "text-amber-warm" : "text-forest-light";
          const diffWidth = `${Math.min(stop.walkScore * 10, 100)}%`;

          return (
            <div key={`stop-${i}`}>
              {/* Leg connector before this stop */}
              <LegConnector
                fromVillage={i === 0 ? startVillageName : stops[i - 1].village}
                toVillage={stop.village}
                afterIndex={i - 1}
              />

              {/* Rest day card */}
              {stop.restDay ? (
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-[20px] bg-blue-50 border-[1.5px] border-blue-100">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-600 text-sm shrink-0">
                    <span className="material-symbols-outlined text-base">bedtime</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-blue-800">Rest day in {stop.village}</p>
                    <p className="text-[10px] text-blue-600">Day {stop.day} · {formatDistance(0)}</p>
                  </div>
                  <button onClick={() => handleRemove(i)}
                    className="text-blue-400 hover:text-red-500 transition-colors shrink-0 p-1 rounded-lg hover:bg-red-50">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ) : isLast ? (
                /* End marker — last stop is the finish */
                <div className="flex items-center gap-3 px-5 py-3.5 bg-forest rounded-xl text-white">
                  <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs">📍</div>
                  <h4 className="text-base font-semibold" style={{ fontFamily: "var(--font-serif)" }}>{stop.village}</h4>
                  <span className="ml-auto text-[11px] uppercase tracking-wider text-white/60 font-medium">
                    Day {stop.day} · {formatDistance(stop.cumulative)} total
                  </span>
                </div>
              ) : (
                /* Regular stop card */
                <div className={`bg-white rounded-[20px] border-[1.5px] shadow-[0_1px_3px_rgba(30,63,43,0.06)] transition-all ${
                  isWarningTarget ? "border-amber-200 bg-amber-50/50" : "border-transparent hover:border-forest/8 hover:shadow-[0_4px_16px_rgba(30,63,43,0.08)]"
                } px-5 py-4`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-forest text-white flex items-center justify-center text-sm font-medium shrink-0 tabular-nums">
                      {stop.transfer ? (
                        <span className="material-symbols-outlined text-base">directions_bus</span>
                      ) : stop.day}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-ink" style={{ fontFamily: "var(--font-serif)" }}>{stop.village}</h4>
                      <span className="text-xs text-stone">
                        Day {stop.day} · {stop.transfer ? "Transfer" : formatDistance(stop.miles)} · {formatDistance(stop.cumulative)} total
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!stop.transfer && stop.walkScore >= 7 && (
                        <button onClick={() => handleSplit(i)} title="Split this day"
                          className="w-8 h-8 rounded-lg border border-cream-dark bg-white flex items-center justify-center text-stone hover:border-forest-light hover:text-forest hover:bg-forest/3 transition-all">
                          <span className="material-symbols-outlined text-sm">call_split</span>
                        </button>
                      )}
                      <button onClick={() => handleTransferToggle(i)} title={stop.transfer ? "Walk this day" : "Take bus/taxi"}
                        className={`w-8 h-8 rounded-lg border border-cream-dark bg-white flex items-center justify-center transition-all ${
                          stop.transfer ? "text-blue-600 bg-blue-50 border-blue-200" : "text-stone hover:border-forest-light hover:text-forest hover:bg-forest/3"
                        }`}>
                        <span className="material-symbols-outlined text-sm">directions_bus</span>
                      </button>
                      <button onClick={() => setExpandedNote(expandedNote === i ? null : i)} title="Add note"
                        className={`w-8 h-8 rounded-lg border border-cream-dark bg-white flex items-center justify-center transition-all ${
                          stop.note ? "text-forest bg-forest/5 border-forest/20" : "text-stone hover:border-forest-light hover:text-forest hover:bg-forest/3"
                        }`}>
                        <span className="material-symbols-outlined text-sm">{stop.note ? "edit_note" : "note_add"}</span>
                      </button>
                      {stops.length > 1 && (
                        <button
                          onClick={() => handleRemove(i)}
                          onMouseEnter={() => {
                            const nextDay = i < stops.length - 1 ? stops[i + 1].day : stop.day;
                            onHighlightDays([stop.day, nextDay]);
                          }}
                          onMouseLeave={() => onHighlightDays([])}
                          className="w-8 h-8 rounded-lg border border-cream-dark bg-white flex items-center justify-center text-stone hover:border-terracotta-soft hover:text-terracotta hover:bg-terracotta/4 transition-all">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Difficulty bar */}
                  <div className="h-1 rounded-full bg-cream-dark mt-3 overflow-hidden">
                    <div className={`h-full rounded-full ${diffBarClass} transition-all duration-500`} style={{ width: diffWidth }} />
                  </div>
                  <div className={`flex justify-end mt-1 text-[11px] font-semibold tracking-wide ${diffLabelClass}`}>
                    {stop.walkScore} · {diffLabel}
                  </div>

                  {/* Note textarea */}
                  {expandedNote === i && (
                    <div className="mt-3">
                      <textarea
                        value={stop.note || ""}
                        onChange={(e) => handleNoteChange(i, e.target.value)}
                        placeholder="Add a note for this day..."
                        maxLength={200}
                        className="w-full text-xs text-ink bg-cream rounded-lg border border-cream-dark p-2.5 resize-none focus:outline-none focus:border-forest/40"
                        rows={2}
                      />
                      <p className="text-[9px] text-stone text-right mt-0.5">{(stop.note || "").length}/200</p>
                    </div>
                  )}

                  {/* Remove warning */}
                  {isWarningTarget && removeWarning && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800 font-bold mb-2">
                        <span className="material-symbols-outlined text-sm align-text-bottom mr-1">warning</span>
                        This would make Day {removeWarning.day} a {formatDistance(removeWarning.miles)} day (score {removeWarning.walkScore}/10)
                      </p>
                      <div className="flex gap-2">
                        <button onClick={confirmRemove}
                          className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors">
                          Remove anyway
                        </button>
                        <button onClick={() => setRemoveWarning(null)}
                          className="px-3 py-1.5 text-xs font-bold text-stone hover:text-ink transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* View Updated Route CTA */}
      <div className="pt-6">
        <button onClick={onBack}
          className="w-full flex items-center justify-center gap-2.5 py-[18px] px-8 bg-forest text-white rounded-[20px] text-base font-semibold transition-all duration-350 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(45,90,61,0.3)] group">
          View Updated Route
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="transition-transform group-hover:translate-x-1">
            <path d="M5 12h12m0 0l-4-4m4 4l-4 4"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
