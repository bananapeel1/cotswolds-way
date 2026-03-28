/**
 * Data layer — reads from static JSON files, optionally enriched with
 * Booking.com Demand API data (photos, reviews, live pricing).
 *
 * To add/edit a property: update src/data/properties.json
 * To link a property to Booking.com: update src/data/booking-mapping.json
 */

import propertiesData from "@/data/properties.json";
import bookingMappingData from "@/data/booking-mapping.json";
import { getBookingDetails } from "./booking";
import type { BookingMapping, BookingPhoto } from "./booking-types";

const bookingMapping = bookingMappingData as Record<string, BookingMapping>;

export type BookingEnrichment = {
  hotelId: string;
  photos: BookingPhoto[];
  description: string;
  amenities: string[];
  reviewScore: number;
  reviewCount: number;
};

export type Property = {
  id: string;
  slug: string;
  name: string;
  description: string;
  short_description: string;
  property_type: string;
  village: string;
  postcode: string;
  trail_distance_miles: number;
  trail_segment: string;
  trail_stage: number;
  day_on_trail: number;
  price_per_night: number;
  rating: number | null;
  review_count: number | null;
  has_boot_dryer: boolean;
  has_luggage_transfer: boolean;
  has_laundry: boolean;
  has_packed_lunch: boolean;
  has_taxi_service: boolean;
  is_dog_friendly: boolean;
  is_eco_certified: boolean;
  has_wifi: boolean;
  has_parking: boolean;
  host_name: string;
  host_description: string;
  image_url: string | null;
  website_url: string | null;
  latitude: number;
  longitude: number;
  booking?: BookingEnrichment | null;
};

const properties: Property[] = propertiesData as Property[];

// ─── Properties ───────────────────────────────────────────────────────────────

export async function getProperties(filters?: {
  maxDistance?: number;
  dogFriendly?: boolean;
  village?: string;
  day?: number;
  stage?: number;
}): Promise<Property[]> {
  let results = [...properties];

  if (filters?.maxDistance) {
    results = results.filter((p) => p.trail_distance_miles <= filters.maxDistance!);
  }
  if (filters?.dogFriendly) {
    results = results.filter((p) => p.is_dog_friendly);
  }
  if (filters?.village) {
    results = results.filter(
      (p) => p.village.toLowerCase() === filters.village!.toLowerCase()
    );
  }
  if (filters?.day) {
    results = results.filter((p) => p.day_on_trail === filters.day);
  }
  if (filters?.stage) {
    results = results.filter((p) => p.trail_stage === filters.stage);
  }

  return results.sort((a, b) => a.trail_distance_miles - b.trail_distance_miles);
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  return properties.find((p) => p.slug === slug) ?? null;
}

export async function getPropertyReviews(_propertyId: string) {
  // Reviews will be added in a future update.
  return [];
}

export async function getPropertiesWithCoordinates(): Promise<Property[]> {
  return properties.filter((p) => p.latitude && p.longitude);
}

// ─── Booking.com enrichment ─────────────────────────────────────────────────

/** Check if a property has a Booking.com mapping */
export function getBookingHotelId(slug: string): string | null {
  const entry = bookingMapping[slug];
  if (!entry?.enabled || !entry.bookingHotelId) return null;
  return entry.bookingHotelId;
}

/** Enrich a single property with Booking.com static data (photos, reviews). */
async function enrichProperty(property: Property): Promise<Property> {
  const hotelId = getBookingHotelId(property.slug);
  if (!hotelId) return { ...property, booking: null };

  try {
    const details = await getBookingDetails(hotelId);
    if (!details) return { ...property, booking: null };

    return {
      ...property,
      booking: {
        hotelId,
        photos: details.photos,
        description: details.description,
        amenities: details.amenities,
        reviewScore: details.reviewScore,
        reviewCount: details.reviewCount,
      },
    };
  } catch {
    return { ...property, booking: null };
  }
}

/** Get a single enriched property by slug. */
export async function getEnrichedPropertyBySlug(slug: string): Promise<Property | null> {
  const property = properties.find((p) => p.slug === slug) ?? null;
  if (!property) return null;
  return enrichProperty(property);
}

/** Get filtered properties enriched with Booking.com data. */
export async function getEnrichedProperties(filters?: {
  maxDistance?: number;
  dogFriendly?: boolean;
  village?: string;
  day?: number;
}): Promise<Property[]> {
  const base = await getProperties(filters);
  // Enrich sequentially to respect Booking.com rate limits
  const enriched: Property[] = [];
  for (const p of base) {
    enriched.push(await enrichProperty(p));
  }
  return enriched;
}

// ─── Trail segments ───────────────────────────────────────────────────────────

export async function getTrailSegments() {
  return [
    { name: "Chipping Campden to Broadway",  start_village: "Chipping Campden", end_village: "Broadway",          distance_miles: 6.2,  elevation_gain_ft: 850,  difficulty: "moderate",  day_number: 1 },
    { name: "Broadway to Winchcombe",         start_village: "Broadway",         end_village: "Winchcombe",         distance_miles: 11.4, elevation_gain_ft: 1240, difficulty: "strenuous", day_number: 2 },
    { name: "Winchcombe to Cheltenham",       start_village: "Winchcombe",       end_village: "Cheltenham",         distance_miles: 12.8, elevation_gain_ft: 980,  difficulty: "moderate",  day_number: 3 },
    { name: "Cheltenham to Painswick",        start_village: "Cheltenham",       end_village: "Painswick",          distance_miles: 13.5, elevation_gain_ft: 1100, difficulty: "strenuous", day_number: 4 },
    { name: "Painswick to Stroud",            start_village: "Painswick",        end_village: "Stroud",             distance_miles: 8.6,  elevation_gain_ft: 640,  difficulty: "moderate",  day_number: 5 },
    { name: "Stroud to Dursley",              start_village: "Stroud",           end_village: "Dursley",            distance_miles: 14.0, elevation_gain_ft: 1380, difficulty: "strenuous", day_number: 6 },
    { name: "Dursley to Wotton-under-Edge",   start_village: "Dursley",          end_village: "Wotton-under-Edge",  distance_miles: 7.2,  elevation_gain_ft: 580,  difficulty: "moderate",  day_number: 7 },
    { name: "Wotton to Old Sodbury",          start_village: "Wotton-under-Edge",end_village: "Old Sodbury",        distance_miles: 15.5, elevation_gain_ft: 920,  difficulty: "strenuous", day_number: 8 },
    { name: "Old Sodbury to Bath",            start_village: "Old Sodbury",      end_village: "Bath",               distance_miles: 20.7, elevation_gain_ft: 760,  difficulty: "moderate",  day_number: 9 },
  ];
}

