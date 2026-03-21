import Navbar from "@/components/Navbar";
import { getProperties, getPropertiesWithCoordinates } from "@/lib/queries";
import type { MapProperty } from "@/components/TrailMap";
import SearchLayout from "@/components/SearchLayout";

const TYPE_LABELS: Record<string, string> = {
  hotel: "Hotel",
  inn: "Inn",
  bnb: "B&B",
  campsite: "Campsite",
  glamping: "Glamping",
  hostel: "Hostel",
  cottage: "Cottage",
};

const TYPE_ICONS: Record<string, string> = {
  hotel: "apartment",
  inn: "local_bar",
  bnb: "cottage",
  campsite: "camping",
  glamping: "holiday_village",
  hostel: "backpack",
  cottage: "house",
};

function mapPropertyToCard(p: Record<string, unknown>) {
  const distanceMiles = Number(p.trail_distance_miles) || 0;
  const hasTransfer = p.has_taxi_service && distanceMiles > 0.3;
  const propertyType = (p.property_type as string) || "bnb";
  const price = Math.round(Number(p.price_per_night) / 100);
  return {
    slug: p.slug as string,
    name: p.name as string,
    rating: Number(p.rating) || 0,
    propertyType,
    typeLabel: TYPE_LABELS[propertyType] || propertyType,
    typeIcon: TYPE_ICONS[propertyType] || "home",
    distance: hasTransfer
      ? `${distanceMiles} miles with taxi transfer`
      : `${distanceMiles} miles off trail`,
    distanceIcon: hasTransfer ? "local_taxi" : "navigation",
    price,
    priceLabel: propertyType === "campsite" ? `/pitch` : `/night`,
    badge: null as string | null,
    badgeColor: "",
    urgency: `${p.village} · Day ${p.day_on_trail || "?"}`,
    urgencyColor: "text-secondary",
    amenities: [
      { icon: "dry_cleaning", label: "Boot dryer", active: !!p.has_boot_dryer },
      { icon: "pets", label: "Dog friendly", active: !!p.is_dog_friendly },
      { icon: "wifi", label: "WiFi", active: !!p.has_wifi },
    ],
    image: (p.image_url as string) || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
  };
}

const FALLBACK_ACCOMMODATIONS = [
  {
    slug: "the-lygon-arms",
    name: "The Lygon Arms",
    rating: 4.9,
    propertyType: "inn",
    typeLabel: "Inn",
    typeIcon: "local_bar",
    distance: "0.1 miles off trail",
    distanceIcon: "navigation",
    price: 245,
    priceLabel: "/night",
    badge: "AVAILABLE" as string | null,
    badgeColor: "bg-primary",
    urgency: "Broadway · Day 2",
    urgencyColor: "text-secondary",
    amenities: [
      { icon: "dry_cleaning", label: "Boot dryer", active: true },
      { icon: "pets", label: "Dog friendly", active: true },
      { icon: "wifi", label: "WiFi", active: true },
    ],
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
  },
  {
    slug: "holly-house-bnb",
    name: "Holly House B&B",
    rating: 4.7,
    propertyType: "bnb",
    typeLabel: "B&B",
    typeIcon: "cottage",
    distance: "0.1 miles off trail",
    distanceIcon: "navigation",
    price: 115,
    priceLabel: "/night",
    badge: null as string | null,
    badgeColor: "",
    urgency: "Chipping Campden · Day 1",
    urgencyColor: "text-secondary",
    amenities: [
      { icon: "dry_cleaning", label: "Boot dryer", active: true },
      { icon: "pets", label: "Dog friendly", active: true },
      { icon: "wifi", label: "WiFi", active: true },
    ],
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80",
  },
  {
    slug: "the-white-hart-winchcombe",
    name: "The White Hart Inn",
    rating: 4.5,
    propertyType: "inn",
    typeLabel: "Inn",
    typeIcon: "local_bar",
    distance: "0.2 miles off trail",
    distanceIcon: "navigation",
    price: 120,
    priceLabel: "/night",
    badge: null,
    badgeColor: "",
    urgency: "Winchcombe · Day 3",
    urgencyColor: "text-secondary",
    amenities: [
      { icon: "dry_cleaning", label: "Boot dryer", active: true },
      { icon: "pets", label: "Dog friendly", active: true },
      { icon: "wifi", label: "WiFi", active: true },
    ],
    image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=400&q=80",
  },
];

// Fallback coordinates from seed data
const FALLBACK_MAP_PROPERTIES: MapProperty[] = [
  { slug: "the-lygon-arms", name: "The Lygon Arms", village: "Broadway", price: 245, rating: 4.9, propertyType: "inn", dayOnTrail: 2, longitude: -1.8563, latitude: 52.0356 },
  { slug: "holly-house-bnb", name: "Holly House B&B", village: "Chipping Campden", price: 115, rating: 4.7, propertyType: "bnb", dayOnTrail: 1, longitude: -1.7798, latitude: 52.0536 },
  { slug: "westward-house", name: "Westward House", village: "Winchcombe", price: 145, rating: 4.8, propertyType: "bnb", dayOnTrail: 3, longitude: -1.966, latitude: 51.9539 },
];

export default async function SearchPage() {
  let accommodations;
  let mapProperties: MapProperty[];
  try {
    const properties = await getProperties();
    accommodations = properties.map(mapPropertyToCard);
    const coords = await getPropertiesWithCoordinates();
    mapProperties = (coords || []).map((p: Record<string, unknown>) => ({
      slug: p.slug as string,
      name: p.name as string,
      village: p.village as string,
      price: Math.round(Number(p.price_per_night) / 100),
      rating: Number(p.rating) || 0,
      propertyType: p.property_type as string,
      dayOnTrail: Number(p.day_on_trail) || 0,
      longitude: Number(p.longitude) || 0,
      latitude: Number(p.latitude) || 0,
    }));
  } catch {
    accommodations = FALLBACK_ACCOMMODATIONS;
    mapProperties = FALLBACK_MAP_PROPERTIES;
  }
  if (accommodations.length === 0) accommodations = FALLBACK_ACCOMMODATIONS;
  if (mapProperties.length === 0) mapProperties = FALLBACK_MAP_PROPERTIES;
  return (
    <>
      <Navbar />
      <SearchLayout accommodations={accommodations} mapProperties={mapProperties} />
    </>
  );
}
