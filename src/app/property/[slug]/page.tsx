import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEnrichedPropertyBySlug, getBookingHotelId } from "@/lib/queries";
import type { Property } from "@/lib/queries";
import PropertyMap from "@/components/PropertyMap";
import BookingWidget from "@/components/BookingWidget";
import BookingReviews from "@/components/BookingReviews";

function buildAmenities(p: Property) {
  return [
    { icon: "heat_pump",             title: "Boot Dryers",     desc: "Industrial strength boot room",   active: p.has_boot_dryer },
    { icon: "local_laundry_service", title: "Laundry Service", desc: "Overnight wash & dry",            active: p.has_laundry },
    { icon: "lunch_dining",          title: "Packed Lunches",  desc: "Cotswold deli selections",        active: p.has_packed_lunch },
    { icon: "local_taxi",            title: "Trail Transfer",  desc: "Private shuttle within 5mi",      active: p.has_taxi_service },
    { icon: "wifi",                  title: "Giga-WiFi",       desc: "Download maps in seconds",        active: p.has_wifi },
    { icon: "local_parking",         title: "Parking",         desc: "Free on-site parking",            active: p.has_parking },
  ];
}


export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getEnrichedPropertyBySlug(slug);

  if (!property) notFound();

  const price = Math.round(property.price_per_night / 100);
  const amenities = buildAmenities(property);
  const rating = property.booking?.reviewScore || property.rating;
  const reviewCount = property.booking?.reviewCount || property.review_count;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;
  const mainImage = property.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80";
  const bookingHotelId = getBookingHotelId(slug);

  // Build gallery images: curated hero + Booking.com photos or fallback placeholders
  const bookingPhotos = property.booking?.photos ?? [];
  const galleryImages = [
    mainImage,
    ...(bookingPhotos.length >= 3
      ? bookingPhotos.slice(0, 3).map((p) => p.url)
      : [
          "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&q=80",
          "https://images.unsplash.com/photo-1533920379810-6bed1640a959?w=600&q=80",
          "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80",
        ]),
  ];

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
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span>{property.village}</span>
              </nav>
              <h1 className="font-headline text-3xl sm:text-5xl md:text-7xl font-bold text-primary tracking-tight leading-none mb-4">
                {property.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1 text-tertiary">
                  {Array.from({ length: fullStars }).map((_, i) => (
                    <span key={i} className="material-symbols-outlined filled">star</span>
                  ))}
                  {hasHalf && <span className="material-symbols-outlined filled">star_half</span>}
                  <span className="ml-1 font-bold text-on-background">{rating}</span>
                  <span className="text-secondary font-normal">({reviewCount} reviews)</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-outline-variant" />
                <div className="flex items-center gap-1 font-semibold text-primary">
                  <span className="material-symbols-outlined">location_on</span>
                  {property.village}{property.postcode ? `, ${property.postcode.split(" ")[0]}` : ""}
                </div>
                <div className="w-1 h-1 rounded-full bg-outline-variant" />
                <div className="bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Day {property.day_on_trail}
                </div>
                {property.is_dog_friendly && (
                  <div className="bg-secondary-container text-secondary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">pets</span>
                    Dog friendly
                  </div>
                )}
                {property.is_eco_certified && (
                  <div className="bg-secondary-container text-secondary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">eco</span>
                    Eco certified
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Gallery */}
        <section className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-3 sm:gap-4 h-[300px] sm:h-[400px] md:h-[600px] mb-8 sm:mb-16">
          <div className="md:col-span-2 md:row-span-2 relative overflow-hidden rounded-xl group">
            <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={property.name} src={galleryImages[0]} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
          <div className="relative overflow-hidden rounded-xl group">
            <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={`${property.name} photo`} src={galleryImages[1]} />
          </div>
          <div className="relative overflow-hidden rounded-xl group">
            <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={`${property.name} photo`} src={galleryImages[2]} />
          </div>
          <div className="md:col-span-2 relative overflow-hidden rounded-xl group">
            <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={`${property.name} photo`} src={galleryImages[3]} />
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
              <p className="text-lg text-on-surface-variant leading-relaxed">{property.description}</p>
              {property.booking?.description && (
                <details className="mt-6">
                  <summary className="text-sm font-bold text-tertiary cursor-pointer hover:underline">
                    More from Booking.com
                  </summary>
                  <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                    {property.booking.description}
                  </p>
                </details>
              )}
            </section>

            {/* Walker Logistics + Map */}
            <section className="bg-surface-container-low rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
              <div className="relative z-10 flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-tertiary mb-4">
                    <span className="material-symbols-outlined filled">directions_walk</span>
                    <span className="font-label uppercase tracking-widest text-xs font-bold">Walker&apos;s Logistics</span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-primary mb-4">Trail Connectivity</h3>
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg">
                      <span className="text-secondary font-medium">Distance from Trail</span>
                      <span className="font-bold text-primary">{property.trail_distance_miles} Miles</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg">
                      <span className="text-secondary font-medium">Trail Segment</span>
                      <span className="font-bold text-primary">{property.trail_segment || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg">
                      <span className="text-secondary font-medium">Property Type</span>
                      <span className="font-bold text-primary capitalize">{property.property_type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-[250px] rounded-xl overflow-hidden border border-outline-variant/20">
                  <PropertyMap
                    name={property.name}
                    village={property.village}
                    longitude={property.longitude}
                    latitude={property.latitude}
                  />
                </div>
              </div>
            </section>

            {/* Amenities */}
            <section>
              <h2 className="font-headline text-3xl font-bold text-primary mb-8">Walker-First Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {amenities.map((a) => (
                  <div key={a.icon} className={`flex items-start gap-4 ${!a.active ? "opacity-30" : ""}`}>
                    <div className="bg-secondary-container p-3 rounded-lg text-secondary">
                      <span className="material-symbols-outlined">{a.icon}</span>
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
            <BookingReviews
              slug={slug}
              bookingHotelId={bookingHotelId}
              curatedRating={property.rating}
              curatedReviewCount={property.review_count}
            />
          </div>

          {/* Booking Widget */}
          <aside className="lg:col-span-4">
            <BookingWidget
              slug={slug}
              bookingHotelId={bookingHotelId}
              staticPrice={price}
              propertyName={property.name}
              propertyType={property.property_type}
              websiteUrl={property.website_url}
              hasTaxiService={property.has_taxi_service}
              hostName={property.host_name}
              hostDescription={property.host_description}
            />

            {/* Trail Explorer CTA */}
            <Link href="/explore"
                  className="mt-4 flex items-center gap-3 p-4 bg-primary rounded-xl hover:bg-primary/90 transition-all">
              <span className="material-symbols-outlined text-white">explore</span>
              <div>
                <p className="text-xs font-bold text-white">Trail Explorer</p>
                <p className="text-[10px] text-white/60">Pubs, water & amenities nearby</p>
              </div>
              <span className="material-symbols-outlined text-white/40 text-sm ml-auto">arrow_forward</span>
            </Link>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
