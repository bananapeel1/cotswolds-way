"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Archetype, PlanState, DayStop } from "@/lib/plan-engine";
import type { TripBrief, PlanRationale } from "@/lib/ai/schemas/trip-brief";
import { usePace } from "@/contexts/PaceContext";
import { trackEvent, trackOutboundClick } from "@/lib/track";

/** Map the AI-extracted fitness enum to our pace archetype. */
function fitnessToArchetype(fitness: TripBrief["fitness"]): Archetype {
  switch (fitness) {
    case "relaxed": return "casual";
    case "moderate": return "steady";
    case "fit": return "strong";
    case "very-fit": return "athletic";
  }
}

const PLAN_STORAGE_KEY = "cotswold-plan";
const HISTORY_MAX = 20;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PlanResult {
  brief: TripBrief;
  planState: PlanState;
  rationale: PlanRationale;
  validationNotes: string[];
}

const EXAMPLES = [
  "5 days, moderate pace, around £100/night, no chains, pub every night, starting Saturday",
  "I've got a week, I'm pretty fit, dog friendly, treat ourselves on the last night",
  "Slow it down — 10 days, take it easy, character-led B&Bs, start in Bath going north",
];

export default function AIPlanComposer() {
  const router = useRouter();
  const { setArchetype } = usePace();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [narrateLoading, setNarrateLoading] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [narration, setNarration] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text || planLoading) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const userMessage: ChatMessage = { role: "user", content: text };
    const nextHistory = [...history, userMessage].slice(-HISTORY_MAX);
    setHistory(nextHistory);
    setInput("");
    setError(null);
    setNarration("");
    setPlanLoading(true);

    let planJson: PlanResult | null = null;
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextHistory }),
        signal: ac.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `plan request failed: ${res.status}`);
      }
      planJson = (await res.json()) as PlanResult;
      setResult(planJson);
      trackEvent("plan_created", {
        source: "ai",
        days: planJson.planState.days,
        direction: planJson.planState.direction,
        fitness: planJson.brief.fitness,
        budget_tier: planJson.brief.budgetTier ?? null,
        dog_friendly: planJson.brief.dogFriendly,
        stops_with_accommodation: planJson.planState.stops.filter((s) => s.accommodation).length,
        total_stops: planJson.planState.stops.length,
        stretched: planJson.planState.requestedDays != null,
      });
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: `Built a ${planJson.planState.days}-day plan with ${planJson.planState.stops.length} stops.`,
      };
      setHistory((h) => [...h, assistantMsg].slice(-HISTORY_MAX));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
      setPlanLoading(false);
      return;
    }
    setPlanLoading(false);

    setNarrateLoading(true);
    try {
      const res = await fetch("/api/ai/narrate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planState: planJson.planState,
          brief: planJson.brief,
          rationale: planJson.rationale,
        }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `narration failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const lines = event.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const payload = dataLine.slice(5).trim();
          if (eventLine?.includes("error")) {
            try {
              const parsed = JSON.parse(payload);
              setError(parsed.error ?? "narration error");
            } catch {
              setError("narration error");
            }
            continue;
          }
          if (eventLine?.includes("done")) continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) setNarration((prev) => prev + parsed.text);
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    }
    setNarrateLoading(false);
  }, [history, input, planLoading]);

  const openInPlanner = useCallback(() => {
    if (!result) return;
    const archetype = fitnessToArchetype(result.brief.fitness);
    const planWithPace: PlanState = { ...result.planState, paceOverride: archetype };
    const stored = {
      version: 1,
      plan: planWithPace,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      setError("Couldn't save plan to your browser. Try again with cookies/storage enabled.");
      return;
    }
    if (saveAsDefault) setArchetype(archetype);
    router.push("/plan");
  }, [result, router, saveAsDefault, setArchetype]);

  /** Re-run the planner with an explicit brief — bypasses the LLM extractor
   * so chip edits apply instantly and deterministically. Mirrors submit()'s
   * shape but uses `briefOverride` against /api/ai/plan, and re-streams the
   * narration so it matches the new plan. */
  const applyBriefOverride = useCallback(async (override: TripBrief) => {
    if (planLoading) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setError(null);
    setNarration("");
    setPlanLoading(true);

    let planJson: PlanResult | null = null;
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ briefOverride: override }),
        signal: ac.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `plan request failed: ${res.status}`);
      }
      planJson = (await res.json()) as PlanResult;
      setResult(planJson);
      trackEvent("plan_modified", { kind: "brief_chip_edit" });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
      setPlanLoading(false);
      return;
    }
    setPlanLoading(false);

    setNarrateLoading(true);
    try {
      const res = await fetch("/api/ai/narrate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planState: planJson.planState,
          brief: planJson.brief,
          rationale: planJson.rationale,
        }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error(`narration failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const lines = event.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const payload = dataLine.slice(5).trim();
          if (eventLine?.includes("error") || eventLine?.includes("done")) continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) setNarration((prev) => prev + parsed.text);
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    }
    setNarrateLoading(false);
  }, [planLoading]);

  const sharePlan = useCallback(async () => {
    if (!result || shareLoading) return;
    setShareLoading(true);
    setShareCopied(false);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planState: { ...result.planState, paceOverride: fitnessToArchetype(result.brief.fitness) },
          brief: result.brief,
          source: "ai_plan",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `share failed: ${res.status}`);
      }
      const { url } = (await res.json()) as { id: string; url: string };
      setShareUrl(url);
      trackEvent("plan_shared", { days: result.planState.days });
      try {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
      } catch {
        // clipboard blocked — URL is still rendered for the user to copy manually
      }
    } catch (err) {
      setError((err as Error).message);
    }
    setShareLoading(false);
  }, [result, shareLoading]);

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
      {/* Composer column */}
      <div className="space-y-4">
        <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(45,90,61,0.06)]">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-stone mb-2">
            Describe your walk
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder={result
              ? "Refine: 'add a rest day after Painswick' · 'make it cheaper' · 'flip direction'"
              : "5 days, moderate pace, around £100 a night, pub every night..."}
            rows={4}
            className="w-full rounded-xl border border-cream-dark/70 bg-cream/40 px-3.5 py-3 text-[14px] text-ink placeholder:text-stone-light focus:outline-none focus:border-forest-light focus:bg-white resize-none"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-stone-light">⌘/Ctrl + Enter to send</span>
            <button
              onClick={submit}
              disabled={planLoading || !input.trim()}
              className="px-5 py-2.5 rounded-full bg-forest text-white text-[13px] font-semibold tracking-wide hover:bg-forest-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {planLoading ? "Planning…" : result ? "Refine plan" : "Plan my trip"}
            </button>
          </div>
        </div>

        {history.length === 0 && (
          <div className="bg-cream/60 rounded-[20px] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone mb-2">Try an example</div>
            <div className="space-y-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="block w-full text-left text-[13px] text-forest hover:text-forest-deep px-3 py-2 rounded-lg hover:bg-white/70 transition-colors"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone">Conversation</div>
            {history.map((m, i) => (
              <div
                key={i}
                className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-forest/5 text-forest-deep ml-6"
                    : "bg-white border border-cream-dark/60 text-ink mr-6"
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 text-terracotta px-4 py-3 text-[13px]">
            {error}
          </div>
        )}
      </div>

      {/* Result column */}
      <div className="space-y-4">
        {!result && !planLoading && (
          <div className="rounded-[20px] border-2 border-dashed border-cream-dark/60 p-10 text-center text-stone">
            <div className="text-[13px]">Your itinerary will appear here.</div>
          </div>
        )}

        {planLoading && (
          <div className="rounded-[20px] bg-white p-6 space-y-2 animate-pulse">
            <div className="h-3 w-3/4 bg-cream-dark/60 rounded" />
            <div className="h-3 w-1/2 bg-cream-dark/60 rounded" />
            <div className="space-y-1.5 pt-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-cream-dark/40 rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {result && (
          <>
            <BriefSummary
              brief={result.brief}
              validationNotes={result.validationNotes}
              saveAsDefault={saveAsDefault}
              onSaveAsDefaultChange={setSaveAsDefault}
              onApplyBrief={applyBriefOverride}
              isReapplying={planLoading || narrateLoading}
            />
            <PlanCards plan={result.planState} />
            <RationalePanel
              narration={narration}
              loading={narrateLoading}
              rationale={result.rationale}
            />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[12px] text-stone min-w-0 flex-1">
                {shareUrl ? (
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-forest-deep">{shareCopied ? "✓ Link copied" : "Share link"}:</span>
                    <a href={shareUrl} className="text-tertiary hover:underline truncate" target="_blank" rel="noopener noreferrer">
                      {shareUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </span>
                ) : (
                  <button
                    onClick={sharePlan}
                    disabled={shareLoading}
                    className="text-stone hover:text-forest-deep underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {shareLoading ? "Creating link…" : "Get a shareable link"}
                  </button>
                )}
              </div>
              <button
                onClick={openInPlanner}
                className="px-6 py-3 rounded-full bg-tertiary text-white text-[13px] font-semibold hover:bg-terracotta transition-colors"
              >
                Open in planner →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type EditField = "days" | "direction" | "tier" | "dog" | null;

const TIER_OPTIONS: { value: NonNullable<TripBrief["budgetTier"]>; label: string }[] = [
  { value: "shoestring", label: "Shoestring" },
  { value: "comfort", label: "Comfort" },
  { value: "treat-yourself", label: "Treat" },
];

function BriefSummary({
  brief,
  validationNotes,
  saveAsDefault,
  onSaveAsDefaultChange,
  onApplyBrief,
  isReapplying,
}: {
  brief: TripBrief;
  validationNotes: string[];
  saveAsDefault: boolean;
  onSaveAsDefaultChange: (next: boolean) => void;
  onApplyBrief: (next: TripBrief) => void;
  isReapplying: boolean;
}) {
  const archetype = fitnessToArchetype(brief.fitness);
  // Local working copy of the brief — edits accumulate here and apply only
  // when the user clicks the explicit "Apply changes" button.
  const [pending, setPending] = useState<TripBrief>(brief);
  const [editing, setEditing] = useState<EditField>(null);

  // Reset working copy whenever the upstream brief changes (e.g. after the
  // user applies a change and a new plan lands).
  useEffect(() => {
    setPending(brief);
    setEditing(null);
  }, [brief]);

  const dirty = useMemo(() => {
    return (
      pending.days !== brief.days ||
      pending.direction !== brief.direction ||
      pending.budgetTier !== brief.budgetTier ||
      pending.dogFriendly !== brief.dogFriendly
    );
  }, [pending, brief]);

  const apply = () => {
    onApplyBrief(pending);
  };
  const reset = () => {
    setPending(brief);
    setEditing(null);
  };

  return (
    <div className="bg-cream/60 rounded-[20px] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone mb-2">
        What I heard <span className="text-stone-light normal-case tracking-normal">— tap a chip to change it</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        <EditableChip
          label={pending.days ? `${pending.days} days` : "any days"}
          active={editing === "days"}
          onClick={() => setEditing(editing === "days" ? null : "days")}
        />
        <EditableChip
          label={pending.direction === "south_to_north" ? "S → N" : "N → S"}
          active={editing === "direction"}
          onClick={() => setEditing(editing === "direction" ? null : "direction")}
        />
        <EditableChip
          label={pending.budgetTier ?? "any tier"}
          active={editing === "tier"}
          onClick={() => setEditing(editing === "tier" ? null : "tier")}
        />
        <EditableChip
          label={pending.dogFriendly ? "dog friendly" : "+ dog friendly"}
          active={editing === "dog"}
          activeColor={pending.dogFriendly ? undefined : "muted"}
          onClick={() => {
            // Toggle directly — no separate editor needed for a boolean
            setPending({ ...pending, dogFriendly: !pending.dogFriendly });
            setEditing(null);
          }}
        />
        {pending.diningPreference !== "any" && (
          <span className="text-[11px] bg-white/80 text-forest-deep rounded-full px-2.5 py-1">
            {pending.diningPreference}
          </span>
        )}
        {pending.mustVisit.length > 0 && (
          <span className="text-[11px] bg-white/80 text-forest-deep rounded-full px-2.5 py-1">
            must: {pending.mustVisit.join(", ")}
          </span>
        )}
      </div>

      {/* Inline editor — only the active chip's controls render */}
      {editing === "days" && (
        <ChipEditor>
          <button
            onClick={() => setPending({ ...pending, days: Math.max(3, (pending.days ?? 7) - 1) })}
            className="w-8 h-8 rounded-full bg-white border border-cream-dark text-forest font-semibold hover:bg-forest hover:text-white transition-colors"
          >−</button>
          <span className="text-[18px] font-semibold text-ink tabular-nums w-12 text-center">{pending.days ?? 7}</span>
          <button
            onClick={() => setPending({ ...pending, days: Math.min(14, (pending.days ?? 7) + 1) })}
            className="w-8 h-8 rounded-full bg-white border border-cream-dark text-forest font-semibold hover:bg-forest hover:text-white transition-colors"
          >+</button>
          <span className="text-[11px] text-stone-light">3–14 days</span>
        </ChipEditor>
      )}
      {editing === "direction" && (
        <ChipEditor>
          {([
            { value: "north_to_south" as const, label: "N → S (Chipping Campden → Bath)" },
            { value: "south_to_north" as const, label: "S → N (Bath → Chipping Campden)" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setPending({ ...pending, direction: opt.value }); setEditing(null); }}
              className={`text-[12px] px-3 py-1.5 rounded-full transition-colors ${
                pending.direction === opt.value
                  ? "bg-forest text-white"
                  : "bg-white border border-cream-dark text-stone hover:border-forest-light"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </ChipEditor>
      )}
      {editing === "tier" && (
        <ChipEditor>
          {TIER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setPending({ ...pending, budgetTier: opt.value }); setEditing(null); }}
              className={`text-[12px] px-3 py-1.5 rounded-full transition-colors ${
                pending.budgetTier === opt.value
                  ? "bg-forest text-white"
                  : "bg-white border border-cream-dark text-stone hover:border-forest-light"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {pending.budgetTier && (
            <button
              onClick={() => { setPending({ ...pending, budgetTier: undefined }); setEditing(null); }}
              className="text-[11px] text-stone hover:text-terracotta underline-offset-2 hover:underline"
            >
              clear
            </button>
          )}
        </ChipEditor>
      )}

      {dirty && (
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={apply}
            disabled={isReapplying}
            className="px-3.5 py-1.5 rounded-full bg-tertiary text-white text-[12px] font-semibold hover:bg-terracotta disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isReapplying ? "Replanning…" : "Apply changes"}
          </button>
          <button
            onClick={reset}
            disabled={isReapplying}
            className="text-[11px] text-stone hover:text-forest underline-offset-2 hover:underline disabled:opacity-50"
          >
            cancel
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap rounded-xl bg-white/70 px-3 py-2 mb-2">
        <span className="text-[11px] uppercase tracking-wider text-stone">Pace</span>
        <span className="text-[12px] font-semibold text-forest-deep capitalize">{archetype}</span>
        <span className="text-[11px] text-stone-light">(used for this plan)</span>
        <label className="ml-auto flex items-center gap-1.5 text-[12px] text-stone cursor-pointer select-none">
          <input
            type="checkbox"
            checked={saveAsDefault}
            onChange={(e) => onSaveAsDefaultChange(e.target.checked)}
            className="accent-forest"
          />
          Save as my default
        </label>
      </div>
      {brief.ambiguities.length > 0 && (
        <details className="text-[12px] text-stone mt-2">
          <summary className="cursor-pointer text-stone hover:text-forest">
            {brief.ambiguities.length} assumption{brief.ambiguities.length === 1 ? "" : "s"} — confirm?
          </summary>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            {brief.ambiguities.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </details>
      )}
      {validationNotes.length > 0 && (
        <div className="mt-2 text-[12px] text-amber-warm">
          Couldn&apos;t match: {validationNotes.join("; ")}
        </div>
      )}
    </div>
  );
}

function EditableChip({
  label,
  active,
  onClick,
  activeColor,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeColor?: "muted";
}) {
  const base = "text-[11px] rounded-full px-2.5 py-1 transition-colors cursor-pointer";
  const cls = active
    ? "bg-forest text-white"
    : activeColor === "muted"
      ? "bg-white/60 text-stone hover:text-forest-deep hover:bg-white"
      : "bg-white/80 text-forest-deep hover:bg-white hover:ring-1 hover:ring-forest/20";
  return (
    <button onClick={onClick} className={`${base} ${cls}`}>
      {label}
    </button>
  );
}

function ChipEditor({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap rounded-xl bg-white/80 px-3 py-2.5 mb-2.5">
      {children}
    </div>
  );
}

function PlanCards({ plan }: { plan: PlanState }) {
  return (
    <div className="bg-white rounded-[20px] overflow-hidden">
      <div className="px-4 py-3 bg-forest/4 text-[11px] font-semibold uppercase tracking-[0.1em] text-forest-deep">
        Itinerary preview
      </div>
      <ul className="divide-y divide-cream-dark/50">
        {plan.stops.map((s) => (
          <DayRow key={s.day} stop={s} />
        ))}
      </ul>
    </div>
  );
}

const DIFF_BG: Record<DayStop["difficulty"], string> = {
  easy: "bg-forest-light/15 text-forest-deep",
  moderate: "bg-amber-warm/15 text-amber-warm",
  strenuous: "bg-terracotta/15 text-terracotta",
};

function DayRow({ stop }: { stop: DayStop }) {
  const acc = stop.accommodation;
  const notDogFriendly = acc?.relaxedConstraints?.includes("dog-friendly");
  return (
    <li className="px-4 py-3 flex items-start gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-forest text-white text-[12px] font-semibold flex items-center justify-center">
        {stop.day}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-ink text-[14px]">{stop.village}</span>
          <span className="text-[12px] text-stone">{stop.miles}mi</span>
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${DIFF_BG[stop.difficulty]}`}>
            {stop.difficulty}
          </span>
          <span className="text-[11px] text-stone-light">score {stop.walkScore}/10</span>
        </div>
        {acc ? (
          <div className="text-[12px] text-stone mt-0.5">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-forest font-medium truncate">{acc.name}</span>
              <span className="text-stone-light">({acc.propertyType})</span>
              {acc.websiteUrl && (
                <a
                  href={acc.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackOutboundClick({
                      source: "ai_plan",
                      target: acc.websiteUrl!,
                      label: acc.name,
                      meta: { slug: acc.slug, day: stop.day, village: stop.village },
                    })
                  }
                  className="text-[11px] font-semibold text-forest hover:underline whitespace-nowrap"
                >
                  Book direct ↗
                </a>
              )}
            </div>
            {notDogFriendly && (
              <p className="text-[11px] text-amber-warm mt-0.5">
                Best match — not flagged as dog-friendly. Confirm with the host before booking.
              </p>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-amber-warm mt-0.5">No stay picked yet</div>
        )}
      </div>
    </li>
  );
}

function RationalePanel({
  narration,
  loading,
  rationale,
}: {
  narration: string;
  loading: boolean;
  rationale: PlanRationale;
}) {
  return (
    <div className="bg-white rounded-[20px] p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone mb-2">Why this plan</div>
      {narration && (
        <div className="text-[14px] leading-relaxed text-ink whitespace-pre-wrap">{narration}</div>
      )}
      {loading && (
        <div className="mt-2 text-[12px] text-stone-light flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-forest-light animate-pulse" />
          writing…
        </div>
      )}
      {!loading && !narration && (
        <div className="text-[12px] text-stone-light">No narration available.</div>
      )}
      {rationale.unmet.length > 0 && (
        <details className="mt-3 text-[12px] text-stone">
          <summary className="cursor-pointer text-amber-warm">
            {rationale.unmet.length} unmet constraint{rationale.unmet.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            {rationale.unmet.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
