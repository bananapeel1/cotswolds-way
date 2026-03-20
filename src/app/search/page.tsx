import Navbar from "@/components/Navbar";
import Link from "next/link";

const ACCOMMODATIONS = [
  {
    slug: "the-lygon-arms",
    name: "The Lygon Arms",
    rating: 4.9,
    distance: "0.1 miles off trail",
    distanceIcon: "navigation",
    price: 245,
    badge: "AVAILABLE",
    badgeColor: "bg-primary",
    urgency: "Only 2 rooms left for May 2026",
    urgencyColor: "text-error",
    amenities: [
      { icon: "dry_cleaning", label: "Boot dryer", active: true },
      { icon: "local_shipping", label: "Luggage partner", active: true },
      { icon: "pets", label: "Dog friendly", active: true },
    ],
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
  },
  {
    slug: "the-hikers-rest",
    name: "The Hikers Rest B&B",
    rating: 4.7,
    distance: "0.5 miles with taxi transfer",
    distanceIcon: "local_taxi",
    price: 115,
    badge: "FILLING FAST",
    badgeColor: "bg-tertiary",
    urgency: "Preferred luggage drop",
    urgencyColor: "text-tertiary",
    amenities: [
      { icon: "dry_cleaning", label: "Boot dryer", active: false },
      { icon: "local_shipping", label: "Luggage partner", active: true },
      { icon: "eco", label: "Eco certified", active: true },
    ],
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80",
  },
  {
    slug: "old-post-office-cottage",
    name: "Old Post Office Cottage",
    rating: 4.5,
    distance: "0.3 miles off trail",
    distanceIcon: "navigation",
    price: 140,
    badge: null,
    badgeColor: "",
    urgency: "Available June onwards",
    urgencyColor: "text-secondary",
    amenities: [
      { icon: "dry_cleaning", label: "Boot dryer", active: true },
      { icon: "local_shipping", label: "Luggage partner", active: false },
      { icon: "pets", label: "Dog friendly", active: true },
    ],
    image:
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=400&q=80",
  },
];

export default function SearchPage() {
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
                24 properties found
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
            {ACCOMMODATIONS.map((acc) => (
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
                  {acc.badge && (
                    <div
                      className={`absolute top-2 left-2 ${acc.badgeColor} text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm`}
                    >
                      {acc.badge}
                    </div>
                  )}
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
                          /night
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
        <section className="hidden md:block w-1/2 relative bg-surface-container-low">
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover opacity-60 mix-blend-multiply grayscale contrast-125"
              alt="Topographical map of the Cotswold countryside"
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80"
            />
            {/* Trail Path SVG */}
            <svg
              className="absolute inset-0 w-full h-full"
              fill="none"
              viewBox="0 0 800 1000"
            >
              <path
                className="drop-shadow-md"
                d="M100,900 C150,850 200,800 220,700 S300,550 400,500 S500,350 550,250 S700,150 750,50"
                fill="none"
                stroke="#541600"
                strokeDasharray="12 6"
                strokeLinecap="round"
                strokeWidth="5"
              />
            </svg>

            {/* Map Markers */}
            <div className="absolute top-[45%] left-[45%] group cursor-pointer z-10">
              <div className="bg-primary text-white p-2.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-sm filled">
                  bed
                </span>
              </div>
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-surface-container-lowest p-3 rounded-xl shadow-2xl w-40 border border-outline-variant/20">
                <p className="text-[10px] font-bold uppercase tracking-tighter text-secondary mb-1">
                  The Lygon Arms
                </p>
                <p className="text-[10px] text-primary font-bold">
                  &pound;245 &middot; 4.9 &#9733;
                </p>
              </div>
            </div>
            <div className="absolute top-[65%] left-[30%] group cursor-pointer z-10">
              <div className="bg-tertiary text-white p-2.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-sm filled">
                  bed
                </span>
              </div>
            </div>
            <div className="absolute top-[25%] left-[60%] group cursor-pointer z-10">
              <div className="bg-secondary text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-sm filled">
                  home
                </span>
              </div>
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute top-6 left-6 flex flex-col gap-2 z-20">
            <button className="bg-surface/90 backdrop-blur-md p-3 rounded-xl shadow-lg hover:bg-white transition-colors border border-outline-variant/10">
              <span className="material-symbols-outlined">add</span>
            </button>
            <button className="bg-surface/90 backdrop-blur-md p-3 rounded-xl shadow-lg hover:bg-white transition-colors border border-outline-variant/10">
              <span className="material-symbols-outlined">remove</span>
            </button>
            <button className="bg-surface/90 backdrop-blur-md p-3 rounded-xl shadow-lg hover:bg-white transition-colors border border-outline-variant/10">
              <span className="material-symbols-outlined">my_location</span>
            </button>
          </div>

          {/* Trail Info */}
          <div className="absolute bottom-6 left-6 right-6 z-20">
            <div className="bg-primary/95 text-white p-6 rounded-2xl backdrop-blur-xl shadow-2xl flex justify-between items-center border border-white/10">
              <div>
                <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-primary-container">
                  Current Active Segment
                </span>
                <h3 className="font-headline text-2xl italic">
                  Chipping Campden to Stanton
                </h3>
              </div>
              <div className="flex gap-8 text-right">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-primary-container">
                    Total Ascent
                  </p>
                  <p className="font-bold">1,240 ft</p>
                </div>
                <div>
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-primary-container">
                    Distance
                  </p>
                  <p className="font-bold">10.2 mi</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
