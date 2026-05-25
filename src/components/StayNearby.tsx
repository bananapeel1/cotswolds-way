import Link from "next/link";
import { getAdminClient } from "@/lib/supabase-admin";

interface NearbyProperty {
  slug: string;
  name: string;
  village: string;
  property_type: string;
  price_per_night: number;
  rating: number;
  review_count: number;
  image_url: string;
  distance_m: number;
}

interface Props {
  lat: number;
  lng: number;
  radiusM?: number;
}

/** Distance in km, rounded to one decimal place. */
function kmLabel(m: number): string {
  return `${(m / 1000).toFixed(1)} km`;
}

/** Readable property-type label. */
function typeLabel(t: string): string {
  const map: Record<string, string> = {
    hotel: "Hotel",
    bb: "B&B",
    hostel: "Hostel",
    glamping: "Glamping",
    campsite: "Campsite",
    selfcatering: "Self-catering",
  };
  return map[t] ?? t;
}

/**
 * Server component. Queries `get_nearby_properties` via Supabase RPC and
 * renders a grid of property cards linking to /property/[slug].
 *
 * Rendered on /walks/[slug] SEO pages — zero client-side JS.
 */
export default async function StayNearby({ lat, lng, radiusM = 10_000 }: Props) {
  const sb = getAdminClient();
  const { data, error } = await sb.rpc("get_nearby_properties", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
  });

  if (error) {
    console.warn("[StayNearby] query failed:", error.message);
  }

  const places = (data as NearbyProperty[] | null) ?? [];
  if (places.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="font-serif text-xl text-primary mb-1">Stay nearby</h2>
      <p className="text-sm text-on-surface-variant mb-5">
        Verified accommodation within {kmLabel(radiusM)} of this walk
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {places.map((p) => (
          <Link
            key={p.slug}
            href={`/property/${p.slug}`}
            className="group block rounded-2xl overflow-hidden bg-surface-container-low hover:shadow-md transition-shadow"
          >
            {/* Image */}
            <div className="aspect-[4/3] overflow-hidden bg-surface-container">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                  <span className="material-symbols-outlined text-5xl">hotel</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="text-xs text-secondary mb-1">
                {typeLabel(p.property_type)} · {p.village} · {kmLabel(p.distance_m)}
              </p>
              <h3 className="font-medium text-on-surface text-sm leading-snug mb-2 line-clamp-2">
                {p.name}
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm text-secondary">star</span>
                  <span>{p.rating?.toFixed(1)}</span>
                  <span className="text-on-surface-variant/50">({p.review_count})</span>
                </div>
                {p.price_per_night > 0 && (
                  <p className="text-xs font-medium text-on-surface">
                    from £{(p.price_per_night / 100).toFixed(0)}/night
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/search"
          className="text-sm text-secondary hover:text-primary transition-colors"
        >
          See all Cotswolds accommodation →
        </Link>
      </div>
    </section>
  );
}
