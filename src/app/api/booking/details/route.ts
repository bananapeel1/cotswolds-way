import { getBookingDetails } from "@/lib/booking";
import bookingMapping from "@/data/booking-mapping.json";
import type { BookingMapping, DetailsResponse } from "@/lib/booking-types";

const mapping = bookingMapping as Record<string, BookingMapping>;

/**
 * GET /api/booking/details?slug=...
 *
 * Returns static property details (photos, description, amenities) from
 * Booking.com. Cached for 24 hours.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return Response.json(
      { error: "Missing required param: slug" },
      { status: 400 }
    );
  }

  // Look up Booking.com hotel ID
  const entry = mapping[slug];
  if (!entry?.enabled || !entry.bookingHotelId) {
    const body: DetailsResponse = { source: "unmapped", data: null };
    return Response.json(body, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // Fetch details
  const data = await getBookingDetails(entry.bookingHotelId);

  if (!data) {
    const body: DetailsResponse = { source: "error", data: null };
    return Response.json(body, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  const body: DetailsResponse = { source: "booking", data };
  return Response.json(body, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
