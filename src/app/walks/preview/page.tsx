"use client";

import { useState } from "react";
import LoopMap from "@/components/LoopMap";

// Hardcoded for the dev preview. Stow-on-the-Wold market square.
const STOW = { lng: -1.7244, lat: 51.9314, label: "Stow-on-the-Wold" };

type Theme = "ridge" | "valley" | "woodland";

type OpeningStatus = "open" | "closed" | "unknown";

interface MidpointPoi {
  id: number;
  name: string;
  type: string;
  lng: number;
  lat: number;
  scenicScore: number;
  terrainClass: string | null;
  isLunchStop: boolean;
  viaPoi: boolean;
  openingHours: string | null;
  openingStatus: OpeningStatus;
}

interface RouteResponse {
  cacheKey: string;
  cached: boolean;
  // The server contract is LineString — see route-engine.ts findCached/run.
  // Keep the client type in lockstep so LoopMap doesn't need to branch.
  geometry: GeoJSON.LineString;
  actualKm: number;
  ascentM: number;
  durationMin: number;
  midpointPoi: MidpointPoi;
  score: number;
  narrative: string | null;
}

interface GenerateResponse {
  candidates: RouteResponse[];
}

export default function WalksPreviewPage() {
  const [theme, setTheme] = useState<Theme>("ridge");
  const [km, setKm] = useState(12);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/routes/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: STOW.lat,
          lng: STOW.lng,
          km,
          theme,
          startLabel: STOW.label,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setError(body.message ?? body.error ?? `Request failed (${res.status})`);
        return;
      }
      // The API now returns up to 3 candidates; the dev preview only renders
      // the top-scoring one so it stays a simple smoke test of the engine.
      const data = (await res.json()) as GenerateResponse;
      setResult(data.candidates?.[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant/30 px-6 py-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-2xl text-primary">Walks preview</h1>
          <span className="rounded bg-tertiary/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-tertiary">
            dev only
          </span>
        </div>
        <p className="mt-1 text-sm text-on-surface-variant">
          Hardcoded start: {STOW.label} ({STOW.lat.toFixed(4)}, {STOW.lng.toFixed(4)}).
        </p>
      </header>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_24rem]">
        <div className="flex h-[36rem] flex-col overflow-hidden rounded-lg bg-surface-container-low shadow-sm lg:h-[44rem]">
          {result ? (
            <LoopMap
              geometry={result.geometry}
              start={{ lng: STOW.lng, lat: STOW.lat }}
              midpoint={{
                lng: result.midpointPoi.lng,
                lat: result.midpointPoi.lat,
                name: result.midpointPoi.name,
                type: result.midpointPoi.type,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
              Pick a theme and length, then Generate.
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
            <h2 className="font-serif text-lg text-primary">Parameters</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="block font-medium text-on-surface">Theme</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                  className="mt-1 w-full rounded bg-surface-container-high px-3 py-2 text-sm"
                >
                  <option value="ridge">Ridge — high ground and views</option>
                  <option value="valley">Valley — farmland and watercourses</option>
                  <option value="woodland">Woodland — tracks and shaded paths</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="block font-medium text-on-surface">Distance</span>
                <select
                  value={km}
                  onChange={(e) => setKm(Number(e.target.value))}
                  className="mt-1 w-full rounded bg-surface-container-high px-3 py-2 text-sm"
                >
                  <option value={8}>8 km (~5 mi) — short loop</option>
                  <option value={12}>12 km (~7.5 mi) — half day</option>
                  <option value={16}>16 km (~10 mi) — full day</option>
                  <option value={20}>20 km (~12.5 mi) — long day</option>
                </select>
              </label>

              <button
                onClick={generate}
                disabled={loading}
                className="w-full rounded bg-tertiary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-tertiary/90 disabled:opacity-60"
              >
                {loading ? "Generating…" : "Generate loop"}
              </button>
            </div>
          </section>

          {error && (
            <section className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
              {error}
            </section>
          )}

          {result && (
            <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-lg text-primary">Result</h2>
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
                  {Math.floor(result.durationMin / 60)}h {(result.durationMin % 60).toString().padStart(2, "0")}m
                </dd>
                <dt className="text-on-surface-variant">Score</dt>
                <dd className="font-medium">{result.score.toFixed(2)}</dd>
                <dt className="text-on-surface-variant">Midpoint</dt>
                <dd className="font-medium">{result.midpointPoi.name}</dd>
                <dt className="text-on-surface-variant">Midpoint type</dt>
                <dd className="font-medium">{result.midpointPoi.type}</dd>
              </dl>
            </section>
          )}

          {result?.narrative && (
            <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
              <h2 className="font-serif text-lg text-primary">Narrative</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-on-surface">
                {result.narrative.split(/\n\n+/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
