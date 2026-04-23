"use client";

import { useState } from "react";
import { usePlansLibrary } from "@/hooks/usePlansLibrary";
import type { PlanState } from "@/lib/plan-engine";

const DIRECTION_SHORT: Record<PlanState["direction"], string> = {
  north_to_south: "N→S",
  south_to_north: "S→N",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/**
 * Saved-plans drawer. Lets the walker keep multiple itineraries on the same
 * device (e.g. "7-day fast", "10-day relaxed") and switch between them with a
 * click, plus duplicate/rename/delete. Pairs with the existing share-URL
 * encoder, so shared plans can be imported into the library by loading them.
 *
 * Storage is client-only today; the hook is designed so its backend can swap
 * to Supabase once auth lands without changing callers.
 */
export default function PlansLibrary({
  currentPlan,
  onLoad,
}: {
  currentPlan: PlanState;
  onLoad: (plan: PlanState) => void;
}) {
  const { snapshots, save, update, remove, duplicate, hydrated } = usePlansLibrary();
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  if (!hydrated) return null;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const name = saveName.trim();
    if (!name) return;
    save(name, currentPlan);
    setSaveName("");
  }

  return (
    <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(30,63,43,0.06)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-[18px] text-sm font-semibold text-ink hover:bg-cream transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-forest">bookmarks</span>
          Saved trips
          <span className="text-xs font-normal text-stone">
            · {snapshots.length} {snapshots.length === 1 ? "snapshot" : "snapshots"}
          </span>
        </span>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className={`text-stone transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-cream px-5 pt-4 pb-5 space-y-4">
          <form onSubmit={handleSave} className="flex gap-2">
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Name this trip (e.g. 7-day fast, dog-friendly June)"
              className="flex-1 px-3 py-2 rounded-xl border-[1.5px] border-cream-dark text-[13px] focus:outline-none focus:border-forest"
              maxLength={60}
            />
            <button
              type="submit"
              disabled={!saveName.trim()}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-forest text-white disabled:bg-cream-dark disabled:text-stone-light hover:bg-forest-deep transition-colors"
            >
              Save
            </button>
          </form>

          {snapshots.length === 0 ? (
            <p className="text-xs text-stone text-center italic py-3">
              Nothing saved yet. Snapshot the current trip to compare variations later.
            </p>
          ) : (
            <ul className="divide-y divide-cream">
              {snapshots.map((s) => {
                const nights = s.plan.stops.filter((x) => !x.restDay).length - 1;
                const booked = s.plan.stops.filter((x) => x.accommodation && !x.restDay).length;
                return (
                  <li key={s.id} className="py-3">
                    {renamingId === s.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const v = renameValue.trim();
                          if (v) update(s.id, { name: v });
                          setRenamingId(null);
                        }}
                        className="flex gap-2"
                      >
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => setRenamingId(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border-[1.5px] border-forest text-[13px] focus:outline-none"
                          maxLength={60}
                        />
                        <button type="submit" className="text-[11px] font-semibold text-forest">Save</button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-ink truncate">{s.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-stone mt-0.5 flex-wrap">
                            <span>{s.plan.days}d {DIRECTION_SHORT[s.plan.direction]}</span>
                            {nights > 0 && (
                              <span className={booked === nights ? "text-forest-light" : "text-terracotta"}>
                                {booked}/{nights} booked
                              </span>
                            )}
                            {s.plan.startDate && <span>· starts {s.plan.startDate}</span>}
                            <span className="text-stone-light">· updated {relativeTime(s.updatedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onLoad(s.plan)}
                            title="Load this snapshot"
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-forest text-white hover:bg-forest-deep transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => duplicate(s.id)}
                            title="Duplicate"
                            className="w-7 h-7 rounded-full border border-cream-dark bg-white text-stone hover:text-forest hover:border-forest-light transition-colors inline-flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                          </button>
                          <button
                            onClick={() => { setRenamingId(s.id); setRenameValue(s.name); }}
                            title="Rename"
                            className="w-7 h-7 rounded-full border border-cream-dark bg-white text-stone hover:text-forest hover:border-forest-light transition-colors inline-flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${s.name}"?`)) remove(s.id);
                            }}
                            title="Delete"
                            className="w-7 h-7 rounded-full border border-cream-dark bg-white text-stone hover:text-terracotta hover:border-terracotta-soft transition-colors inline-flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
