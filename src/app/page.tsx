import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import HomeMapPreview from "@/components/HomeMapPreview";
import { getPropertiesWithCoordinates } from "@/lib/queries";

const FALLBACK_MAP_PROPERTIES = [
  { slug: "the-lygon-arms", name: "The Lygon Arms", village: "Broadway", price: 245, propertyType: "inn", longitude: -1.8563, latitude: 52.0356 },
  { slug: "holly-house-bnb", name: "Holly House B&B", village: "Chipping Campden", price: 115, propertyType: "bnb", longitude: -1.7798, latitude: 52.0536 },
  { slug: "the-white-hart-winchcombe", name: "The White Hart Inn", village: "Winchcombe", price: 120, propertyType: "inn", longitude: -1.966, latitude: 51.9539 },
  { slug: "hayles-fruit-farm", name: "Hayles Fruit Farm", village: "Winchcombe", price: 15, propertyType: "campsite", longitude: -1.927, latitude: 51.968 },
  { slug: "the-painswick", name: "The Painswick", village: "Painswick", price: 220, propertyType: "hotel", longitude: -2.188, latitude: 51.788 },
  { slug: "yha-bath", name: "YHA Bath", village: "Bath", price: 35, propertyType: "hostel", longitude: -2.345, latitude: 51.38 },
];