// ─── Itinerary templates ──────────────────────────────────────────────────────

export async function getItineraryTemplates() {
  return [
    {
      id: "1",
      name: "7-Day Classic",
      slug: "north-to-south-7",
      description: "The definitive Cotswold Way experience from Chipping Campden to Bath. A steady pace for the dedicated walker.",
      total_days: 7,
      total_miles: 102.0,
      direction: "north_to_south",
      image_url: null,
      itinerary_stops: [
        { day_number: 1, village: "Chipping Campden", label: "Start of Trail",  mile_marker: 0.0  },
        { day_number: 1, village: "Broadway",          label: "End of Day 1",   mile_marker: 6.2  },
        { day_number: 2, village: "Winchcombe",        label: "End of Day 2",   mile_marker: 17.6 },
        { day_number: 3, village: "Cheltenham",        label: "End of Day 3",   mile_marker: 30.4 },
        { day_number: 4, village: "Painswick",         label: "End of Day 4",   mile_marker: 43.9 },
        { day_number: 5, village: "Stroud",            label: "End of Day 5",   mile_marker: 52.5 },
        { day_number: 6, village: "Wotton-under-Edge", label: "End of Day 6",  mile_marker: 73.0 },
        { day_number: 7, village: "Bath",              label: "End of Trail",   mile_marker: 102.0 },
      ],
    },
    {
      id: "2",
      name: "10-Day Standard",
      slug: "north-to-south-10",
      description: "A more relaxed pace with shorter days, allowing time to explore villages and enjoy detours along the way.",
      total_days: 10,
      total_miles: 102.0,
      direction: "north_to_south",
      image_url: null,
      itinerary_stops: [
        { day_number: 1,  village: "Chipping Campden", label: "Start of Trail",  mile_marker: 0.0  },
        { day_number: 1,  village: "Broadway",          label: "End of Day 1",   mile_marker: 6.2  },
        { day_number: 2,  village: "Winchcombe",        label: "End of Day 2",   mile_marker: 17.6 },
        { day_number: 3,  village: "Cleeve Hill",       label: "End of Day 3",   mile_marker: 21.9 },
        { day_number: 4,  village: "Cheltenham",        label: "End of Day 4",   mile_marker: 30.4 },
        { day_number: 5,  village: "Painswick",         label: "End of Day 5",   mile_marker: 43.9 },
        { day_number: 6,  village: "Stroud",            label: "End of Day 6",   mile_marker: 52.5 },
        { day_number: 7,  village: "Nailsworth",        label: "End of Day 7",   mile_marker: 57.3 },
        { day_number: 8,  village: "Dursley",           label: "End of Day 8",   mile_marker: 66.5 },
        { day_number: 9,  village: "Wotton-under-Edge", label: "End of Day 9",  mile_marker: 73.0 },
        { day_number: 10, village: "Bath",              label: "End of Trail",   mile_marker: 102.0 },
      ],
    },
    {
      id: "3",
      name: "14-Day Explorer",
      slug: "north-to-south-14",
      description: "Short, leisurely days for savouring every view and village. Perfect for first-timers and those who want to soak it all in.",
      total_days: 14,
      total_miles: 102.0,
      direction: "north_to_south",
      image_url: null,
      itinerary_stops: [
        { day_number: 1,  village: "Chipping Campden", label: "Start of Trail",   mile_marker: 0.0  },
        { day_number: 2,  village: "Broadway",          label: "End of Day 2",    mile_marker: 6.2  },
        { day_number: 3,  village: "Stanton",           label: "End of Day 3",    mile_marker: 9.0  },
        { day_number: 4,  village: "Winchcombe",        label: "End of Day 4",    mile_marker: 17.6 },
        { day_number: 5,  village: "Cleeve Hill",       label: "End of Day 5",    mile_marker: 21.9 },
        { day_number: 6,  village: "Cheltenham",        label: "End of Day 6",    mile_marker: 30.4 },
        { day_number: 7,  village: "Seven Springs",     label: "End of Day 7",    mile_marker: 37.8 },
        { day_number: 8,  village: "Painswick",         label: "End of Day 8",    mile_marker: 43.9 },
        { day_number: 9,  village: "Stroud",            label: "End of Day 9",    mile_marker: 52.5 },
        { day_number: 10, village: "Nailsworth",        label: "End of Day 10",   mile_marker: 57.3 },
        { day_number: 11, village: "Dursley",           label: "End of Day 11",   mile_marker: 66.5 },
        { day_number: 12, village: "Wotton-under-Edge", label: "End of Day 12",  mile_marker: 73.0 },
        { day_number: 13, village: "Old Sodbury",       label: "End of Day 13",   mile_marker: 81.5 },
        { day_number: 14, village: "Bath",              label: "End of Trail",    mile_marker: 102.0 },
      ],
    },
  ];
}
