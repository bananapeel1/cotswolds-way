import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

const SEGMENTS = [
  { name: "Chipping Campden to Broadway", miles: 6.2, ascent: "250m", terrain: "Rolling fields, Broadway Tower descent" },
  { name: "Broadway to Winchcombe", miles: 12.5, ascent: "420m", terrain: "Woodland paths, Belas Knap long barrow" },
  { name: "Winchcombe to Cleeve Hill", miles: 5.8, ascent: "380m", terrain: "Steep ascent to highest point (330m)" },
  { name: "Cleeve Hill to Dowdeswell", miles: 6.0, ascent: "180m", terrain: "Open grassland, reservoir views" },
  { name: "Dowdeswell to Leckhampton Hill", miles: 5.5, ascent: "290m", terrain: "Escarpment edge, Devil's Chimney" },
  { name: "Leckhampton Hill to Birdlip", miles: 5.0, ascent: "200m", terrain: "Beech woodland, Crickley Hill" },
  { name: "Birdlip to Painswick", miles: 7.8, ascent: "310m", terrain: "Cooper's Hill, Prinknash Abbey views" },
  { name: "Painswick to Middleyard", miles: 8.2, ascent: "270m", terrain: "Painswick Beacon, Standish Wood" },
  { name: "Middleyard to Dursley", miles: 7.5, ascent: "340m", terrain: "Coaley Peak, Cam Long Down" },
  { name: "Dursley to Wotton-under-Edge", miles: 6.8, ascent: "280m", terrain: "Stinchcombe Hill, North Nibley" },
  { name: "Wotton-under-Edge to Hawkesbury Upton", miles: 9.5, ascent: "350m", terrain: "Somerset Monument, Horton Court" },
  { name: "Hawkesbury Upton to Cold Ashton", miles: 10.0, ascent: "260m", terrain: "Dyrham Park, rolling farmland" },
  { name: "Cold Ashton to Bath", miles: 11.2, ascent: "150m", terrain: "Lansdown battlefield, final descent into Bath" },
];

export default function MapsPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Official Trail Maps
          </h1>
          <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
            Navigate 102 miles of England&apos;s finest escarpment with detailed segment maps, GPX downloads, and offline guidance.
          </p>
        </div>
      </section>

      {/* Route Segments */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-3">The Complete Route</h2>
          <p className="font-body text-secondary mb-10 max-w-2xl">
            The Cotswolds Way runs from Chipping Campden in the north to Bath in the south. Below are the 13 main segments with distance, elevation, and terrain notes.
          </p>

          <div className="space-y-4">
            {SEGMENTS.map((seg, i) => (
              <div
                key={i}
                className="bg-surface-container-low rounded-xl p-6 shadow-[0_4px_24px_rgba(28,28,25,0.05)] flex flex-col md:flex-row md:items-center gap-4"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-label text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-headline text-lg font-semibold text-primary">{seg.name}</h3>
                  <p className="font-body text-secondary text-sm mt-1">{seg.terrain}</p>
                </div>
                <div className="flex items-center gap-6 text-sm font-body">
                  <div className="flex items-center gap-1.5 text-secondary">
                    <span className="material-symbols-outlined text-lg">straighten</span>
                    {seg.miles} mi
                  </div>
                  <div className="flex items-center gap-1.5 text-secondary">
                    <span className="material-symbols-outlined text-lg">trending_up</span>
                    {seg.ascent}
                  </div>
                  <div className="flex items-center gap-1.5 text-tertiary font-semibold">
                    <span className="material-symbols-outlined text-lg">download</span>
                    GPX
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="font-body text-secondary text-sm mb-2">
              Total distance: 102 miles (164 km) &middot; Total ascent: approx. 3,660m
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Map Tip */}
      <section className="py-16 px-8 bg-surface-container-low">
        <div className="max-w-4xl mx-auto text-center">
          <span className="material-symbols-outlined text-5xl text-tertiary mb-4">map</span>
          <h2 className="font-headline text-3xl font-bold text-primary mb-4">Explore the Interactive Map</h2>
          <p className="font-body text-secondary max-w-xl mx-auto mb-8 leading-relaxed">
            Our full interactive map shows every accommodation along the trail, with filters for property type, price, and availability. Pan, zoom, and plan your stops visually.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 bg-tertiary text-on-tertiary px-8 py-3 rounded-lg font-label text-sm font-bold uppercase tracking-widest hover:bg-tertiary-container transition-all"
          >
            <span className="material-symbols-outlined text-lg">explore</span>
            Open Map Search
          </Link>
        </div>
      </section>

      {/* Offline Maps */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8">Using Maps Offline</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
              <span className="material-symbols-outlined text-3xl text-tertiary mb-4">download</span>
              <h3 className="font-headline text-xl font-semibold text-primary mb-3">Download GPX Files</h3>
              <p className="font-body text-secondary text-sm leading-relaxed">
                Download individual segment GPX files or the complete route. Import into any GPS app before you set off to ensure offline access.
              </p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
              <span className="material-symbols-outlined text-3xl text-tertiary mb-4">smartphone</span>
              <h3 className="font-headline text-xl font-semibold text-primary mb-3">Recommended Apps</h3>
              <p className="font-body text-secondary text-sm leading-relaxed">
                We recommend OS Maps, AllTrails, or Komoot for offline navigation. All support GPX import and provide turn-by-turn guidance even without mobile signal.
              </p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
              <span className="material-symbols-outlined text-3xl text-tertiary mb-4">print</span>
              <h3 className="font-headline text-xl font-semibold text-primary mb-3">Paper Maps</h3>
              <p className="font-body text-secondary text-sm leading-relaxed">
                The official OS Explorer maps OL45 and 167&ndash;179 cover the entire route. Carry these as a backup&mdash;digital devices can fail in wet weather.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Equipment */}
      <section className="py-20 px-8 bg-surface-container-low">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8">Navigation Equipment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: "explore", title: "Compass", desc: "A reliable baseplate compass is essential. The trail is well-waymarked with the acorn symbol, but fog can obscure signs on the higher sections near Cleeve Hill." },
              { icon: "battery_charging_full", title: "Power Bank", desc: "Carry a 10,000mAh+ power bank. GPS navigation drains batteries quickly, and some stretches between villages can take 6-8 hours with limited charging options." },
              { icon: "menu_book", title: "Guidebook", desc: "Trailblazer's Cotswold Way guidebook includes 1:20,000 walking maps and detailed route descriptions. The Cicerone guide is another excellent option." },
              { icon: "watch", title: "GPS Watch", desc: "A GPS watch with barometric altimeter helps track progress and warns of weather changes. Useful for timing your arrival at accommodation." },
            ].map((item) => (
              <div key={item.title} className="flex gap-5">
                <span className="material-symbols-outlined text-3xl text-tertiary shrink-0">{item.icon}</span>
                <div>
                  <h3 className="font-headline text-lg font-semibold text-primary mb-1">{item.title}</h3>
                  <p className="font-body text-secondary text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
