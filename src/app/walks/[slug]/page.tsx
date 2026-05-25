import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import LoopMap from "@/components/LoopMap";
import StayNearby from "@/components/StayNearby";
import { findBySlug } from "@/lib/route-engine";
import { encodePolyline } from "@/lib/encode-polyline";
import { cacheKeyToSlug } from "@/lib/share-slug";

/**
 * /walks/[slug] — pre-seeded SEO landing pages.
 *
 * Each page corresponds to a generated walk for a specific Cotswolds village,
 * theme, and distance (e.g. /walks/stow-on-the-wold-ridge-walk-12km).
 *
 * Server component: all data fetched at request time (ISR possible once Supabase
 * revalidate tags land). Generates structured metadata + Schema.org HikingTrail
 * JSON-LD for search-engine discoverability.
 *
 * Conversion path: "Stay nearby" section links to /property/[slug] pages,
 * closing the loop from day-walk discovery to accommodation booking.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SeoWalkPage({ params }: PageProps) {
  const { slug } = await params;
  const route = await findBySlug(slug);
  if (!route) notFound();

  const hours = Math.floor(route.durationMin / 60);
  const minutes = (route.durationMin % 60).toString().padStart(2, "0");
  const start = route.geometry.coordinates[0] as [number, number];
  const shareSlug = cacheKeyToSlug(route.cacheKey);

  // Schema.org HikingTrail structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ExerciseAction",
    name: pageTitle(route.actualKm, route.midpointPoi.name, route.theme),
    description: route.narrative
      ? truncate(route.narrative.split(/\n\n+/)[0]!, 300)
      : undefined,
    exerciseType: "Hiking",
    distance: {
      "@type": "QuantitativeValue",
      value: route.actualKm.toFixed(1),
      unitCode: "KMT",
    },
    provider: {
      "@type": "Organization",
      name: "The Cotswolds Way",
      url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://thecotswoldsway.com",
    },
  };

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-surface">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <header className="border-b border-outline-variant/30 px-6 py-5">
          <nav className="text-xs text-on-surface-variant">
            <Link href="/walks" className="hover:text-on-surface">
              Walking routes
            </Link>
            {" › "}
            <span className="text-on-surface capitalize">{route.theme} walk</span>
          </nav>
          <h1 className="mt-2 font-serif text-3xl text-primary leading-tight">
            {pageTitle(route.actualKm, route.midpointPoi.name, route.theme)}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Cotswolds AONB · circular walking route
          </p>
        </header>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
          {/* ─── Map ──────────────────────────────────────────────────── */}
          <section className="rounded-3xl overflow-hidden shadow-sm" style={{ height: 420 }}>
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
          </section>

          {/* ─── Stats row ────────────────────────────────────────────── */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: "straighten", label: "Distance", value: `${route.actualKm.toFixed(1)} km` },
              { icon: "schedule",   label: "Duration",  value: `${hours}h ${minutes}` },
              { icon: "trending_up", label: "Ascent",   value: `${route.ascentM} m` },
              { icon: "landscape",  label: "Theme",     value: capitalize(route.theme) },
            ].map(({ icon, label, value }) => (
              <div
                key={label}
                className="bg-surface-container-low rounded-2xl p-4 text-center"
              >
                <span className="material-symbols-outlined text-secondary text-2xl mb-1 block">
                  {icon}
                </span>
                <p className="text-xs text-on-surface-variant mb-0.5">{label}</p>
                <p className="font-medium text-on-surface text-sm">{value}</p>
              </div>
            ))}
          </section>

          {/* ─── Narrative ────────────────────────────────────────────── */}
          {route.narrative && (
            <section>
              <h2 className="font-serif text-xl text-primary mb-4">About this walk</h2>
              <div className="prose prose-sm max-w-none text-on-surface/80 space-y-4">
                {route.narrative.split(/\n\n+/).map((para, i) => (
                  <p key={i}>{para.trim()}</p>
                ))}
              </div>
            </section>
          )}

          {/* ─── Midpoint POI ─────────────────────────────────────────── */}
          {route.midpointPoi.isLunchStop && (
            <section className="bg-surface-container-low rounded-2xl p-5">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-secondary text-2xl mt-0.5">
                  restaurant
                </span>
                <div>
                  <h3 className="font-medium text-on-surface">
                    Lunch stop: {route.midpointPoi.name}
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    Recommended midpoint stop — {capitalize(route.midpointPoi.type ?? "pub")}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ─── Download & share ─────────────────────────────────────── */}
          <section className="flex flex-wrap gap-3">
            <a
              href={`/api/routes/${shareSlug}/gpx`}
              download
              className="inline-flex items-center gap-2 rounded-full bg-surface-container px-5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Download GPX
            </a>
            <Link
              href={`/walks/r/${shareSlug}`}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/50 px-5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-base">link</span>
              Share this walk
            </Link>
            <Link
              href="/walks"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/50 px-5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-base">explore</span>
              Generate your own
            </Link>
          </section>

          {/* ─── Stay nearby ──────────────────────────────────────────── */}
          <StayNearby lat={route.startLat} lng={route.startLng} />
        </div>
      </main>
    </>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = await findBySlug(slug);
  if (!route) {
    return { title: "Walk not found — Cotswolds Way" };
  }

  const title = pageTitle(route.actualKm, route.midpointPoi.name, route.theme);
  const description = route.narrative
    ? truncate(route.narrative.split(/\n\n+/)[0]!, 160)
    : `A ${route.actualKm.toFixed(1)} km circular walk in the Cotswolds AONB, passing ${route.midpointPoi.name}. ${route.ascentM} m of ascent.`;

  const ogImage = buildMapboxStaticUrl(route.geometry.coordinates as [number, number][]);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pageTitle(km: number, poiName: string, theme: string): string {
  return `${km.toFixed(1)} km ${theme} walk via ${poiName} · Cotswolds AONB`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function buildMapboxStaticUrl(coords: [number, number][]): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const latLngs: [number, number][] = coords.map(([lng, lat]) => [lat, lng]);
  const reduced = subsample(latLngs, 200);
  const polyline = encodePolyline(reduced);
  const overlay = `path-5+541600-1.0(${encodeURIComponent(polyline)})`;
  return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${overlay}/auto/1200x630@2x?access_token=${token}`;
}

function subsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / (maxPoints - 1);
  const out: T[] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    out.push(arr[Math.floor(i * step)]);
  }
  out.push(arr[arr.length - 1]);
  return out;
}

