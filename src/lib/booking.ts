/**
 * Server-only Booking.com Demand API client.
 *
 * IMPORTANT: Import this module only in server contexts (Route Handlers,
 * Server Components, Server Actions). It must never be bundled for the client.
 *
 * Caching rules (per Booking.com terms):
 *  - Details (photos, description, amenities): cached 24 hours
 *  - Reviews: cached 24 hours
 *  - Availability & pricing: NEVER cached
 */

import type {
  BookingDetails,
  BookingPhoto,
  BookingAvailability,
  BookingRoom,
  BookingReview,
  BookingReviewsResponse,
} from "./booking-types";

// ─── Configuration ──────────────────────────────────────────────────────────

const API_BASE =
  process.env.BOOKING_API_BASE_URL || "https://demandapi.booking.com/3.1";
const API_TOKEN = process.env.BOOKING_API_TOKEN || "";
const AFFILIATE_ID = process.env.BOOKING_AFFILIATE_ID || "";

// ─── Rate limiter (50 RPM for sandbox) ──────────────────────────────────────

const RATE_LIMIT = 50;
const RATE_WINDOW_MS = 60_000;

let requestCount = 0;
let windowStart = Date.now();

function canMakeRequest(): boolean {
  const now = Date.now();
  if (now - windowStart > RATE_WINDOW_MS) {
    requestCount = 0;
    windowStart = now;
  }
  if (requestCount >= RATE_LIMIT) return false;
  requestCount++;
  return true;
}

// ─── In-memory cache ────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const detailsCache = new Map<string, CacheEntry<BookingDetails>>();
const reviewsCache = new Map<string, CacheEntry<BookingReviewsResponse>>();

function getCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  data: T
): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── Shared fetch helper ────────────────────────────────────────────────────

async function bookingFetch(
  path: string,
  params: Record<string, string>
): Promise<unknown | null> {
  if (!API_TOKEN || !AFFILIATE_ID) {
    console.warn("[booking] Missing API credentials — skipping request");
    return null;
  }

  if (!canMakeRequest()) {
    console.warn("[booking] Rate limit reached — skipping request");
    return null;
  }

  const url = new URL(path, API_BASE);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "X-Affiliate-Id": AFFILIATE_ID,
        Accept: "application/json",
      },
      // Prevent Next.js from caching this fetch at the framework level
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(
        `[booking] API error ${res.status} for ${path}:`,
        await res.text().catch(() => "")
      );
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(`[booking] Network error for ${path}:`, err);
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch static property details (photos, description, amenities).
 * Results are cached for 24 hours.
 */
export async function getBookingDetails(
  hotelId: string
): Promise<BookingDetails | null> {
  const cached = getCached(detailsCache, hotelId);
  if (cached) return cached;

  const raw = (await bookingFetch("/accommodations/details", {
    accommodation_ids: hotelId,
    extras: "description,photos,facilities",
  })) as Record<string, unknown> | null;

  if (!raw) return null;

  try {
    // The Demand API returns an array under `data` or directly as an array
    const items = (raw.data ?? raw) as Record<string, unknown>[];
    const item = Array.isArray(items) ? items[0] : items;
    if (!item) return null;

    const details: BookingDetails = {
      hotelId,
      name: (item.name as string) || "",
      description: (item.description as string) || "",
      photos: Array.isArray(item.photos)
        ? (item.photos as Record<string, unknown>[]).map(
            (p): BookingPhoto => ({
              url: (p.url_original ?? p.url_max ?? p.url) as string,
              caption: p.caption as string | undefined,
              tag: p.tag as string | undefined,
            })
          )
        : [],
      amenities: Array.isArray(item.facilities)
        ? (item.facilities as Record<string, unknown>[]).map(
            (f) => (f.name as string) || ""
          )
        : [],
      starRating: (item.star_rating as number) || 0,
      reviewScore: (item.review_score as number) || 0,
      reviewCount: (item.number_of_reviews as number) || 0,
      coordinates: {
        latitude: (item.latitude as number) || 0,
        longitude: (item.longitude as number) || 0,
      },
    };

    setCache(detailsCache, hotelId, details);
    return details;
  } catch (err) {
    console.error("[booking] Failed to parse details response:", err);
    return null;
  }
}

