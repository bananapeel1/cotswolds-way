import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findCached } from "@/lib/route-engine";
import { slugToCacheKey } from "@/lib/share-slug";
import { encodePolyline } from "@/lib/encode-polyline";
import SharedWalkClient from "./SharedWalkClient";

/**
 * /walks/r/[slug] — stable permalink for a generated walk.
 *
 * Server component: reads the cached route and hands it to the client view.
 * Returns Next.js notFound() for any slug that doesn't decode to a cached
 * cache key, including slugs that look syntactically fine but were never
 * persisted.
 *
 * generateMetadata returns title + description (drawn from the narrative)
 * plus an Open Graph image URL pointing directly at Mapbox Static API —
 * no proxy endpoint needed because NEXT_PUBLIC_MAPBOX_TOKEN is already
 * client-side, and Mapbox edge-caches identical URLs.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SharedWalkPage({ params }: PageProps) {
  const { slug } = await params;
  const cacheKey = slugToCacheKey(slug);
  const route = await findCached(cacheKey);
  if (!route) notFound();
  return <SharedWalkClient route={route} slug={slug} />;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cacheKey = slugToCacheKey(slug);
  const route = await findCached(cacheKey);
  if (!route) {
    return { title: "Walk not found — Cotswolds Way" };
  }

  const km = route.actualKm.toFixed(1);
  const ascentM = route.ascentM;
  const hours = Math.floor(route.durationMin / 60);
  const minutes = (route.durationMin % 60).toString().padStart(2, "0");

  const title = `${km} km Cotswolds loop · ${ascentM} m ascent`;
  const description = route.narrative
    ? truncate(route.narrative.split(/\n\n+/)[0]!, 160)
    : `A ${km} km circular walk in the Cotswolds AONB. ${hours}h ${minutes} walking time, ${ascentM} m of ascent. Passes ${route.midpointPoi.name}.`;

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

/**
 * Build the Mapbox Static API URL for the OG image. Returns null when the
 * Mapbox token isn't set, so generateMetadata can omit images cleanly.
 */
function buildMapboxStaticUrl(coords: [number, number][]): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  // GeoJSON [lng, lat] → Google [lat, lng] (encodePolyline's convention).
  const latLngs: [number, number][] = coords.map(([lng, lat]) => [lat, lng]);

  // Reduce point count for URL-length safety. Mapbox accepts long URLs but
  // some chat platforms truncate around ~2000 chars when unfurling. 200
  // samples produces a visually faithful polyline well under 1500 chars.
  const reduced = subsample(latLngs, 200);
  const polyline = encodePolyline(reduced);

  // path-5+541600-1.0 = 5px-wide brand-orange path at full opacity.
  // auto = Mapbox computes the bbox from the path geometry itself.
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
  // Always include the last point so the loop visually closes.
  out.push(arr[arr.length - 1]);
  return out;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
