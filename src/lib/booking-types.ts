/**
 * Type definitions for Booking.com Demand API responses.
 * Kept separate from the internal Property type to maintain clean boundaries.
 */

// ─── Property details (cached 24h) ──────────────────────────────────────────

export interface BookingPhoto {
  url: string;
  caption?: string;
  tag?: string; // "property", "room", "bathroom", etc.
}

export interface BookingDetails {
  hotelId: string;
  name: string;
  description: string;
  photos: BookingPhoto[];
  amenities: string[];
  starRating: number;
  reviewScore: number;
  reviewCount: number;
  coordinates: { latitude: number; longitude: number };
}

// ─── Availability & pricing (never cached) ──────────────────────────────────

export interface BookingRoom {
  roomId: string;
  name: string;
  pricePerNight: number; // in pence, to match existing price_per_night format
  totalPrice: number; // total for entire stay, in pence
  maxOccupancy: number;
  cancellationPolicy: string;
}

export interface BookingAvailability {
  available: boolean;
  rooms: BookingRoom[];
  cheapestPricePerNight: number | null; // in pence
  currency: string; // ISO 4217 (e.g. "GBP")
}

// ─── Reviews (cached 24h) ───────────────────────────────────────────────────

export interface BookingReview {
  id: string;
  author: string;
  authorCountry: string;
  date: string; // ISO 8601
  score: number; // 0-10
  title: string;
  positiveText: string;
  negativeText: string;
  travellerType: string; // "solo", "couple", "family", "group"
}

export interface BookingReviewsResponse {
  reviews: BookingReview[];
  averageScore: number;
  totalCount: number;
  page: number;
  totalPages: number;
}

// ─── Booking mapping ────────────────────────────────────────────────────────

export interface BookingMapping {
  bookingHotelId: string | null;
  enabled: boolean;
}

// ─── API route response wrappers ────────────────────────────────────────────

export interface AvailabilityResponse {
  source: "booking" | "static" | "error" | "unmapped";
  availability: BookingAvailability | null;
  staticPricePerNight: number | null; // fallback in pence
}

export interface ReviewsResponse {
  source: "booking" | "error" | "unmapped";
  data: BookingReviewsResponse | null;
}

export interface DetailsResponse {
  source: "booking" | "error" | "unmapped";
  data: BookingDetails | null;
}
