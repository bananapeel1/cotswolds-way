import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ItineraryBuilder from "@/components/ItineraryBuilder";
import { getItineraryTemplates, getTrailSegments } from "@/lib/queries";

const FALLBACK_TEMPLATES = [
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
      { day_number: 1, village: "Chipping Campden", label: "Start of Trail", mile_marker: 0.0 },
      { day_number: 1, village: "Broadway", label: "End of Day 1", mile_marker: 6.2 },
      { day_number: 2, village: "Winchcombe", label: "End of Day 2", mile_marker: 17.6 },
    ],
  },
  {
    id: "2",
    name: "8-Day Scenic",
    slug: "north-to-south-8",
    description: "A more relaxed pace with shorter days, allowing time to explore villages and detours along the way.",
    total_days: 8,
    total_miles: 102.0,
    direction: "north_to_south",
    image_url: null,
    itinerary_stops: [],
  },
  {
    id: "3",
    name: "Weekend Explorer",
    slug: "broadway-circular",
    description: "A focused 3-day loop around the charming hills of Broadway and Stanton. Perfect for a weekend escape.",
    total_days: 3,
    total_miles: 24.0,
    direction: "circular",
    image_url: null,
    itinerary_stops: [],
  },
];

const FALLBACK_SEGMENTS = [
  { name: "Chipping Campden to Broadway", start_village: "Chipping Campden", end_village: "Broadway", distance_miles: 6.2, elevation_gain_ft: 850, difficulty: "moderate", day_number: 1 },
  { name: "Broadway to Winchcombe", start_village: "Broadway", end_village: "Winchcombe", distance_miles: 11.4, elevation_gain_ft: 1240, difficulty: "strenuous", day_number: 2 },
];

export default async function ItineraryPage() {
  let templates;
  let segments;
  try {
    templates = await getItineraryTemplates();
    segments = await getTrailSegments();
  } catch {
    templates = FALLBACK_TEMPLATES;
    segments = FALLBACK_SEGMENTS;
  }
  if (!templates || templates.length === 0) templates = FALLBACK_TEMPLATES;
  if (!segments || segments.length === 0) segments = FALLBACK_SEGMENTS;

  return (
    <>
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-8 pt-12 pb-24">
        <ItineraryBuilder
          templates={templates as Parameters<typeof ItineraryBuilder>[0]["templates"]}
          segments={segments as Parameters<typeof ItineraryBuilder>[0]["segments"]}
        />
      </main>
      <Footer />
    </>
  );
}
