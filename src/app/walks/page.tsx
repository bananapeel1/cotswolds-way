"use client";

import { useEffect, useMemo, useState } from "react";
import WalkPlannerMap from "@/components/WalkPlannerMap";
import RouteStartPicker, { type Place } from "@/components/RouteStartPicker";
import { cacheKeyToSlug } from "@/lib/share-slug";

/**
 * /walks — the walk designer.
 *
 * A direct-manipulation canvas rather than a form of option-blocks: drop a pin
 * on the map for your start, drag a slider for distance (or switch to "time"
 * and say how long you want to be out), and tune difficulty / pace / lunch with
 * sliders. A free-text box is the express lane — it pre-fills everything. The
 * generated loop draws on the same map.
 *
 * Every walk is bespoke (exact start + exact distance, `exact: true`), so the
 * continuous sliders matter — nothing is snapped to buckets.
 */

type Theme = "ridge" | "valley" | "woodland" | "mixed";
type Difficulty = "easy" | "moderate" | "strenuous";
type Pace = "leisurely" | "steady" | "brisk";
type LunchStop = "required" | "preferred" | "none";

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

const THEMES: { value: Theme; label: string }[] = [
  { value: "mixed", label: "Surprise me" },
  { value: "ridge", label: "Ridge & views" },
  { value: "valley", label: "Valley & water" },
  { value: "woodland", label: "Woodland" },
];

const DIFFICULTY_VALUES: Difficulty[] = ["easy", "moderate", "strenuous"];
const DIFFICULTY_LABELS = ["Easy — low ascent", "Moderate", "Strenuous — big climbs"];

const PACE_VALUES: Pace[] = ["leisurely", "steady", "brisk"];
const PACE_LABELS = ["Leisurely — stops for tea", "Steady", "Brisk — keep moving"];

const LUNCH_VALUES: LunchStop[] = ["none", "preferred", "required"];
const LUNCH_LABELS = ["Skip it", "Happy to", "Must have a pub"];

/** Rough walking speed (km/h) per pace — used to convert a time budget into a
 *  distance, and to estimate walking time for a distance. */
const PACE_SPEED: Record<Pace, number> = { leisurely: 3.6, steady: 4.3, brisk: 5.0 };

const KM_MIN = 3;
const KM_MAX = 25;
const HOURS_MIN = 0.5;
const HOURS_MAX = 7;

const PREFS_KEY = "walksPreferences";

