"use client";

import { useState } from "react";
import LoopMap from "@/components/LoopMap";
import RouteStartPicker, { type Place } from "@/components/RouteStartPicker";

/**
 * /walks — production-facing route generator.
 *
 * Pick a start (postcode or village in the Cotswolds), a theme, and a
 * distance; the engine returns a circular walk with an AI narrative.
 *
 * /walks/preview remains as a dev fixture with a hardcoded Stow start; this
 * page replaces the hidden preview as the user-visible entry point.
 */

type Theme = "ridge" | "valley" | "woodland";

interface MidpointPoi {
  id: number;
  name: string;
  type: string;
  lng: number;
  lat: number;
  scenicScore: number;
  terrainClass: string | null;
  isLunchStop: boolean;
}

interface RouteResponse {
  cacheKey: string;
  cached: boolean;
  geometry: GeoJSON.LineString;
  actualKm: number;
  ascentM: number;
  durationMin: number;
  midpointPoi: MidpointPoi;
  score: number;
  narrative: string | null;
}

interface ApiError {
  error: string;
  message?: string;
}

const THEMES: { value: Theme; label: string; hint: string }[] = [
  { value: "ridge", label: "Ridge", hint: "High ground and panoramic views" },
  { value: "valley", label: "Valley", hint: "Farmland, watercourses, villages" },
  { value: "woodland", label: "Woodland", hint: "Tracks under tree cover" },
];

const DISTANCES = [
  { value: 8, label: "8 km", subtitle: "~5 mi — short loop" },
  { value: 12, label: "12 km", subtitle: "~7.5 mi — half day" },
  { value: 16, label: "16 km", subtitle: "~10 mi — full day" },
  { value: 20, label: "20 km", subtitle: "~12.5 mi — long day" },
];

export default function WalksPage() {
  const [start, setStart] = useState<Place | null>(null);
  const [theme, setTheme] = useState<Theme>("ridge");
  const [km, setKm] = useState(12);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [error, setError] = useState<{ kind: string; message: string } | null>(null);

  async function generate() {
    if (!start) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/routes/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: start.lat,
          lng: start.lng,
          km,
          theme,
          startLabel: start.label,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        setError({
          kind: body.error ?? "request_failed",
          message: body.message ?? `Request failed (${res.status})`,
        });
        return;
      }
      const data = (await res.json()) as RouteResponse;
      setResult(data);
    } catch (err) {
      setError({
        kind: "network",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  const canGenerate = start !== null && !loading;

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant/30 px-6 py-5">
        <h1 className="font-serif text-2xl text-primary">Walks in the Cotswolds</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Pick a postcode or village, choose a theme and distance, and we&rsquo;ll generate a
          circular walk with a real lunch stop and an AI-written narrative.
        </p>
      </header>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_24rem]">
        {/* Map column */}
        <div className="flex h-[36rem] flex-col overflow-hidden rounded-lg bg-surface-container-low shadow-sm lg:h-[44rem]">
          {result && start ? (
            <LoopMap
              geometry={result.geometry}
              start={{ lng: start.lng, lat: start.lat }}
              midpoint={{
                lng: result.midpointPoi.lng,
                lat: result.midpointPoi.lat,
                name: result.midpointPoi.name,
                type: result.midpointPoi.type,
              }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <div className="font-serif text-lg text-primary">Your map starts here</div>
              <p className="mt-2 max-w-sm text-sm text-on-surface-variant">
                {start
                  ? "Pick a theme and distance, then hit Generate loop."
                  : "Start by picking a postcode or village in the Cotswolds."}
              </p>
            </div>
          )}
        </div>

        {/* Controls column */}
        <aside className="flex flex-col gap-4">
          <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
            <h2 className="font-serif text-lg text-primary">Start</h2>
            <div className="mt-3">
              <RouteStartPicker value={start} onChange={setStart} />
              {start && (
                <p className="mt-2 text-xs text-on-surface-variant">
                  {start.label}
                  {start.context ? ` — ${start.context}` : ""}
                  <span className="ml-2 font-mono">
                    ({start.lat.toFixed(4)}, {start.lng.toFixed(4)})
                  </span>
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
            <h2 className="font-serif text-lg text-primary">Walk</h2>
            <div className="mt-4 space-y-4">
              <fieldset>
                <legend className="block text-sm font-medium text-on-surface">Theme</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTheme(t.value)}
                      className={`rounded px-2 py-2 text-xs ${
                        theme === t.value
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                      }`}
                      title={t.hint}
                    >
                      <div className="font-medium">{t.label}</div>
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {THEMES.find((t) => t.value === theme)?.hint}
                </p>
              </fieldset>

              <label className="block text-sm">
                <span className="block font-medium text-on-surface">Distance</span>
                <select
                  value={km}
                  onChange={(e) => setKm(Number(e.target.value))}
                  className="mt-1 w-full rounded bg-surface-container-high px-3 py-2 text-sm"
                >
                  {DISTANCES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label} — {d.subtitle}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={generate}
                disabled={!canGenerate}
                className="w-full rounded bg-tertiary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-tertiary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Generating…" : "Generate loop"}
              </button>
              {!start && (
                <p className="text-center text-xs text-on-surface-variant">
                  Pick a start point above to enable
                </p>
              )}
            </div>
          </section>

          {error && <ErrorPanel error={error} />}

          {result && <ResultPanel result={result} />}

          {result?.narrative && <NarrativePanel narrative={result.narrative} />}
        </aside>
      </div>
    </main>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function ErrorPanel({ error }: { error: { kind: string; message: string } }) {
  // Human-readable headline by error kind. The server already returns a
  // helpful `message`; we just add a short heading for visual scanning.
  const heading = {
    outside_aonb: "That start is outside the Cotswolds",
    no_loop_found: "No loop fits those constraints",
    service_degraded: "Routing service unavailable",
    invalid: "Request didn't validate",
    internal_error: "Something went wrong",
  }[error.kind] ?? "Couldn't generate that walk";

  return (
    <section className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm">
      <div className="font-medium text-error">{heading}</div>
      <p className="mt-1 text-on-surface">{error.message}</p>
    </section>
  );
}

function ResultPanel({ result }: { result: RouteResponse }) {
  const hours = Math.floor(result.durationMin / 60);
  const mins = (result.durationMin % 60).toString().padStart(2, "0");
  return (
    <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-lg text-primary">Your walk</h2>
        {result.cached && (
          <span className="text-xs uppercase tracking-wide text-on-surface-variant">cached</span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-on-surface-variant">Distance</dt>
        <dd className="font-medium">{result.actualKm.toFixed(1)} km</dd>
        <dt className="text-on-surface-variant">Ascent</dt>
        <dd className="font-medium">{result.ascentM} m</dd>
        <dt className="text-on-surface-variant">Walking time</dt>
        <dd className="font-medium">
          {hours}h {mins}m
        </dd>
        <dt className="text-on-surface-variant">Midpoint</dt>
        <dd className="font-medium">{result.midpointPoi.name}</dd>
        <dt className="text-on-surface-variant">Score</dt>
        <dd className="font-medium">{result.score.toFixed(2)}</dd>
      </dl>
    </section>
  );
}

function NarrativePanel({ narrative }: { narrative: string }) {
  return (
    <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
      <h2 className="font-serif text-lg text-primary">About this walk</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-on-surface">
        {narrative.split(/\n\n+/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </section>
  );
}
