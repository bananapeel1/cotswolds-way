"use client";

import { useState, useMemo } from "react";
import {
  type DayStop, VILLAGES,
  getStartVillage, getVillagesBetween, insertStopAtVillage,
  removeStopWithWarning, splitDay, insertRestDay, markTransfer,
} from "@/lib/plan-engine";
import WalkScoreGauge from "./WalkScoreGauge";

const DIFFICULTY_COLOUR: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  moderate: "bg-amber-100 text-amber-800",
  strenuous: "bg-red-100 text-red-800",
};

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
  const [removeWarning, setRemoveWarning] = useState<{ index: number; day: number; miles: number; walkScore: number } | null>(null);
  const [addStopOpenAt, setAddStopOpenAt] = useState<number | null>(null);
  const [expandedNote, setExpandedNote] = useState<number | null>(null);

  const usedVillages = useMemo(() => {
    const s = new Set(stops.map(st => st.village));
    s.add(direction === "north_to_south" ? "Chipping Campden" : "Bath");
    return s;
  }, [stops, direction]);

  const startVillageName = direction === "north_to_south" ? "Chipping Campden" : "Bath";

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

  // Gap component — shows between stops with "Add stop" and "Rest day" buttons
  function GapArea({ fromVillage, toVillage, afterIndex }: { fromVillage: string; toVillage: string; afterIndex: number }) {
    const available = getVillagesBetween(fromVillage, toVillage, direction, usedVillages);
    const isOpen = addStopOpenAt === afterIndex;
    const fromStop = afterIndex >= 0 ? stops[afterIndex] : null;
    const toStop = stops[afterIndex + 1];

    // Don't show gap for rest days (same village)
    if (fromStop?.restDay || toStop?.restDay) {
      return (
        <div className="flex items-center gap-3 px-4 py-1">
          <div className="w-9 flex justify-center"><div className="w-px h-4 bg-primary/15" /></div>
        </div>
      );
    }

    const miles = toStop ? toStop.miles : 0;

    return (
      <div className="relative">
        <div className="flex items-center gap-3 px-4 py-1.5">
          <div className="w-9 flex justify-center"><div className="w-px h-6 bg-primary/15" /></div>
          <span className="text-[10px] text-secondary">
            {miles > 0 ? `${miles} mi` : ""}
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            {available.length > 0 && (
              <button onClick={() => setAddStopOpenAt(isOpen ? null : afterIndex)}
                className="flex items-center gap-1 text-[10px] font-bold text-secondary hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/5">
                <span className="material-symbols-outlined text-xs">add</span>
                Stop
              </button>
            )}
            <button onClick={() => handleRestDay(afterIndex >= 0 ? afterIndex : 0)}
              className="flex items-center gap-1 text-[10px] font-bold text-secondary hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/5">
              <span className="material-symbols-outlined text-xs">bed</span>
              Rest day
            </button>
          </div>
        </div>

        {/* Add stop dropdown */}
        {isOpen && available.length > 0 && (
          <div className="absolute left-12 right-4 mt-1 bg-white rounded-lg shadow-lg border border-outline-variant/20 py-1 z-30 max-h-48 overflow-y-auto">
            <p className="px-3 py-1.5 text-[10px] text-secondary font-bold">Add a stop:</p>
            {available.map(v => (
              <button key={v.name} onClick={() => handleAddStop(v.name)}
                className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors flex items-center justify-between">
                <span>{v.name}</span>
                <span className="text-[10px] text-secondary">mile {v.mile}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-primary">Customise your route</h3>
        <button onClick={onBack} className="text-xs font-bold text-secondary hover:text-primary flex items-center gap-1 transition-colors">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Back to route
        </button>
      </div>

      <p className="text-xs text-secondary mb-4">Add stops, insert rest days, split hard days, or mark transfers. Changes save automatically.</p>

      {/* Start marker */}
      <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 rounded-xl">
        <span className="material-symbols-outlined text-primary text-lg">flag</span>
        <span className="text-sm font-bold text-primary">{startVillageName}</span>
        <span className="text-[10px] text-secondary ml-auto bg-primary/10 px-2 py-0.5 rounded-full">Start</span>
      </div>

      {/* Stops with gaps */}
      {stops.map((stop, i) => {
        const from = getStartVillage(stops, i, direction);
        const isLast = i === stops.length - 1;
        const isWarningTarget = removeWarning?.index === i;

        return (
          <div key={`stop-${i}`}>
            {/* Gap before this stop */}
            <GapArea
              fromVillage={i === 0 ? startVillageName : stops[i - 1].village}
              toVillage={stop.village}
              afterIndex={i - 1}
            />

            {/* Rest day card */}
            {stop.restDay ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-100 text-blue-600 text-sm shrink-0">
                  <span className="material-symbols-outlined text-base">bedtime</span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-blue-800">Rest day in {stop.village}</p>
                  <p className="text-[10px] text-blue-600">Day {stop.day} · 0 miles</p>
                </div>
                <button onClick={() => handleRemove(i)}
                  className="text-blue-400 hover:text-red-500 transition-colors shrink-0 p-1 rounded-lg hover:bg-red-50">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              /* Regular stop card */
              <div className={`rounded-xl border transition-all ${
                isLast ? "bg-tertiary/5 border-tertiary/20" : isWarningTarget ? "bg-amber-50 border-amber-200" : "bg-white border-outline-variant/10"
              }`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold shrink-0 ${
                    isLast ? "bg-tertiary text-white" : stop.transfer ? "bg-blue-100 text-blue-600" : "bg-primary/10 text-primary"
                  }`}>
                    {isLast ? <span className="material-symbols-outlined text-base">flag</span>
                      : stop.transfer ? <span className="material-symbols-outlined text-base">directions_bus</span>
                      : stop.day}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-primary">{stop.village}</p>
                    <p className="text-[10px] text-secondary">
                      Day {stop.day} · {stop.transfer ? "Transfer" : `${stop.miles}mi`} · {stop.cumulative}mi total
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Split button — only for hard days */}
                    {!isLast && !stop.transfer && stop.walkScore >= 7 && (
                      <button onClick={() => handleSplit(i)} title="Split this day"
                        className="text-amber-600 hover:text-amber-800 p-1 rounded-lg hover:bg-amber-50 transition-colors">
                        <span className="material-symbols-outlined text-sm">call_split</span>
                      </button>
                    )}

                    {/* Transfer toggle */}
                    {!isLast && (
                      <button onClick={() => handleTransferToggle(i)} title={stop.transfer ? "Walk this day" : "Take bus/taxi"}
                        className={`p-1 rounded-lg transition-colors ${stop.transfer ? "text-blue-600 bg-blue-50" : "text-secondary hover:text-blue-600 hover:bg-blue-50"}`}>
                        <span className="material-symbols-outlined text-sm">directions_bus</span>
                      </button>
                    )}

                    {/* Note toggle */}
                    <button onClick={() => setExpandedNote(expandedNote === i ? null : i)} title="Add note"
                      className={`p-1 rounded-lg transition-colors ${stop.note ? "text-primary bg-primary/5" : "text-secondary hover:text-primary hover:bg-primary/5"}`}>
                      <span className="material-symbols-outlined text-sm">{stop.note ? "edit_note" : "note_add"}</span>
                    </button>

                    {/* Remove button */}
                    {!isLast && stops.length > 1 && (
                      <button
                        onClick={() => handleRemove(i)}
                        onMouseEnter={() => {
                          // Highlight the two days that would merge
                          const nextDay = i < stops.length - 1 ? stops[i + 1].day : stop.day;
                          onHighlightDays([stop.day, nextDay]);
                        }}
                        onMouseLeave={() => onHighlightDays([])}
                        className="text-secondary hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Walk score */}
                <div className="px-4 pb-2">
                  <WalkScoreGauge score={stop.walkScore} />
                </div>

                {/* Note textarea */}
                {expandedNote === i && (
                  <div className="px-4 pb-3">
                    <textarea
                      value={stop.note || ""}
                      onChange={(e) => handleNoteChange(i, e.target.value)}
                      placeholder="Add a note for this day..."
                      maxLength={200}
                      className="w-full text-xs text-primary bg-surface-container-low rounded-lg border border-outline-variant/20 p-2.5 resize-none focus:outline-none focus:border-primary/40"
                      rows={2}
                    />
                    <p className="text-[9px] text-secondary text-right mt-0.5">{(stop.note || "").length}/200</p>
                  </div>
                )}

                {/* Remove warning */}
                {isWarningTarget && removeWarning && (
                  <div className="mx-4 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800 font-bold mb-2">
                      <span className="material-symbols-outlined text-sm align-text-bottom mr-1">warning</span>
                      This would make Day {removeWarning.day} a {removeWarning.miles}-mile day (score {removeWarning.walkScore}/10)
                    </p>
                    <div className="flex gap-2">
                      <button onClick={confirmRemove}
                        className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors">
                        Remove anyway
                      </button>
                      <button onClick={() => setRemoveWarning(null)}
                        className="px-3 py-1.5 text-xs font-bold text-secondary hover:text-primary transition-colors">
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

      {/* View route button */}
      <div className="pt-4">
        <button onClick={onBack}
          className="w-full bg-primary text-white py-3.5 rounded-2xl font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined">arrow_forward</span>
          View Updated Route
        </button>
      </div>
    </div>
  );
}
