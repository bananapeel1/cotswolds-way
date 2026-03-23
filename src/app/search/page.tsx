import Navbar from "@/components/Navbar";
import { getProperties, getPropertiesWithCoordinates } from "@/lib/queries";
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

  const properties = await getProperties({
    village: sp.village,
    dogFriendly: sp.dog === "true",
    day: sp.day ? parseInt(sp.day) : undefined,
  });

  const accommodations = properties.map((p) => {
    const distanceMiles = p.trail_distance_miles;
    const hasTransfer = p.has_taxi_service && distanceMiles > 0.3;
    const propertyType = p.property_type || "bnb";
    const price = Math.round(p.price_per_night / 100);
    return {
      slug: p.slug,
      name: p.name,
      rating: p.rating,
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
      urgency: `${p.village} · Day ${p.day_on_trail}`,
      urgencyColor: "text-secondary",
      amenities: [
        { icon: "dry_cleaning", label: "Boot dryer",   active: p.has_boot_dryer },
        { icon: "pets",         label: "Dog friendly", active: p.is_dog_friendly },
        { icon: "wifi",         label: "WiFi",         active: p.has_wifi },
      ],
      image: p.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
      isDogFriendly: p.is_dog_friendly,
      dayOnTrail: p.day_on_trail,
    };
  });

  const coordProperties = await getPropertiesWithCoordinates();
  const mapProperties: MapProperty[] = coordProperties.map((p) => ({
    slug: p.slug,
    name: p.name,
    village: p.village,
    price: Math.round(p.price_per_night / 100),
    rating: p.rating,
    propertyType: p.property_type,
    dayOnTrail: p.day_on_trail,
    longitude: p.longitude,
    latitude: p.latitude,
  }));

  return (
    <>
      <Navbar />
      <SearchLayout accommodations={accommodations} mapProperties={mapProperties} />
    </>
  );
}