interface PersistedPrefs {
  theme?: Theme;
  km?: number;
  hours?: number;
  lengthMode?: "distance" | "time";
  difficulty?: Difficulty;
  pace?: Pace;
  lunchStop?: LunchStop;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const milesOf = (km: number) => km * 0.621371;

function fmtTime(hoursDecimal: number): string {
  const totalMin = Math.max(0, Math.round(hoursDecimal * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h === 0 ? `${m}m` : `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** Reverse-geocode a dropped pin to a friendly "near X" label (client-side; the
 *  Mapbox token is public). Falls back to a neutral label on any failure. */
async function reverseGeocode(lng: number, lat: number): Promise<{ label: string; context: string }> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const fallback = { label: "Dropped pin", context: "" };
  if (!token) return fallback;
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?access_token=${token}&types=place,locality,neighborhood&limit=1&language=en`;
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = (await res.json()) as { features?: { text?: string; place_name?: string }[] };
    const f = data.features?.[0];
    if (!f?.text) return fallback;
    return { label: `near ${f.text}`, context: f.place_name ?? "" };
  } catch {
    return fallback;
  }
}

export default function WalksPage() {
  const [start, setStart] = useState<Place | null>(null);
  const [theme, setTheme] = useState<Theme>("mixed");
  const [lengthMode, setLengthMode] = useState<"distance" | "time">("distance");
  const [km, setKm] = useState(12);
  const [hours, setHours] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>("moderate");
  const [pace, setPace] = useState<Pace>("steady");
  const [lunchStop, setLunchStop] = useState<LunchStop>("preferred");
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [error, setError] = useState<{ kind: string; message: string } | null>(null);

  // Free-text intent front-door.
  const [description, setDescription] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [intentNotes, setIntentNotes] = useState<string[]>([]);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [emphasis, setEmphasis] = useState("");

  // The distance actually sent to the engine: in time mode it's derived from
  // the chosen hours and pace; in distance mode the slider sets it directly.
  const speed = PACE_SPEED[pace];
  const effectiveKm = useMemo(
    () =>
      lengthMode === "time"
        ? clamp(Math.round(hours * speed * 2) / 2, KM_MIN, KM_MAX)
        : km,
    [lengthMode, hours, speed, km],
  );

  // Restore prefs once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as PersistedPrefs;
      if (p.theme) setTheme(p.theme);
      if (typeof p.km === "number") setKm(clamp(p.km, KM_MIN, KM_MAX));
      if (typeof p.hours === "number") setHours(clamp(p.hours, HOURS_MIN, HOURS_MAX));
      if (p.lengthMode) setLengthMode(p.lengthMode);
      if (p.difficulty) setDifficulty(p.difficulty);
      if (p.pace) setPace(p.pace);
      if (p.lunchStop) setLunchStop(p.lunchStop);
    } catch {
      // ignore bad payload
    }
  }, []);

  // Persist on change.
  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          theme,
          km,
          hours,
          lengthMode,
          difficulty,
          pace,
          lunchStop,
        } satisfies PersistedPrefs),
      );
    } catch {
      // non-fatal
    }
  }, [theme, km, hours, lengthMode, difficulty, pace, lunchStop]);

  // Changing any input invalidates the drawn route, so the map returns to
  // design mode (reach circle) rather than showing a stale loop.
  useEffect(() => {
    setResult(null);
  }, [start?.lng, start?.lat, theme, effectiveKm, difficulty, pace, lunchStop]);

  async function handlePickStart(lng: number, lat: number) {
    setStart({ label: "Locating…", context: "", lat, lng, type: "pin" });
    const { label, context } = await reverseGeocode(lng, lat);
    // Only apply the label if the pin hasn't moved again in the meantime.
    setStart((cur) =>
      cur && cur.lat === lat && cur.lng === lng ? { ...cur, label, context } : cur,
    );
  }

  // Free-text description → extracted params → pre-filled controls.
  async function describeWalk() {
    const text = description.trim();
    if (!text) return;
    setExtracting(true);
    setIntentError(null);
    setIntentNotes([]);
    try {
      const res = await fetch("/api/ai/extract-walk-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        setIntentError(body.message ?? body.error ?? `Request failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as {
        intent: {
          theme: Theme;
          targetKm: number;
          difficulty: Difficulty;
          pace: Pace;
          lunchStop: LunchStop;
          emphasis: string;
          ambiguities: string[];
        };
        start: Place | null;
      };
      const { intent, start: resolvedStart } = data;
      setTheme(intent.theme);
      setLengthMode("distance");
      setKm(clamp(intent.targetKm, KM_MIN, KM_MAX));
      setDifficulty(intent.difficulty);
      setPace(intent.pace);
      setLunchStop(intent.lunchStop);
      setEmphasis(intent.emphasis);
      if (resolvedStart) setStart(resolvedStart);
      setIntentNotes(intent.ambiguities);
    } catch (err) {
      setIntentError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }

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
          km: effectiveKm,
          theme,
          difficulty,
          pace,
          lunchStop,
          startLabel: start.label,
          emphasis,
          exact: true,
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
      setError({ kind: "network", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }

  const canGenerate = start !== null && !loading;

  // Memoised so the map's effects key on stable object identity (they only
  // change when the underlying coords / result actually change).
  const mapStart = useMemo(
    () => (start ? { lng: start.lng, lat: start.lat } : null),
    [start?.lng, start?.lat],
  );
  const routeOverlay = useMemo(
    () =>
      result
        ? {
            geometry: result.geometry,
            midpoint: {
              lng: result.midpointPoi.lng,
              lat: result.midpointPoi.lat,
              name: result.midpointPoi.name,
              type: result.midpointPoi.type,
            },
          }
        : null,
    [result],
  );

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant/30 px-6 py-5">
        <h1 className="font-serif text-2xl text-primary">Design your walk</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Drop a pin where you want to start, set how far (or how long) you want to go, and
          we&rsquo;ll build a circular walk made for you — with a lunch stop and an AI-written
          guide.
        </p>
      </header>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_24rem]">
        {/* Map canvas — interactive before generation, route after */}
        <div className="h-[28rem] overflow-hidden rounded-lg bg-surface-container-low shadow-sm lg:h-[44rem]">
          <WalkPlannerMap
            start={mapStart}
            onPickStart={handlePickStart}
            reachKm={effectiveKm * 0.2}
            route={routeOverlay}
          />
        </div>

        {/* Controls */}
        <aside className="flex flex-col gap-4">
          {/* Express lane: free-text */}
          <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
            <h2 className="font-serif text-lg text-primary">Describe it</h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              In plain English — we&rsquo;ll set everything below for you to tweak.
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. an easy 3-hour walk near Painswick with a good pub for lunch"
              rows={2}
              className="mt-3 w-full resize-none rounded bg-surface-container-high px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/70"
            />
            <button
              type="button"
              onClick={describeWalk}
              disabled={!description.trim() || extracting}
              className="mt-2 w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {extracting ? "Reading…" : "Use this"}
            </button>
            {intentError && <p className="mt-2 text-xs text-error">{intentError}</p>}
            {intentNotes.length > 0 && (
              <div className="mt-3 rounded bg-surface-container-high p-3 text-xs">
                <div className="font-medium text-on-surface">We assumed a few things:</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-on-surface-variant">
                  {intentNotes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Start */}
          <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-lg text-primary">Start</h2>
              <button
                type="button"
                onClick={() => setShowSearch((v) => !v)}
                className="text-xs font-medium text-on-surface-variant hover:text-on-surface"
              >
                {showSearch ? "Hide search" : "Search by name"}
              </button>
            </div>
            {start ? (
              <p className="mt-2 text-sm text-on-surface">
                {start.label}
                <span className="ml-2 font-mono text-xs text-on-surface-variant">
                  ({start.lat.toFixed(4)}, {start.lng.toFixed(4)})
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-on-surface-variant">
                Tap the map to drop your start pin — or search by name.
              </p>
            )}
            {showSearch && (
              <div className="mt-3">
                <RouteStartPicker value={start} onChange={setStart} />
              </div>
            )}
          </section>

          {/* Length: distance / time toggle + slider */}
          <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg text-primary">Length</h2>
              <div className="flex rounded-full bg-surface-container-high p-0.5 text-xs">
                {(["distance", "time"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLengthMode(mode)}
                    className={`rounded-full px-3 py-1 font-medium capitalize ${
                      lengthMode === mode
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {lengthMode === "distance" ? (
              <div className="mt-4">
                <input
                  type="range"
                  min={KM_MIN}
                  max={KM_MAX}
                  step={0.5}
                  value={km}
                  onChange={(e) => setKm(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="mt-1 text-sm font-medium text-on-surface">
                  {km.toFixed(1)} km
                  <span className="ml-2 font-normal text-on-surface-variant">
                    {milesOf(km).toFixed(1)} mi · ~{fmtTime(km / speed)} walking
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <input
                  type="range"
                  min={HOURS_MIN}
                  max={HOURS_MAX}
                  step={0.25}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="mt-1 text-sm font-medium text-on-surface">
                  {fmtTime(hours)} out
                  <span className="ml-2 font-normal text-on-surface-variant">
                    ≈ {effectiveKm.toFixed(1)} km · {milesOf(effectiveKm).toFixed(1)} mi
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Theme */}
          <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
            <h2 className="font-serif text-lg text-primary">Character</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  className={`rounded px-3 py-2 text-xs font-medium ${
                    theme === t.value
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          {/* Difficulty / pace sliders + lunch */}
          <section className="space-y-5 rounded-lg bg-surface-container-low p-5 shadow-sm">
            <SliderEnum
              label="Effort"
              values={DIFFICULTY_VALUES}
              labels={DIFFICULTY_LABELS}
              value={difficulty}
              onChange={setDifficulty}
              ends={["Gentle", "Challenging"]}
            />
            <SliderEnum
              label="Pace"
              values={PACE_VALUES}
              labels={PACE_LABELS}
              value={pace}
              onChange={setPace}
              ends={["Leisurely", "Brisk"]}
            />
            <SliderEnum
              label="Lunch stop"
              values={LUNCH_VALUES}
              labels={LUNCH_LABELS}
              value={lunchStop}
              onChange={setLunchStop}
              ends={["Skip", "Must have"]}
            />
          </section>

          <button
            onClick={generate}
            disabled={!canGenerate}
            className="w-full rounded bg-tertiary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-tertiary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Building your walk…" : "Generate walk"}
          </button>
          {!start && (
            <p className="-mt-2 text-center text-xs text-on-surface-variant">
              Drop a start pin on the map to begin
            </p>
          )}

          {error && <ErrorPanel error={error} />}
          {result && <ResultPanel result={result} />}
          {result && <ShareActions cacheKey={result.cacheKey} />}
          {result?.narrative && <NarrativePanel narrative={result.narrative} />}
        </aside>
      </div>
    </main>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

/**
 * A discrete-stop slider over an enum. Renders like a slider (continuous feel)
 * but snaps to the engine's named tiers. Shows the current tier's label and
 * the two extremes beneath the track.
 */
function SliderEnum<T extends string>({
  label,
  values,
  labels,
  value,
  onChange,
  ends,
}: {
  label: string;
  values: T[];
  labels: string[];
  value: T;
  onChange: (v: T) => void;
  ends: [string, string];
}) {
  const idx = Math.max(0, values.indexOf(value));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-on-surface">{label}</span>
        <span className="text-xs text-on-surface-variant">{labels[idx]}</span>
      </div>
      <input
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={idx}
        onChange={(e) => onChange(values[Number(e.target.value)])}
        className="mt-2 w-full accent-primary"
      />
      <div className="mt-0.5 flex justify-between text-[10px] uppercase tracking-wide text-on-surface-variant">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    </div>
  );
}

function ErrorPanel({ error }: { error: { kind: string; message: string } }) {
  const heading =
    {
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
      </dl>
    </section>
  );
}

function ShareActions({ cacheKey }: { cacheKey: string }) {
  const [copied, setCopied] = useState(false);
  const slug = cacheKeyToSlug(cacheKey);

  async function copyLink() {
    try {
      const url = `${window.location.origin}/walks/r/${slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
      <h2 className="font-serif text-lg text-primary">Take it with you</h2>
      <div className="mt-3 flex flex-col gap-2">
        <a
          href={`/api/routes/${slug}/gpx`}
          download
          className="flex items-center justify-center rounded bg-tertiary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-tertiary/90"
        >
          Download GPX
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center justify-center rounded bg-surface-container-high px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-highest"
        >
          {copied ? "Link copied ✓" : "Copy share link"}
        </button>
      </div>
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
