import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { getPropertyBySlug, getPropertyReviews } from "@/lib/queries";
import PropertyMap from "@/components/PropertyMap";

function buildAmenities(p: Record<string, unknown>) {
  return [
    { icon: "heat_pump", title: "Boot Dryers", desc: "Industrial strength boot room", active: !!p.has_boot_dryer },
    { icon: "local_laundry_service", title: "Laundry Service", desc: "Overnight wash & dry", active: !!p.has_laundry },
    { icon: "lunch_dining", title: "Packed Lunches", desc: "Cotswold deli selections", active: !!p.has_packed_lunch },
    { icon: "local_taxi", title: "Trail Transfer", desc: "Private shuttle within 5mi", active: !!p.has_taxi_service },
    { icon: "wifi", title: "Giga-WiFi", desc: "Download maps in seconds", active: !!p.has_wifi },
    { icon: "local_parking", title: "Parking", desc: "Free on-site parking", active: !!p.has_parking },
  ];
}

const FALLBACK_PROPERTY = {
  slug: "the-lygon-arms",
  name: "The Lygon Arms",
  description: "A historic 16th-century coaching inn in the heart of Broadway. The Lygon Arms has hosted Charles I and Oliver Cromwell, and today offers luxury accommodation with all modern amenities for Cotswold Way walkers.",
  short_description: "Historic coaching inn with luxury rooms",
  property_type: "inn",
  village: "Broadway",
  postcode: "WR12 7DU",
  trail_distance_miles: 0.1,
  trail_segment: "Chipping Campden to Broadway",
  day_on_trail: 2,
  price_per_night: 24500,
  rating: 4.9,
  review_count: 128,
  has_boot_dryer: true,
  has_luggage_transfer: false,
  has_laundry: true,
  has_packed_lunch: true,
  has_taxi_service: true,
  is_dog_friendly: true,
  is_eco_certified: false,
  has_wifi: true,
  has_parking: true,
  host_name: "The Lygon Arms Team",
  host_description: "Family-run since the 16th century",
  image_url: null,
};