/**
 * Fetch live availability and pricing for specific dates.
 * NEVER cached — Booking.com terms prohibit caching availability/pricing.
 */
export async function getBookingAvailability(
  hotelId: string,
  checkIn: string,
  checkOut: string,
  guests: number
): Promise<BookingAvailability | null> {
  const raw = (await bookingFetch("/accommodations/availability", {
    accommodation_ids: hotelId,
    checkin: checkIn,
    checkout: checkOut,
    guest_qty: String(guests),
    currency: "GBP",
  })) as Record<string, unknown> | null;

  if (!raw) return null;

  try {
    const items = (raw.data ?? raw) as Record<string, unknown>[];
    const item = Array.isArray(items) ? items[0] : items;
    if (!item) return { available: false, rooms: [], cheapestPricePerNight: null, currency: "GBP" };

    const products = (item.products ?? item.rooms ?? []) as Record<
      string,
      unknown
    >[];

    const rooms: BookingRoom[] = products.map((p) => {
      const pricing = (p.pricing ?? p.price ?? {}) as Record<string, unknown>;
      const totalRaw = Number(pricing.total ?? pricing.book ?? 0);
      // Booking.com returns prices in the currency's standard unit (pounds)
      // Convert to pence to match our internal format
      const totalPence = Math.round(totalRaw * 100);

      // Calculate nights to derive per-night price
      const nights = Math.max(
        1,
        Math.round(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );

      return {
        roomId: String(p.id ?? p.room_id ?? ""),
        name: (p.name ?? p.room_name ?? "Room") as string,
        pricePerNight: Math.round(totalPence / nights),
        totalPrice: totalPence,
        maxOccupancy: Number(p.max_occupancy ?? p.max_persons ?? guests),
        cancellationPolicy: (p.cancellation_type ??
          p.cancellation_policy ??
          "See property for details") as string,
      };
    });

    const cheapest = rooms.length
      ? Math.min(...rooms.map((r) => r.pricePerNight))
      : null;

    return {
      available: rooms.length > 0,
      rooms,
      cheapestPricePerNight: cheapest,
      currency: (raw.currency as string) || "GBP",
    };
  } catch (err) {
    console.error("[booking] Failed to parse availability response:", err);
    return null;
  }
}

/**
 * Fetch guest reviews for a property.
 * Results are cached for 24 hours.
 */
export async function getBookingReviews(
  hotelId: string,
  page: number = 1
): Promise<BookingReviewsResponse | null> {
  const cacheKey = `${hotelId}:${page}`;
  const cached = getCached(reviewsCache, cacheKey);
  if (cached) return cached;

  const raw = (await bookingFetch("/accommodations/reviews", {
    accommodation_id: hotelId,
    page: String(page),
    page_size: "10",
    sort: "recent",
  })) as Record<string, unknown> | null;

  if (!raw) return null;

  try {
    const rawReviews = (raw.data ?? raw.reviews ?? []) as Record<
      string,
      unknown
    >[];

    const reviews: BookingReview[] = rawReviews.map((r) => ({
      id: String(r.id ?? r.review_id ?? ""),
      author: (r.author ?? r.reviewer_name ?? "Guest") as string,
      authorCountry: (r.author_country ?? r.country ?? "") as string,
      date: (r.created ?? r.date ?? "") as string,
      score: Number(r.review_score ?? r.score ?? 0),
      title: (r.headline ?? r.title ?? "") as string,
      positiveText: (r.pros ?? r.positive ?? "") as string,
      negativeText: (r.cons ?? r.negative ?? "") as string,
      travellerType: (r.traveller_type ?? r.reviewer_type ?? "") as string,
    }));

    const response: BookingReviewsResponse = {
      reviews,
      averageScore: Number(raw.average_score ?? raw.review_score ?? 0),
      totalCount: Number(raw.total_count ?? raw.count ?? reviews.length),
      page,
      totalPages: Number(
        raw.total_pages ?? Math.ceil(Number(raw.total_count ?? reviews.length) / 10)
      ),
    };

    setCache(reviewsCache, cacheKey, response);
    return response;
  } catch (err) {
    console.error("[booking] Failed to parse reviews response:", err);
    return null;
  }
}
