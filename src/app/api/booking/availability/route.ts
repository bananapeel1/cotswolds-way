import { getBookingAvailability } from "@/lib/booking";
import { getPropertyBySlug } from "@/lib/queries";
import bookingMapping from "@/data/booking-mapping.json";
import type { BookingMapping, AvailabilityResponse } from "@/lib/booking-types";

const mapping = bookingMapping as Record<string, BookingMapping>;

/**
 * GET /api/booking/availability?slug=...&checkIn=...&checkOut=...&guests=...
 *
 * Returns live pricing from Booking.com. NEVER cached.
 * Falls back to static price from curated data on any failure.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const guests = Number(searchParams.get("guests") || "2");

  if (!slug || !checkIn || !checkOut) {
    return Response.json(
      { error: "Missing required params: slug, checkIn, checkOut" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(checkIn) || !dateRegex.test(checkOut)) {
    return Response.json(
      { error: "Dates must be YYYY-MM-DD format" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Get static price as fallback
  const property = await getPropertyBySlug(slug);
  const staticPricePerNight = property?.price_per_night ?? null;

  // Look up Booking.com hotel ID
  const entry = mapping[slug];
  if (!entry?.enabled || !entry.bookingHotelId) {
    const body: AvailabilityResponse = {
      source: "unmapped",
      availability: null,
      staticPricePerNight,
    };
    return Response.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Fetch live availability
  const availability = await getBookingAvailability(
    entry.bookingHotelId,
    checkIn,
    checkOut,
    guests
  );

  if (!availability) {
    const body: AvailabilityResponse = {
      source: "error",
      availability: null,
      staticPricePerNight,
    };
    return Response.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const body: AvailabilityResponse = {
    source: "booking",
    availability,
    staticPricePerNight,
  };
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
