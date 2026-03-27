import { getBookingReviews } from "@/lib/booking";
import bookingMapping from "@/data/booking-mapping.json";
import type { BookingMapping, ReviewsResponse } from "@/lib/booking-types";

const mapping = bookingMapping as Record<string, BookingMapping>;

/**
 * GET /api/booking/reviews?slug=...&page=1
 *
 * Returns guest reviews from Booking.com. Cached for 1 hour client-side.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const page = Number(searchParams.get("page") || "1");

  if (!slug) {
    return Response.json(
      { error: "Missing required param: slug" },
      { status: 400 }
    );
  }

  // Look up Booking.com hotel ID
  const entry = mapping[slug];
  if (!entry?.enabled || !entry.bookingHotelId) {
    const body: ReviewsResponse = { source: "unmapped", data: null };
    return Response.json(body, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  // Fetch reviews
  const data = await getBookingReviews(entry.bookingHotelId, page);

  if (!data) {
    const body: ReviewsResponse = { source: "error", data: null };
    return Response.json(body, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  const body: ReviewsResponse = { source: "booking", data };
  return Response.json(body, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