export default async function Home() {
  let mapProperties;
  try {
    const coords = await getPropertiesWithCoordinates();
    mapProperties = (coords || []).map((p: Record<string, unknown>) => ({
      slug: p.slug as string,
      name: p.name as string,
      village: p.village as string,
      price: Math.round(Number(p.price_per_night) / 100),
      propertyType: (p.property_type as string) || "bnb",
      longitude: Number(p.longitude) || 0,
      latitude: Number(p.latitude) || 0,
    }));
  } catch {
    mapProperties = FALLBACK_MAP_PROPERTIES;
  }
  if (mapProperties.length === 0) mapProperties = FALLBACK_MAP_PROPERTIES;
  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[870px] flex items-center pt-12">
        <div className="absolute inset-0 z-0">
          <img
            alt="Cotswold landscape at golden hour"
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/70 to-transparent" />
        </div>
        <div className="container mx-auto px-8 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <h1 className="font-headline text-6xl md:text-8xl font-bold tracking-tight mb-6 leading-[0.9]">
              A Path <br />
              Through <span className="italic font-light">History</span>
            </h1>
            <p className="font-body text-xl max-w-lg mb-8 text-white/90 leading-relaxed">
              Experience the 102-mile National Trail with curated editorial
              guides, boutique stays, and seamless logistics.
            </p>
          </div>

          {/* Search Widget */}
          <div className="bg-white/95 backdrop-blur-md p-8 rounded-xl shadow-2xl max-w-md ml-auto border border-white/20">
            <h3 className="font-headline text-2xl text-primary font-bold mb-6">
              Start Your Journey
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                    Check-in
                  </label>
                  <input
                    className="bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-0 border-b-2 border-transparent focus:border-b-tertiary transition-all"
                    type="date"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                    Check-out
                  </label>
                  <input
                    className="bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-0 border-b-2 border-transparent focus:border-b-tertiary transition-all"
                    type="date"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                  Starting Point
                </label>
                <select className="bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-0 appearance-none cursor-pointer">
                  <option>Chipping Campden (North)</option>
                  <option>Bath (South)</option>
                  <option>Painswick (Mid-point)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                  Number of Walkers
                </label>
                <div className="flex items-center bg-surface-container-low rounded-lg p-1">
                  <button className="w-10 h-10 flex items-center justify-center text-primary font-bold hover:bg-surface-container-high rounded-md">
                    -
                  </button>
                  <span className="flex-1 text-center font-bold text-sm">
                    2 Walkers
                  </span>
                  <button className="w-10 h-10 flex items-center justify-center text-primary font-bold hover:bg-surface-container-high rounded-md">
                    +
                  </button>
                </div>
              </div>
              <Link
                href="/search"
                className="w-full bg-tertiary text-white py-4 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-tertiary-container transition-all flex items-center justify-center gap-2 mt-4"
              >
                Search Availability{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 px-8 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-16 items-end mb-20">
            <div className="md:w-1/2">
              <span className="text-tertiary font-bold uppercase tracking-[0.3em] text-xs mb-4 block">
                The Experience
              </span>
              <h2 className="font-headline text-5xl md:text-6xl text-primary font-bold leading-tight">
                Meticulously Planned, Naturally Lived.
              </h2>
            </div>
            <div className="md:w-1/2">
              <p className="font-body text-secondary text-lg leading-relaxed italic">
                &ldquo;We believe the best way to see the English countryside is
                on foot, but the best way to experience it is with the burden of
                logistics removed.&rdquo;
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <FeatureCard
              icon="near_me"
              bgColor="bg-primary-fixed"
              textColor="text-primary"
              title="Near-Trail Filter"
              description="Our proprietary algorithm ensures your accommodation is never more than 0.5 miles from the trailhead. No long detours after a full day's walk."
            />
            <FeatureCard
              icon="hotel"
              bgColor="bg-secondary-fixed"
              textColor="text-secondary"
              title="Every Budget Welcome"
              description="From £12 campsites and glamping pods to boutique hotels — find the right stay for your walking style, all verified near the trail."
            />
            <FeatureCard
              icon="event_available"
              bgColor="bg-tertiary-fixed"
              textColor="text-tertiary"
              title="Real-Time Sync"
              description="Unlike manual booking services, our platform links directly with B&B calendars for instant confirmation on the most popular trail dates."
            />
          </div>
        </div>
      </section>

      {/* Signature Itineraries */}
      <section className="py-24 px-8 bg-surface-container-low">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <h2 className="font-headline text-5xl text-primary font-bold mb-4">
              Signature Itineraries
            </h2>
            <p className="text-secondary max-w-2xl mx-auto">
              Curated routes designed by local walkers to capture the very best
              of the Wolds.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[600px]">
            {/* Main Card */}
            <Link href="/itinerary" className="md:col-span-8 group relative rounded-2xl overflow-hidden cursor-pointer shadow-lg min-h-[400px]">
              <img
                alt="Misty Cotswold valley"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 text-white">
                <span className="bg-tertiary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">
                  Most Popular
                </span>
                <h3 className="font-headline text-4xl font-bold mb-2">
                  7-Day Classic
                </h3>
                <p className="text-white/80 max-w-md mb-6">
                  Chipping Campden to Bath. The definitive experience of
                  honey-stone villages and rolling escarpments.
                </p>
                <div className="flex gap-6">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <span className="material-symbols-outlined text-sm">
                      distance
                    </span>{" "}
                    102 Miles
                  </span>
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <span className="material-symbols-outlined text-sm">
                      altitude
                    </span>{" "}
                    2,500m Gain
                  </span>
                </div>
              </div>
            </Link>
            {/* Side Cards */}
            <div className="md:col-span-4 grid grid-rows-2 gap-6">
              <Link href="/itinerary" className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-md bg-white p-8 border border-outline-variant/10">
                <div className="relative z-10">
                  <h3 className="font-headline text-2xl font-bold text-primary mb-2">
                    The Weekend Explorer
                  </h3>
                  <p className="text-secondary text-sm mb-6">
                    A focused 3-day loop around the charming hills of Broadway
                    and Stanton.
                  </p>
                  <span className="text-tertiary font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    View Details{" "}
                    <span className="material-symbols-outlined text-sm">
                      north_east
                    </span>
                  </span>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-9xl">
                    weekend
                  </span>
                </div>
              </Link>
              <Link href="/itinerary" className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-md min-h-[200px]">
                <img
                  alt="Forest path in the Cotswolds"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80"
                />
                <div className="absolute inset-0 bg-primary/40 group-hover:bg-primary/20 transition-colors" />
                <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
                  <h3 className="font-headline text-2xl font-bold mb-1">
                    8-Day Scenic
                  </h3>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                    Extended Leisure Pace
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Map Preview */}
      <section className="py-24 px-8 overflow-hidden bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative w-full aspect-square">
                <HomeMapPreview properties={mapProperties} />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-tertiary font-bold uppercase tracking-[0.3em] text-xs mb-4 block">
                Precision Logistics
              </span>
              <h2 className="font-headline text-5xl text-primary font-bold mb-6">
                Stay on Track. <br />
                Literally.
              </h2>
              <p className="font-body text-secondary text-lg leading-relaxed mb-8">
                Our interactive trail companion doesn&apos;t just show you where
                to go. It highlights verified accommodations, water points, and
                steep climbs&mdash;measured exactly from your position on the
                path.
              </p>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 font-bold text-primary text-sm uppercase tracking-wide">
                  <span className="material-symbols-outlined text-tertiary">
                    check_circle
                  </span>{" "}
                  Verified &ldquo;Near-Trail&rdquo; Stays
                </li>
                <li className="flex items-center gap-3 font-bold text-primary text-sm uppercase tracking-wide">
                  <span className="material-symbols-outlined text-tertiary">
                    check_circle
                  </span>{" "}
                  Real-time Pub &amp; Cafe Status
                </li>
                <li className="flex items-center gap-3 font-bold text-primary text-sm uppercase tracking-wide">
                  <span className="material-symbols-outlined text-tertiary">
                    check_circle
                  </span>{" "}
                  Offline-first Topo Maps
                </li>
              </ul>
              <Link
                href="/search"
                className="bg-primary text-white px-8 py-4 rounded-lg font-bold text-xs uppercase tracking-[0.2em] hover:bg-primary-container transition-all inline-block"
              >
                Explore the Live Map
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Plan with Confidence */}
      <section className="py-24 px-8 bg-surface-container-highest">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-headline text-4xl text-primary font-bold mb-12">
            Plan with Confidence
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 items-center opacity-60">
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-4xl">
                landscape
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest">
                National Trails Partner
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-4xl">
                verified
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Expert Reviewed
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-4xl">
                travel_explore
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest">
                AITO Member
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-4xl">eco</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Sustainable Trekking
              </span>
            </div>
          </div>
          <div className="mt-20 p-12 bg-white rounded-3xl relative">
            <span className="material-symbols-outlined absolute -top-6 left-1/2 -translate-x-1/2 text-5xl text-tertiary bg-white px-4">
              format_quote
            </span>
            <p className="font-headline text-2xl text-primary italic leading-relaxed mb-6">
              &ldquo;The Cotswold Way was the first trek I&apos;ve done where
              the booking was as relaxing as the walk itself. Everything was
              seamless.&rdquo;
            </p>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-high mb-4 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-secondary">
                  person
                </span>
              </div>
              <span className="font-bold text-primary text-sm uppercase tracking-widest">
                Julian Roberts
              </span>
              <span className="text-secondary text-[10px] uppercase tracking-widest">
                London, UK
              </span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function FeatureCard({
  icon,
  bgColor,
  textColor,
  title,
  description,
}: {
  icon: string;
  bgColor: string;
  textColor: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6 group">
      <div
        className={`w-14 h-14 ${bgColor} rounded-xl flex items-center justify-center ${textColor} group-hover:scale-110 transition-transform`}
      >
        <span className="material-symbols-outlined filled">{icon}</span>
      </div>
      <h4 className="font-headline text-2xl font-bold text-primary">{title}</h4>
      <p className="text-secondary leading-relaxed">{description}</p>
    </div>
  );
}