const FALLBACK_REVIEWS = [
  {
    id: "1",
    rating: 5,
    title: "Perfect end to Day 1",
    body: "The boot room was a lifesaver after a muddy stretch. The breakfast was hearty enough to fuel my walk to Broadway.",
    guest_initials: "JD",
    guest_name: "James Davies",
    walked_date: "May 2024",
  },
  {
    id: "2",
    rating: 5,
    title: "True Walker Focus",
    body: "They understood our logistics perfectly. Luggage was waiting in the room, and the laundry service was efficient.",
    guest_initials: "SR",
    guest_name: "Sarah Roberts",
    walked_date: "June 2024",
  },
];

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let property;
  let reviews;
  try {
    property = await getPropertyBySlug(slug);
    reviews = await getPropertyReviews(property.id);
  } catch {
    property = FALLBACK_PROPERTY;
    reviews = FALLBACK_REVIEWS;
  }

  const price = Math.round(Number(property.price_per_night) / 100);
  const amenities = buildAmenities(property);
  const rating = Number(property.rating) || 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;
  const mainImage = property.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80";

  return (
    <>
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-8 pt-6 sm:pt-12 pb-16 sm:pb-24">
        {/* Header */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <nav className="flex items-center gap-2 text-secondary mb-4 text-sm font-medium">
                <Link href="/search" className="hover:text-primary transition-colors">Accommodations</Link>
                <span className="material-symbols-outlined text-xs">
                  chevron_right
                </span>
                <span>{property.village}</span>
              </nav>
              <h1 className="font-headline text-3xl sm:text-5xl md:text-7xl font-bold text-primary tracking-tight leading-none mb-4">
                {property.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1 text-tertiary">
                  {Array.from({ length: fullStars }).map((_, i) => (
                    <span key={i} className="material-symbols-outlined filled">
                      star
                    </span>
                  ))}
                  {hasHalf && (
                    <span className="material-symbols-outlined filled">
                      star_half
                    </span>
                  )}
                  <span className="ml-1 font-bold text-on-background">
                    {rating}
                  </span>
                  <span className="text-secondary font-normal">
                    ({property.review_count || 0} reviews)
                  </span>
                </div>
                <div className="w-1 h-1 rounded-full bg-outline-variant" />
                <div className="flex items-center gap-1 font-semibold text-primary">
                  <span className="material-symbols-outlined">
                    location_on
                  </span>
                  {property.village}{property.postcode ? `, ${property.postcode.split(" ")[0]}` : ""}
                </div>
                <div className="w-1 h-1 rounded-full bg-outline-variant" />
                <div className="bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Day {property.day_on_trail || "?"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Gallery */}
        <section className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-3 sm:gap-4 h-[300px] sm:h-[400px] md:h-[600px] mb-8 sm:mb-16">
          <div className="md:col-span-2 md:row-span-2 relative overflow-hidden rounded-xl group">
            <img
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt={property.name}
              src={mainImage}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
          <div className="relative overflow-hidden rounded-xl group">
            <img
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt="Cozy bedroom"
              src="https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&q=80"
            />
          </div>
          <div className="relative overflow-hidden rounded-xl group">
            <img
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt="English breakfast"
              src="https://images.unsplash.com/photo-1533920379810-6bed1640a959?w=600&q=80"
            />
          </div>
          <div className="md:col-span-2 relative overflow-hidden rounded-xl group">
            <img
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt="Cotswold countryside"
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80"
            />
            <button className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-4 py-2 rounded-lg font-bold text-sm text-primary shadow-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-base">
                grid_view
              </span>
              Show all photos
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Content */}
          <div className="lg:col-span-8 space-y-16">
            {/* Description */}
            <section>
              <h2 className="font-headline text-3xl font-bold text-primary mb-6">
                {property.short_description || "A Sanctuary for the Discerning Walker"}
              </h2>
              <div className="prose prose-stone max-w-none text-on-surface-variant leading-relaxed space-y-4">
                <p className="text-lg">
                  {property.description}
                </p>
              </div>
            </section>

            {/* Walker's Logistics */}
            <section className="bg-surface-container-low rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
              <div className="relative z-10 flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-tertiary mb-4">
                    <span className="material-symbols-outlined filled">
                      directions_walk
                    </span>
                    <span className="font-label uppercase tracking-widest text-xs font-bold">
                      Walker&apos;s Logistics
                    </span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-primary mb-4">
                    Trail Connectivity
                  </h3>
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg">
                      <span className="text-secondary font-medium">
                        Distance from Trail
                      </span>
                      <span className="font-bold text-primary">{property.trail_distance_miles} Miles</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg">
                      <span className="text-secondary font-medium">
                        Trail Segment
                      </span>
                      <span className="font-bold text-primary">
                        {property.trail_segment || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg">
                      <span className="text-secondary font-medium">
                        Property Type
                      </span>
                      <span className="font-bold text-primary capitalize">
                        {(property.property_type as string) || "B&B"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-[250px] rounded-xl overflow-hidden border border-outline-variant/20">
                  <PropertyMap
                    name={property.name as string}
                    village={property.village as string}
                    longitude={property.longitude as number | null}
                    latitude={property.latitude as number | null}
                  />
                </div>
              </div>
            </section>

            {/* Amenities */}
            <section>
              <h2 className="font-headline text-3xl font-bold text-primary mb-8">
                Walker-First Amenities
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {amenities.map((a) => (
                  <div key={a.icon} className={`flex items-start gap-4 ${!a.active ? "opacity-30" : ""}`}>
                    <div className="bg-secondary-container p-3 rounded-lg text-secondary">
                      <span className="material-symbols-outlined">
                        {a.icon}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-primary">{a.title}</h4>
                      <p className="text-sm text-secondary">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Reviews */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-headline text-3xl font-bold text-primary">
                  What Other Walkers Say
                </h2>
                {(property.review_count || 0) > 2 && (
                  <span className="text-tertiary font-bold">
                    View all {property.review_count} reviews
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review: Record<string, unknown>) => (
                  <div
                    key={review.id as string}
                    className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm"
                  >
                    <div className="flex items-center gap-1 text-tertiary mb-3">
                      {Array.from({ length: Number(review.rating) || 5 }).map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-sm filled"
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <p className="font-bold text-primary mb-2">
                      &ldquo;{review.title as string}&rdquo;
                    </p>
                    <p className="text-on-surface-variant text-sm mb-4">
                      &ldquo;{review.body as string}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-xs font-bold text-on-secondary-fixed">
                        {review.guest_initials as string}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary">
                          {(review.guest_name as string)?.split(" ")[0]}{" "}
                          {(review.guest_name as string)?.split(" ").pop()?.charAt(0)}.
                        </p>
                        <p className="text-[10px] text-secondary">
                          Walked {review.walked_date as string}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <p className="text-secondary italic col-span-2">No reviews yet — be the first to stay!</p>
                )}
              </div>
            </section>
          </div>

          {/* Booking Widget */}
          <aside className="lg:col-span-4">
            <div className="sticky top-32">
              <div className="bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(28,28,25,0.1)] p-8 border border-outline-variant/20">
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-bold text-primary">
                    &pound;{price}
                  </span>
                  <span className="text-secondary font-medium">/ night</span>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="grid grid-cols-2 border border-outline-variant/30 rounded-lg overflow-hidden">
                    <div className="p-3 border-r border-outline-variant/30 hover:bg-surface-container-low transition-colors cursor-pointer">
                      <label className="block text-[10px] uppercase font-bold text-secondary tracking-wider mb-1">
                        Check-in
                      </label>
                      <span className="text-sm font-semibold">
                        Select date
                      </span>
                    </div>
                    <div className="p-3 hover:bg-surface-container-low transition-colors cursor-pointer">
                      <label className="block text-[10px] uppercase font-bold text-secondary tracking-wider mb-1">
                        Check-out
                      </label>
                      <span className="text-sm font-semibold">
                        Select date
                      </span>
                    </div>
                  </div>
                  <div className="p-3 border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer">
                    <label className="block text-[10px] uppercase font-bold text-secondary tracking-wider mb-1">
                      Occupancy
                    </label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        2 Walkers, 1 Room
                      </span>
                      <span className="material-symbols-outlined text-secondary">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">
                      &pound;{price} x 1 night
                    </span>
                    <span className="font-bold">&pound;{price}</span>
                  </div>
                  <div className="pt-3 border-t border-outline-variant/30 flex justify-between">
                    <span className="font-bold text-primary">Total</span>
                    <span className="font-bold text-primary">&pound;{price}</span>
                  </div>
                </div>
                {property.website_url ? (
                  <a
                    href={property.website_url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-tertiary text-on-tertiary py-4 rounded-xl font-bold text-lg hover:bg-tertiary-container shadow-lg shadow-tertiary/20 active:scale-[0.98] transition-all mb-4 text-center"
                  >
                    Book Direct
                    <span className="material-symbols-outlined text-base ml-2 align-middle">open_in_new</span>
                  </a>
                ) : (
                  <button className="w-full bg-tertiary text-on-tertiary py-4 rounded-xl font-bold text-lg hover:bg-tertiary-container shadow-lg shadow-tertiary/20 active:scale-[0.98] transition-all mb-4">
                    Reserve Room
                  </button>
                )}
                <p className="text-center text-xs text-secondary">
                  {property.website_url ? "You\u2019ll be redirected to the property\u2019s own site" : "You won\u2019t be charged yet"}
                </p>
                {property.has_taxi_service && (
                  <div className="mt-8 pt-8 border-t border-outline-variant/30">
                    <h4 className="font-bold text-primary mb-4 text-sm">
                      Getting There
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-secondary">
                          directions_car
                        </span>
                        <span className="text-xs text-on-surface-variant font-medium">
                          Nearby Taxi Dispatch
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-primary text-sm filled">
                        check_circle
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {/* Host Card */}
              <div className="mt-6 flex items-center gap-4 p-4 bg-surface-container-low rounded-xl">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">
                    person
                  </span>
                </div>
                <div>
                  <p className="text-xs text-secondary font-bold uppercase tracking-wider">
                    Your Host
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {property.host_name || "Your Host"}
                  </p>
                  {property.host_description && (
                    <p className="text-[10px] text-secondary">{property.host_description}</p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
