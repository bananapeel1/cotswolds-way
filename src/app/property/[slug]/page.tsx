import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AMENITIES = [
  { icon: "heat_pump", title: "Boot Dryers", desc: "Industrial strength boot room" },
  { icon: "local_laundry_service", title: "Laundry Service", desc: "Overnight wash & dry" },
  { icon: "lunch_dining", title: "Packed Lunches", desc: "Cotswold deli selections" },
  { icon: "medical_services", title: "Blister Care", desc: "Full first-aid kits available" },
  { icon: "local_taxi", title: "Trail Transfer", desc: "Private shuttle within 5mi" },
  { icon: "wifi", title: "Giga-WiFi", desc: "Download maps in seconds" },
];

export default function PropertyPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-8 pt-12 pb-24">
        {/* Header */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <nav className="flex items-center gap-2 text-secondary mb-4 text-sm font-medium">
                <span>Accommodations</span>
                <span className="material-symbols-outlined text-xs">
                  chevron_right
                </span>
                <span>Chipping Campden</span>
              </nav>
              <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary tracking-tight leading-none mb-4">
                The Rambler&apos;s Rest
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1 text-tertiary">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className="material-symbols-outlined filled">
                      star
                    </span>
                  ))}
                  <span className="material-symbols-outlined filled">
                    star_half
                  </span>
                  <span className="ml-1 font-bold text-on-background">
                    4.9
                  </span>
                  <span className="text-secondary font-normal">
                    (128 reviews)
                  </span>
                </div>
                <div className="w-1 h-1 rounded-full bg-outline-variant" />
                <div className="flex items-center gap-1 font-semibold text-primary">
                  <span className="material-symbols-outlined">
                    location_on
                  </span>
                  Chipping Campden, GL55
                </div>
                <div className="w-1 h-1 rounded-full bg-outline-variant" />
                <div className="bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  End of Day 1
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Gallery */}
        <section className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-[600px] mb-16">
          <div className="md:col-span-2 md:row-span-2 relative overflow-hidden rounded-xl group">
            <img
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt="Boutique B&B exterior"
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
          <div className="relative overflow-hidden rounded-xl group">
            <img
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt="Cozy bedroom"
              src="https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80"
            />
          </div>
          <div className="relative overflow-hidden rounded-xl group">
            <img
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt="Breakfast room"
              src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80"
            />
          </div>
          <div className="md:col-span-2 relative overflow-hidden rounded-xl group">
            <img
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt="Lounge with fireplace"
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80"
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
                A Sanctuary for the Discerning Walker
              </h2>
              <div className="prose prose-stone max-w-none text-on-surface-variant leading-relaxed space-y-4">
                <p className="text-lg">
                  Nestled just 200 yards from the northern trailhead of the
                  Cotswold Way, The Rambler&apos;s Rest is a Grade II listed
                  boutique inn tailored specifically for long-distance hikers. We
                  combine 17th-century heritage with modern walker essentials.
                </p>
                <p>
                  Our philosophy is simple: high-end comfort shouldn&apos;t
                  sacrifice functionality. From our custom-built drying room to
                  our locally-sourced &lsquo;Trailblazer&rsquo; breakfast
                  hampers, every detail is designed to prepare you for the
                  102-mile journey ahead.
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
                      <span className="font-bold text-primary">0.1 Miles</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg">
                      <span className="text-secondary font-medium">
                        Luggage Partner
                      </span>
                      <span className="font-bold text-primary">
                        Sherpa Van Official
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant italic border-l-2 border-tertiary pl-4">
                    &ldquo;We are an official drop-off point for all major
                    Cotswold Way luggage transfer services. Simply leave your
                    bags at reception by 9:00 AM.&rdquo;
                  </p>
                </div>
                <div className="flex-1 min-h-[250px] rounded-xl overflow-hidden bg-surface-container-high border border-outline-variant/20">
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 relative">
                    <img
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                      alt="Map of Chipping Campden"
                      src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=80"
                    />
                    <div className="relative z-10">
                      <span className="material-symbols-outlined text-4xl text-primary mb-2">
                        map
                      </span>
                      <p className="font-bold text-primary">
                        View Interactive Map
                      </p>
                      <p className="text-xs text-secondary">
                        Route to Trailhead: 2 min walk
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Amenities */}
            <section>
              <h2 className="font-headline text-3xl font-bold text-primary mb-8">
                Walker-First Amenities
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {AMENITIES.map((a) => (
                  <div key={a.icon} className="flex items-start gap-4">
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
                <button className="text-tertiary font-bold hover:underline">
                  View all 128 reviews
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    stars: 5,
                    title: "Perfect end to Day 1",
                    body: "The boot room was a lifesaver after a muddy stretch. The breakfast was hearty enough to fuel my walk to Broadway.",
                    initials: "JD",
                    name: "James D.",
                    date: "Walked May 2024",
                  },
                  {
                    stars: 5,
                    title: "True Walker Focus",
                    body: "They understood our logistics perfectly. Luggage was waiting in the room, and the laundry service was efficient.",
                    initials: "SR",
                    name: "Sarah R.",
                    date: "Walked June 2024",
                  },
                ].map((review) => (
                  <div
                    key={review.initials}
                    className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm"
                  >
                    <div className="flex items-center gap-1 text-tertiary mb-3">
                      {Array.from({ length: review.stars }).map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-sm filled"
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <p className="font-bold text-primary mb-2">
                      &ldquo;{review.title}&rdquo;
                    </p>
                    <p className="text-on-surface-variant text-sm mb-4">
                      &ldquo;{review.body}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-xs font-bold text-on-secondary-fixed">
                        {review.initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary">
                          {review.name}
                        </p>
                        <p className="text-[10px] text-secondary">
                          {review.date}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Booking Widget */}
          <aside className="lg:col-span-4">
            <div className="sticky top-32">
              <div className="bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(28,28,25,0.1)] p-8 border border-outline-variant/20">
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-bold text-primary">
                    &pound;145
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
                        12 May 2025
                      </span>
                    </div>
                    <div className="p-3 hover:bg-surface-container-low transition-colors cursor-pointer">
                      <label className="block text-[10px] uppercase font-bold text-secondary tracking-wider mb-1">
                        Check-out
                      </label>
                      <span className="text-sm font-semibold">
                        13 May 2025
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
                  <div className="p-3 border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer">
                    <label className="block text-[10px] uppercase font-bold text-secondary tracking-wider mb-1">
                      Room Type
                    </label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        King Ensuite (Garden View)
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
                      &pound;145 x 1 night
                    </span>
                    <span className="font-bold">&pound;145</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">
                      Walker&apos;s Packed Lunch (x2)
                    </span>
                    <span className="font-bold">&pound;24</span>
                  </div>
                  <div className="pt-3 border-t border-outline-variant/30 flex justify-between">
                    <span className="font-bold text-primary">Total</span>
                    <span className="font-bold text-primary">&pound;169</span>
                  </div>
                </div>
                <button className="w-full bg-tertiary text-on-tertiary py-4 rounded-xl font-bold text-lg hover:bg-tertiary-container shadow-lg shadow-tertiary/20 active:scale-[0.98] transition-all mb-4">
                  Reserve Room
                </button>
                <p className="text-center text-xs text-secondary">
                  You won&apos;t be charged yet
                </p>
                <div className="mt-8 pt-8 border-t border-outline-variant/30">
                  <h4 className="font-bold text-primary mb-4 text-sm">
                    Transfer Services
                  </h4>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary">
                        local_shipping
                      </span>
                      <span className="text-xs text-on-surface-variant font-medium">
                        Luggage Pickup Arranged
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-primary text-sm filled">
                      check_circle
                    </span>
                  </div>
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
                    Edward, 5th Gen Resident
                  </p>
                </div>
                <button className="ml-auto p-2 text-secondary hover:text-primary">
                  <span className="material-symbols-outlined">
                    chat_bubble
                  </span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
