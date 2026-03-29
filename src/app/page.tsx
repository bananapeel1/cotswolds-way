import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import HomeMapPreview from "@/components/HomeMapPreview";
import { getPropertiesWithCoordinates } from "@/lib/queries";

export default async function Home() {
  const coords = await getPropertiesWithCoordinates();
  const mapProperties = coords.map((p) => ({
    slug: p.slug,
    name: p.name,
    village: p.village,
    price: Math.round(p.price_per_night / 100),
    propertyType: p.property_type,
    longitude: p.longitude,
    latitude: p.latitude,
  }));
  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[100svh] md:min-h-[870px] flex items-start md:items-center pt-16 pb-8 md:pt-12 md:pb-0">
        <div className="absolute inset-0 z-0">
          <img
            alt="Cotswold landscape at golden hour"
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80"
          />
          <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-primary/85 md:from-primary/70 to-primary/40 md:to-transparent" />
        </div>
        <div className="container mx-auto px-4 sm:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 items-start lg:items-center w-full">
          <div className="text-white">
            <h1 className="font-headline text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight mb-3 sm:mb-6 leading-[0.9]">
              A Path <br />
              Through History
            </h1>
            <p className="font-body text-base sm:text-xl max-w-lg mb-6 sm:mb-8 text-white/90 leading-relaxed">
              Experience the 102-mile National Trail with curated editorial
              guides, boutique stays, and seamless logistics.
            </p>
          </div>

          {/* Quick Stats + CTA */}
          <div className="bg-white/95 backdrop-blur-md p-5 sm:p-8 rounded-xl shadow-2xl w-full max-w-md lg:ml-auto border border-white/20">
            <h3 className="font-headline text-2xl text-primary font-bold mb-2">
              102 Miles of Pure England
            </h3>
            <p className="text-secondary text-sm mb-6">
              From Chipping Campden to Bath through honey-stone villages, ancient woodlands, and sweeping escarpments.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-surface-container-low rounded-lg">
                <span className="material-symbols-outlined text-tertiary mb-1 block">distance</span>
                <span className="text-xl font-bold text-primary block">102</span>
                <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">Miles</span>
              </div>
              <div className="text-center p-3 bg-surface-container-low rounded-lg">
                <span className="material-symbols-outlined text-tertiary mb-1 block">hotel</span>
                <span className="text-xl font-bold text-primary block">{coords.length}</span>
                <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">Stays</span>
              </div>
              <div className="text-center p-3 bg-surface-container-low rounded-lg">
                <span className="material-symbols-outlined text-tertiary mb-1 block">schedule</span>
                <span className="text-xl font-bold text-primary block">7-14</span>
                <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">Days</span>
              </div>
            </div>
            <Link
              href="/plan"
              className="w-full bg-primary text-white py-3 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-primary-container transition-all flex items-center justify-center gap-2"
            >
              Plan Your Itinerary
              <span className="material-symbols-outlined text-sm">route</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 bg-surface">
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
      <section className="py-16 sm:py-24 px-4 sm:px-8 bg-surface-container-low">
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
            <Link href="/plan" className="md:col-span-8 group relative rounded-2xl overflow-hidden cursor-pointer shadow-lg min-h-[400px]">
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
              <Link href="/plan" className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-md bg-white p-8 border border-outline-variant/10">
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
              <Link href="/plan" className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-md min-h-[200px]">
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
      <section className="py-16 sm:py-24 px-4 sm:px-8 overflow-hidden bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative w-full h-[400px] sm:h-[500px] lg:aspect-square lg:h-auto">
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
      <section className="py-16 sm:py-24 px-4 sm:px-8 bg-surface-container-highest">
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
              &ldquo;The Cotswolds Way was the first trek I&apos;ve done where
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
