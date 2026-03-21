import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getProperties, getPropertiesWithCoordinates } from "@/lib/queries";
import TrailMap from "@/components/TrailMap";
import type { MapProperty } from "@/components/TrailMap";

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
      { icon: "local_shipping", label: "Luggage partner", active: !!p.has_luggage_transfer },
      { icon: "pets", label: "Dog friendly", active: !!p.is_dog_friendly },
    ],
    image: (p.image_url as string) || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
  };
}

const FALLBACK_ACCOMMODATIONS = [
  {
    slug: "the-lygon-arms",
    name: "The Lygon Arms",
    rating: 4.9,
    distance: "0.1 miles off trail",
    distanceIcon: "navigation",
    price: 245,
    badge: "AVAILABLE" as string | null,
    badgeColor: "bg-primary",
    urgency: "Only 2 rooms left for May 2026",
    urgencyColor: "text-error",
    amenities: [
      { icon: "dry_cleaning", label: "Boot dryer", active: true },
      { icon: "local_shipping", label: "Luggage partner", active: true },
      { icon: "pets", label: "Dog friendly", active: true },
    ],
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
  },
  {
    slug: "holly-house-bnb",
    name: "Holly House B&B",
    rating: 4.7,
    distance: "0.1 miles off trail",
    distanceIcon: "navigation",
    price: 115,
    badge: "FILLING FAST" as string | null,
    badgeColor: "bg-tertiary",
    urgency: "Chipping Campden · Day 1",
    urgencyColor: "text-tertiary",
    amenities: [
      { icon: "dry_cleaning", label: "Boot dryer", active: true },
      { icon: "local_shipping", label: "Luggage partner", active: true },
      { icon: "pets", label: "Dog friendly", active: true },
    ],
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80",
  },
  {
    slug: "westward-house",
    name: "Westward House",
    rating: 4.8,
    distance: "0.3 miles off trail",
    distanceIcon: "navigation",
    price: 145,
    badge: null,
    badgeColor: "",
    urgency: "Winchcombe · Day 3",
    urgencyColor: "text-secondary",
    amenities: [
      { icon: "dry_cleaning", label: "Boot dryer", active: true },
      { icon: "local_shipping", label: "Luggage partner", active: true },
      { icon: "pets", label: "Dog friendly", active: false },
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
      <main className="flex-grow flex flex-col md:flex-row h-[calc(100vh-65px)]">
        {/* Left: Scrollable List */}
        <section className="w-full md:w-1/2 flex flex-col bg-surface overflow-hidden border-r border-outline-variant/20">
          {/* Filter Bar */}
          <div className="bg-surface px-8 pt-8 pb-4 z-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-3xl font-bold tracking-tight text-primary">
                Accommodations
              </h2>
              <span className="text-sm font-label text-secondary">
                {accommodations.length} properties found
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
              <button className="flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold whitespace-nowrap">
                <span className="material-symbols-outlined text-sm">
                  distance
                </span>
                Under 0.5mi
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-bold whitespace-nowrap hover:bg-secondary-container transition-colors">
                Budget
                <span className="material-symbols-outlined text-sm">
                  keyboard_arrow_down
                </span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-bold whitespace-nowrap hover:bg-secondary-container transition-colors">
                <span className="material-symbols-outlined text-sm">pets</span>
                Dog-friendly
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-bold whitespace-nowrap hover:bg-secondary-container transition-colors">
                Amenities
                <span className="material-symbols-outlined text-sm">tune</span>
              </button>
            </div>
            <div className="h-px w-full bg-outline-variant/20 mt-2" />
          </div>

          {/* Accommodation Cards */}
          <div className="px-8 pb-12 space-y-6 overflow-y-auto no-scrollbar flex-grow">
            {accommodations.map((acc) => (
              <Link
                href={`/property/${acc.slug}`}
                key={acc.slug}
                className="bg-surface-container-lowest rounded-2xl overflow-hidden flex flex-col sm:flex-row shadow-sm hover:shadow-md transition-shadow group border border-outline-variant/10 block"
              >
                <div className="w-full sm:w-48 h-48 relative shrink-0 overflow-hidden">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={acc.name}
                    src={acc.image}
                  />
                  <div className="absolute top-2 left-2 bg-primary/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">{acc.typeIcon}</span>
                    {acc.typeLabel}
                  </div>
                </div>
                <div className="p-6 flex flex-col justify-between flex-grow">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-headline text-xl font-bold text-primary">
                        {acc.name}
                      </h4>
                      <div className="flex items-center text-tertiary">
                        <span className="material-symbols-outlined text-sm filled">
                          star
                        </span>
                        <span className="text-sm font-bold ml-1">
                          {acc.rating}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] font-label text-secondary uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-xs">
                        {acc.distanceIcon}
                      </span>
                      {acc.distance}
                    </p>
                    <div className="flex gap-4 mb-4">
                      {acc.amenities.map((amenity) => (
                        <div
                          key={amenity.icon}
                          className="group/icon relative cursor-help"
                        >
                          <span
                            className={`material-symbols-outlined text-secondary ${!amenity.active ? "opacity-30" : "hover:text-primary"} transition-colors`}
                          >
                            {amenity.icon}
                          </span>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/icon:block bg-primary text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                            {amenity.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-end border-t border-outline-variant/10 pt-4">
                    <div>
                      <p
                        className={`text-[10px] ${acc.urgencyColor} font-bold mb-1 uppercase tracking-tighter`}
                      >
                        {acc.urgency}
                      </p>
                      <p className="text-2xl font-headline font-bold text-primary">
                        &pound;{acc.price}
                        <span className="text-sm font-body font-normal text-secondary">
                          {acc.priceLabel}
                        </span>
                      </p>
                    </div>
                    <span className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-primary-container transition-colors">
                      View Stay
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Right: Interactive Map */}
        <section className="hidden md:block w-1/2 relative">
          <TrailMap properties={mapProperties} />
        </section>
      </main>
    </>
  );
}
