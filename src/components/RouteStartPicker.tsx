"use client";

import { useState, useEffect, useRef } from "react";
import { COTSWOLDS_BBOX_STRING } from "@/lib/aonb";

/**
 * RouteStartPicker — combobox for choosing a walk start point inside the
 * Cotswolds AONB. Accepts UK postcodes ("GL54 1AB"), villages
 * ("Stow-on-the-Wold"), and neighbourhoods.
 *
 * Direct Mapbox Geocoding API (no @mapbox/mapbox-gl-geocoder dependency).
 * Restricted to the AONB bbox + GB so search noise is minimal.
 *
 * The "value" held by the parent represents a CONFIRMED selection. Editing
 * the input clears the selection — same pattern as Google Maps autocomplete
 * and Algolia DocSearch, prevents the "I typed X but searched for Y" trap.
 */

export interface Place {
  label: string; // "Stow-on-the-Wold" or "GL54 1AB"
  context: string; // "Cotswold District, United Kingdom"
  lat: number;
  lng: number;
  type: string; // place | postcode | locality | neighborhood | address
}

interface Props {
  value: Place | null;
  onChange: (place: Place | null) => void;
  placeholder?: string;
  className?: string;
}

const DEBOUNCE_MS = 250;
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function RouteStartPicker({ value, onChange, placeholder, className }: Props) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [results, setResults] = useState<Place[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sync internal query when value is set/cleared externally (e.g., reset).
  // Keyed on coordinates so user-typing (value still null) doesn't trigger.
  useEffect(() => {
    setQuery(value?.label ?? "");
  }, [value?.lat, value?.lng, value?.label]);

  // Debounced geocoding.
  useEffect(() => {
    if (!query.trim() || query === value?.label) {
      setResults([]);
      setErrorMsg(null);
      return;
    }
    if (!TOKEN) {
      setErrorMsg("Search unavailable — Mapbox token missing");
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setErrorMsg(null);
      try {
        const places = await searchMapbox(query, ac.signal);
        setResults(places);
        setHighlighted(0);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setErrorMsg("Search failed — try again");
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, value?.label]);

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleInputChange(text: string) {
    setQuery(text);
    setOpen(true);
    // Invalidate prior selection if user edits the input — prevents the
    // confused state where the input shows X but the held value is Y.
    if (value && text !== value.label) {
      onChange(null);
    }
  }

  function select(p: Place) {
    setQuery(p.label);
    onChange(p);
    setOpen(false);
    setResults([]);
  }

  function clear() {
    setQuery("");
    onChange(null);
    setResults([]);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) {
      if (e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[highlighted]) select(results[highlighted]);
    }
  }

  const showDropdown = open && (loading || errorMsg !== null || results.length > 0 || (query.trim().length > 0 && !loading));

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? "Postcode, village, or place name"}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="route-start-listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && results[highlighted] ? `route-start-option-${highlighted}` : undefined
          }
          className="w-full rounded bg-surface-container-high px-3 py-2 pr-8 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-tertiary/30"
        />
        {(query || value) && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            aria-label="Clear start point"
            tabIndex={-1}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <ul
          id="route-start-listbox"
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded bg-surface-container-lowest shadow-lg"
        >
          {loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-on-surface-variant">Searching…</li>
          )}
          {errorMsg && !loading && (
            <li className="px-3 py-2 text-sm text-error">{errorMsg}</li>
          )}
          {!loading && !errorMsg && results.length === 0 && query.trim() && (
            <li className="px-3 py-2 text-sm text-on-surface-variant">
              No matches in the Cotswolds — try a different postcode or place name.
            </li>
          )}
          {results.map((r, i) => (
            <li
              key={`${r.lat},${r.lng},${r.label}`}
              id={`route-start-option-${i}`}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={(e) => {
                // Prevent input blur before click registers.
                e.preventDefault();
                select(r);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlighted ? "bg-tertiary/10" : ""
              }`}
            >
              <div className="font-medium text-on-surface">{r.label}</div>
              {r.context && (
                <div className="text-xs text-on-surface-variant">{r.context}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Mapbox Geocoding API ───────────────────────────────────────────────────

interface MapboxFeature {
  text: string;
  place_name: string;
  place_type: string[];
  center: [number, number];
  context?: { id: string; text: string }[];
}

async function searchMapbox(query: string, signal: AbortSignal): Promise<Place[]> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${TOKEN}` +
    `&bbox=${COTSWOLDS_BBOX_STRING}` +
    `&country=gb` +
    `&types=place,postcode,locality,neighborhood,address` +
    `&limit=6` +
    `&language=en`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`geocoder ${res.status}`);

  const data = (await res.json()) as { features?: MapboxFeature[] };
  return (data.features ?? []).map((f) => {
    const region = f.context?.find(
      (c) => c.id.startsWith("district") || c.id.startsWith("region"),
    );
    const country = f.context?.find((c) => c.id.startsWith("country"));
    const contextParts = [region?.text, country?.text].filter(Boolean);
    return {
      label: f.text,
      context: contextParts.join(", "),
      lat: f.center[1],
      lng: f.center[0],
      type: f.place_type?.[0] ?? "place",
    };
  });
}
