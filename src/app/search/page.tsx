import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { getEnrichedProperties, getPropertiesWithCoordinates } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Find Accommodation Along the Cotswold Way",
  description:
    "Browse 72 verified B&Bs, hotels, hostels and campsites along the Cotswold Way. Filter by village, trail stage, dog-friendly, and property type. Interactive map shows every stay near the trail.",
  alternates: { canonical: "https://thecotswoldsway.com/search" },
};
import type { MapProperty } from "@/components/TrailMap";
import SearchLayout from "@/components/SearchLayout";

const TYPE_LABELS: Record<string, string> = {
  hotel: "Hotel", inn: "Inn", bnb: "B&B",
  campsite: "Campsite", glamping: "Glamping",
  hostel: "Hostel", cottage: "Cottage",
};

const TYPE_ICONS: Record<string, string> = {
  hotel: "apartment", inn: "local_bar", bnb: "cottage",
  campsite: "camping", glamping: "holiday_village",
  hostel: "backpack", cottage: "house",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ village?: string; dog?: string; day?: string }>;
}) {
  const sp = await searchParams;

  const properties = await getEnrichedProperties({
    village: sp.village,
    dogFriendly: sp.dog === "true",
    day: sp.day ? parseInt(sp.day) : undefined,
  });

  const accommodations = properties.map((p) => {
    const distanceMiles = p.trail_distance_miles;
    const hasTransfer = p.has_taxi_service && distanceMiles > 0.3;
    const propertyType = p.property_type || "bnb";
    return {
      slug: p.slug,
      name: p.name,
      rating: p.rating ?? null,
      propertyType,
      typeLabel: TYPE_LABELS[propertyType] || propertyType,
      typeIcon: TYPE_ICONS[propertyType] || "home",
      distance: hasTransfer
        ? `${distanceMiles} miles with taxi transfer`
        : `${distanceMiles} miles off trail`,
      distanceIcon: hasTransfer ? "local_taxi" : "navigation",
      badge: null as string | null,
      badgeColor: "",
      urgency: `${p.village} · Stage ${p.trail_stage}`,
      urgencyColor: "text-secondary",
      trailStage: p.trail_stage,
      village: p.village,
      description: p.short_description || p.description?.substring(0, 100) || '',
      amenities: [
        { icon: "dry_cleaning", label: "Boot dryer",   active: p.has_boot_dryer },
        { icon: "pets",         label: "Dog friendly", active: p.is_dog_friendly },
        { icon: "wifi",         label: "WiFi",         active: p.has_wifi },
      ],
      image: p.booking?.photos?.[0]?.url || p.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
      isDogFriendly: p.is_dog_friendly,
      dayOnTrail: p.day_on_trail,
      hasLiveAvailability: !!p.booking?.hotelId,
    };
  });

  const TYPE_LABELS_MAP: Record<string, string> = { hotel: "Hotel", inn: "Inn", bnb: "B&B", campsite: "Campsite", glamping: "Glamping", hostel: "Hostel" };
  const coordProperties = await getPropertiesWithCoordinates();
  const mapProperties: MapProperty[] = coordProperties.map((p) => ({
    slug: p.slug,
    name: p.name,
    village: p.village,
    rating: p.rating ?? null,
    propertyType: p.property_type,
    dayOnTrail: p.day_on_trail,
    longitude: p.longitude,
    latitude: p.latitude,
    description: p.short_description || p.description?.substring(0, 120) || '',
    typeLabel: TYPE_LABELS_MAP[p.property_type] || p.property_type,
    trailStage: p.trail_stage,
  }));

  return (
    <>
      <Navbar />
      <SearchLayout accommodations={accommodations} mapProperties={mapProperties} />
    </>
  );
}
