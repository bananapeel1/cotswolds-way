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

      {/* Hero Section — full bleed, centered */}
      <section className="relative min-h-[100svh] md:min-h-[700px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img
            alt="Cotswold landscape at golden hour"
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 text-center text-white py-24">
          <p className="font-label text-[10px] font-bold uppercase tracking-[2px] mb-6 text-white/80">
            The Cotswold Way National Trail
          </p>
          <h1 className="font-headline text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tight mb-6 leading-[0.95]">
            Walk the trail.<br />
            Stay on track.
          </h1>
          <p className="font-body text-lg sm:text-xl max-w-2xl mx-auto mb-10 text-white/85 leading-relaxed">
            Find verified near-trail accommodation, plan your itinerary,
            and walk 102 miles from Chipping Campden to Bath.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/search"
              className="bg-primary text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-primary-container transition-all inline-flex items-center justify-center gap-2"
            >
              Start Exploring
            </Link>
            <Link
              href="/itinerary"
              className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-white/30 transition-all inline-flex items-center justify-center gap-2 border border-white/20"
            >
              Plan an Itinerary
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-surface py-10 border-b border-outline-variant/10">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-6 sm:px-8">
          <StatItem number="102" label="Trail Length" unit="Miles" />
          <StatItem number={String(coords.length)} label="Verified" unit="Stays" />
          <StatItem number="7–14" label="Walking" unit="Days" />
          <StatItem number="2,500m" label="Total" unit="Elevation" />
        </div>
      </section>

      {/* Features — TrailTap 3-column, last dark */}
      <section className="py-20 sm:py-28 px-6 sm:px-8 bg-surface">
        <div className="max-w-6xl mx-auto">
          <p className="font-label text-[10px] font-bold uppercase tracking-[2px] text-primary mb-4">
            How it works
          </p>
          <h2 className="font-headline text-4xl md:text-5xl text-primary font-extrabold leading-tight mb-16">
            Your guide to the<br />Cotswold Way.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container-low rounded-3xl p-8 relative overflow-hidden">
              <div className="w-14 h-14 bg-primary-fixed rounded-2xl flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined filled">near_me</span>
              </div>
              <h4 className="font-headline text-xl font-bold text-primary mb-3">Find Near-Trail Stays</h4>
              <p className="text-secondary leading-relaxed text-sm">
                Every accommodation is verified within walking distance of the trail. No long detours after a full day on your feet.
              </p>
              <span className="absolute -bottom-6 -right-2 text-[120px] font-extrabold text-primary/[0.04] leading-none font-headline">1</span>
            </div>
            <div className="bg-surface-container-low rounded-3xl p-8 relative overflow-hidden">
              <div className="w-14 h-14 bg-secondary-fixed rounded-2xl flex items-center justify-center text-secondary mb-6">
                <span className="material-symbols-outlined filled">route</span>
              </div>
              <h4 className="font-headline text-xl font-bold text-primary mb-3">Plan Your Route</h4>
              <p className="text-secondary leading-relaxed text-sm">
                Choose from curated itineraries or build your own. 7, 10, or 14 days — we have templates for every pace.
              </p>
              <span className="absolute -bottom-6 -right-2 text-[120px] font-extrabold text-primary/[0.04] leading-none font-headline">2</span>
            </div>
            <div className="bg-primary rounded-3xl p-8 relative overflow-hidden">
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center text-white mb-6">
                <span className="material-symbols-outlined filled">hiking</span>
              </div>
              <h4 className="font-headline text-xl font-bold text-white mb-3">Walk with Confidence</h4>
              <p className="text-white/70 leading-relaxed text-sm">
                Book directly with each property. Know where you&apos;re sleeping, what&apos;s ahead, and enjoy every mile.
              </p>
              <span className="absolute -bottom-6 -right-2 text-[120px] font-extrabold text-white/[0.06] leading-none font-headline">3</span>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Itineraries */}
      <section className="py-20 sm:py-28 px-6 sm:px-8 bg-surface-container-low">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 text-center">
            <p className="font-label text-[10px] font-bold uppercase tracking-[2px] text-primary mb-4">
              Curated routes
            </p>
            <h2 className="font-headline text-4xl md:text-5xl text-primary font-extrabold mb-4">
              Signature Itineraries
            </h2>
            <p className="text-secondary max-w-2xl mx-auto">
              Designed by local walkers to capture the very best of the Cotswolds.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[500px]">
            <Link href="/itinerary" className="md:col-span-8 group relative rounded-3xl overflow-hidden cursor-pointer min-h-[350px]">
              <img
                alt="Misty Cotswold valley"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 text-white">
                <span className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block">
                  Most Popular
                </span>
                <h3 className="font-headline text-3xl font-extrabold mb-2">
                  7-Day Classic
                </h3>
                <p className="text-white/80 max-w-md text-sm">
                  Chipping Campden to Bath. The definitive end-to-end experience.
                </p>
              </div>
            </Link>
            <div className="md:col-span-4 grid grid-rows-2 gap-6">
              <Link href="/itinerary" className="group relative rounded-3xl overflow-hidden cursor-pointer bg-surface-container-lowest p-8 border border-outline-variant/10">
                <h3 className="font-headline text-xl font-bold text-primary mb-2">
                  Weekend Explorer
                </h3>
                <p className="text-secondary text-sm mb-4">
                  A 3-day loop around Broadway and Stanton.
                </p>
                <span className="text-primary font-bold text-sm flex items-center gap-1">
                  View Details
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </Link>
              <Link href="/itinerary" className="group relative rounded-3xl overflow-hidden cursor-pointer min-h-[200px]">
                <img
                  alt="Forest path"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                  <h3 className="font-headline text-xl font-bold mb-1">
                    10-Day Standard
                  </h3>
                  <p className="text-xs text-white/80">
                    A relaxed pace with time to explore
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Map Preview */}
      <section className="py-20 sm:py-28 px-6 sm:px-8 overflow-hidden bg-surface">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative w-full h-[400px] sm:h-[500px] lg:aspect-square lg:h-auto rounded-3xl overflow-hidden">
                <HomeMapPreview properties={mapProperties} />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="font-label text-[10px] font-bold uppercase tracking-[2px] text-primary mb-4">
                Interactive Map
              </p>
              <h2 className="font-headline text-4xl md:text-5xl text-primary font-extrabold mb-6 leading-tight">
                Every stay,<br />on the trail.
              </h2>
              <p className="font-body text-secondary text-lg leading-relaxed mb-8">
                See all {coords.length} verified accommodations plotted directly on the trail map. Filter by day, type, and amenities to find your perfect stops.
              </p>
              <Link
                href="/search"
                className="bg-primary text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-primary-container transition-all inline-flex items-center gap-2"
              >
                Explore the Map
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 sm:py-28 px-6 sm:px-8 bg-surface-container-low">
        <div className="max-w-3xl mx-auto text-center">
          <span className="material-symbols-outlined text-4xl text-primary/20 mb-6 block">format_quote</span>
          <p className="font-headline text-2xl md:text-3xl text-primary font-bold leading-relaxed mb-8">
            &ldquo;The first trek where the booking was as relaxing as the walk itself. Everything was seamless.&rdquo;
          </p>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-surface-container-high mb-3 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-secondary">person</span>
            </div>
            <span className="font-bold text-primary text-sm">Julian Roberts</span>
            <span className="text-secondary text-xs">London, UK</span>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function StatItem({ number, label, unit }: { number: string; label: string; unit: string }) {
  return (
    <div className="text-center">
      <p className="font-label text-[10px] font-bold uppercase tracking-[1px] text-secondary mb-1">{label}</p>
      <p className="font-headline text-3xl md:text-4xl font-extrabold text-primary leading-none">
        {number} <span className="text-base font-bold text-secondary">{unit}</span>
      </p>
    </div>
  );
}
