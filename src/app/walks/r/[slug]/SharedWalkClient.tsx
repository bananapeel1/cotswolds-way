"use client";

import { useState } from "react";
import Link from "next/link";
import LoopMap from "@/components/LoopMap";
import type { LoopResult } from "@/lib/route-engine";

interface Props {
  route: LoopResult;
  slug: string;
}

/**
 * Read-only view of a shared walk. Renders the same map + result + narrative
 * as /walks but without any form controls — the route is fixed by the URL.
 *
 * Includes the GPX download anchor and a clipboard copy button matching the
 * UX in src/components/MyTripSummary.tsx (navigator.clipboard.writeText +
 * 2-second visual feedback).
 */
export default function SharedWalkClient({ route, slug }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      const url = `${window.location.origin}/walks/r/${slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers / non-secure contexts — silently no-op. The URL is
      // already in the address bar, so the user can copy manually.
    }
  }

  const hours = Math.floor(route.durationMin / 60);
  const minutes = (route.durationMin % 60).toString().padStart(2, "0");
  const start = route.geometry.coordinates[0] as [number, number];

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant/30 px-6 py-5">
        <Link
          href="/walks"
          className="text-xs text-on-surface-variant hover:text-on-surface"
        >
          ← Generate your own walk
        </Link>
        <h1 className="mt-1 font-serif text-2xl text-primary">
          {route.actualKm.toFixed(1)} km loop in the Cotswolds
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {route.ascentM} m ascent · {hours}h {minutes}m walking time · via {route.midpointPoi.name}
        </p>
      </header>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_24rem]">
        {/* Map */}
        <div className="flex h-[36rem] flex-col overflow-hidden rounded-lg bg-surface-container-low shadow-sm lg:h-[44rem]">
          <LoopMap
            geometry={route.geometry}
            start={{ lng: start[0], lat: start[1] }}
            midpoint={{
              lng: route.midpointPoi.lng,
              lat: route.midpointPoi.lat,
              name: route.midpointPoi.name,
              type: route.midpointPoi.type,
            }}
          />
        </div>

        {/* Side panel */}
        <aside className="flex flex-col gap-4">
          <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
            <h2 className="font-serif text-lg text-primary">This walk</h2>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-on-surface-variant">Distance</dt>
              <dd className="font-medium">{route.actualKm.toFixed(1)} km</dd>
              <dt className="text-on-surface-variant">Ascent</dt>
              <dd className="font-medium">{route.ascentM} m</dd>
              <dt className="text-on-surface-variant">Walking time</dt>
              <dd className="font-medium">
                {hours}h {minutes}m
              </dd>
              <dt className="text-on-surface-variant">Midpoint</dt>
              <dd className="font-medium">{route.midpointPoi.name}</dd>
            </dl>
          </section>

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

          {route.narrative && (
            <section className="rounded-lg bg-surface-container-low p-5 shadow-sm">
              <h2 className="font-serif text-lg text-primary">About this walk</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-on-surface">
                {route.narrative.split(/\n\n+/).map((para, i) => (
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
