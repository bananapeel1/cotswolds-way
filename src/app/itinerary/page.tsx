import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TEMPLATES = [
  {
    title: "North to South",
    days: "7 Days",
    miles: "102 Miles",
    description:
      "The classic path from Chipping Campden to Bath. A steady pace for the dedicated walker.",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
  },
  {
    title: "South to North",
    days: "8 Days",
    miles: "102 Miles",
    description:
      "A more relaxed ascent from the Roman city of Bath. Ideal for those who enjoy long lunches.",
    image:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  },
  {
    title: "Cotswold Circulars",
    days: "Custom",
    miles: "Varies",
    description:
      "Loop-based itineraries starting and ending at central trail hubs. Best for weekenders.",
    image:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
  },
];

const STOPS = [
  {
    name: "Chipping Campden",
    label: "Start of Trail",
    mile: "0.0",
    markerStyle: "bg-primary",
    markerIcon: "tour",
    borderStyle: "border-l-4 border-primary",
    hasAccommodation: true,
  },
  {
    name: "Broadway",
    label: "Staging Point",
    mile: "6.2",
    markerStyle: "bg-surface-container-highest",
    markerIcon: "radio_button_checked",
    borderStyle: "",
    hasAccommodation: false,
  },
  {
    name: "Winchcombe",
    label: "Historic Hub",
    mile: "17.6",
    markerStyle: "bg-surface-container-highest",
    markerIcon: "radio_button_checked",
    borderStyle: "",
    hasAccommodation: false,
  },
];

const CONNECTIONS = [
  { distance: "6.2 MILES", terrain: "Moderate Ascent" },
  { distance: "11.4 MILES", terrain: "Steep Escarpment" },
];

export default function ItineraryPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-8 pt-12 pb-24">
        {/* Template Selection */}
        <section className="mb-20">
          <div className="mb-10">
            <span className="font-label text-tertiary text-xs font-extrabold uppercase tracking-[0.2em] mb-2 block">
              The Curated Rambler
            </span>
            <h1 className="font-headline text-5xl md:text-6xl text-primary font-bold tracking-tight leading-tight max-w-2xl">
              Choose Your <span className="italic font-normal">Pace</span>
            </h1>
            <p className="text-secondary mt-4 max-w-xl text-lg font-body">
              Select a professional template designed by regional experts, then
              customize it to fit your unique journey.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TEMPLATES.map((tpl) => (
              <div
                key={tpl.title}
                className="group relative bg-surface-container-lowest rounded-xl overflow-hidden hover:shadow-xl transition-all duration-500 flex flex-col cursor-pointer"
              >
                <div className="h-64 overflow-hidden">
                  <img
                    alt={tpl.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    src={tpl.image}
                  />
                </div>
                <div className="p-8 flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-headline text-2xl font-bold text-primary">
                      {tpl.title}
                    </h3>
                    <span className="bg-primary-fixed text-on-primary-fixed text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">
                      {tpl.days}
                    </span>
                  </div>
                  <p className="text-secondary text-sm leading-relaxed mb-6">
                    {tpl.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-label text-xs font-bold text-secondary uppercase tracking-widest">
                      {tpl.miles}
                    </span>
                    <button className="text-tertiary font-bold text-sm flex items-center gap-2 group/btn hover:gap-3 transition-all">
                      Select Template{" "}
                      <span className="material-symbols-outlined text-sm">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline Builder */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="font-headline text-4xl text-primary font-bold mb-2">
                  Build Your Trail
                </h2>
                <p className="text-secondary font-body">
                  Drag and drop markers or search by village name.
                </p>
              </div>
              <div className="flex items-center gap-6 bg-surface-container-low px-6 py-4 rounded-xl">
                <div className="text-center">
                  <span className="block font-label text-[10px] font-bold text-secondary uppercase tracking-widest">
                    Distance Left
                  </span>
                  <span className="font-headline text-2xl font-bold text-tertiary">
                    102.0{" "}
                    <span className="text-sm font-normal">MI</span>
                  </span>
                </div>
                <div className="h-8 w-px bg-outline-variant/30" />
                <div className="text-center">
                  <span className="block font-label text-[10px] font-bold text-secondary uppercase tracking-widest">
                    Total Days
                  </span>
                  <span className="font-headline text-2xl font-bold text-primary">
                    0 <span className="text-sm font-normal">DAYS</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="relative pl-12">
              {/* Vertical line */}
              <div
                className="absolute left-4 top-0 bottom-0 w-[2px]"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, #541600 15%, #541600 85%, transparent)",
                }}
              />

              {STOPS.map((stop, i) => (
                <div key={stop.name}>
                  {/* Stop */}
                  <div className="relative mb-16">
                    <div
                      className={`absolute -left-10 top-0 w-8 h-8 rounded-full ${stop.markerStyle} border-4 border-surface flex items-center justify-center`}
                    >
                      <span
                        className={`material-symbols-outlined text-xs filled ${stop.markerStyle === "bg-primary" ? "text-on-primary" : "text-secondary"}`}
                      >
                        {stop.markerIcon}
                      </span>
                    </div>
                    <div
                      className={`bg-surface-container-low p-8 rounded-xl shadow-sm ${stop.borderStyle}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="font-label text-xs font-bold text-tertiary uppercase tracking-widest block mb-1">
                            {stop.label}
                          </span>
                          <h4 className="font-headline text-2xl font-bold text-primary">
                            {stop.name}
                          </h4>
                        </div>
                        <span className="text-secondary font-label text-xs font-bold">
                          MILE {stop.mile}
                        </span>
                      </div>
                      {stop.hasAccommodation ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                          <div className="bg-surface-container-lowest p-4 rounded-lg flex items-center gap-4 cursor-pointer hover:bg-secondary-container transition-colors group">
                            <div className="bg-surface-container-low w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                              <span className="material-symbols-outlined text-secondary">
                                bed
                              </span>
                            </div>
                            <div>
                              <span className="block font-bold text-sm text-primary">
                                Add Accommodation
                              </span>
                              <span className="text-xs text-secondary italic">
                                Required for Night 1
                              </span>
                            </div>
                          </div>
                          <div className="bg-surface-container-lowest p-4 rounded-lg flex items-center gap-4 border border-dashed border-outline-variant opacity-50">
                            <div className="bg-surface-container-low w-12 h-12 rounded-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-secondary">
                                restaurant
                              </span>
                            </div>
                            <div>
                              <span className="block font-bold text-sm text-primary">
                                Add Dinner Plan
                              </span>
                              <span className="text-xs text-secondary italic">
                                Optional
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <div className="relative">
                            <input
                              className="w-full bg-surface-container-lowest border-none rounded-lg py-4 pl-12 pr-4 focus:ring-2 focus:ring-tertiary/20 text-sm font-body"
                              placeholder={`Search for stays in ${stop.name}...`}
                              type="text"
                            />
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">
                              search
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Connection */}
                  {i < CONNECTIONS.length && (
                    <div className="relative py-4 mb-8 flex items-center justify-center">
                      <div className="bg-surface-container-highest px-4 py-2 rounded-full flex items-center gap-4">
                        <span className="material-symbols-outlined text-secondary text-sm">
                          terrain
                        </span>
                        <span className="font-label text-[10px] font-bold text-secondary uppercase tracking-widest">
                          {CONNECTIONS[i].distance} &bull;{" "}
                          {CONNECTIONS[i].terrain}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Remaining Trail */}
              <div className="relative py-12 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-secondary">
                    more_vert
                  </span>
                </div>
                <p className="font-headline text-xl text-secondary italic">
                  84.4 miles remaining to the city of Bath
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 sticky top-24">
            <div className="bg-primary p-8 rounded-2xl text-on-primary shadow-xl">
              <h3 className="font-headline text-2xl font-bold mb-6">
                Trek Summary
              </h3>
              <div className="space-y-6 mb-8">
                <div className="flex justify-between items-center">
                  <span className="font-label text-xs uppercase tracking-widest opacity-80">
                    Accommodation Cost
                  </span>
                  <span className="font-headline text-xl font-bold">
                    &pound;0.00
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-label text-xs uppercase tracking-widest opacity-80">
                    Nights Booked
                  </span>
                  <span className="font-headline text-xl font-bold">
                    0 / 7
                  </span>
                </div>
                <div className="pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-tertiary-fixed">
                        local_shipping
                      </span>
                      <div>
                        <span className="block font-bold text-sm">
                          Luggage Transfer
                        </span>
                        <span className="text-[10px] opacity-70">
                          Daily pick-up &amp; drop-off
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-5 bg-white/20 rounded-full relative transition-colors group-hover:bg-white/30">
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 p-6 rounded-xl mb-8">
                <div className="flex items-start gap-4 mb-4">
                  <span className="material-symbols-outlined text-tertiary-fixed text-sm">
                    info
                  </span>
                  <p className="text-xs opacity-70 leading-relaxed">
                    Booking through The Cotswold Way experience includes GPS
                    trail maps and 24/7 support.
                  </p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                  <span className="font-label text-xs font-bold uppercase tracking-widest">
                    Est. Total
                  </span>
                  <span className="font-headline text-3xl font-bold">
                    &pound;0.00
                  </span>
                </div>
              </div>
              <button className="w-full bg-tertiary text-white py-4 rounded-xl font-bold uppercase tracking-[0.15em] text-sm hover:bg-tertiary-container transition-all active:scale-95 shadow-lg">
                Finalize Trip
              </button>
              <p className="text-center text-[10px] opacity-50 uppercase tracking-widest mt-4">
                Save for later
              </p>
            </div>

            {/* Trail Intelligence */}
            <div className="mt-8 bg-surface-container-low p-6 rounded-2xl">
              <h4 className="font-headline text-lg font-bold text-primary mb-4">
                Trail Intelligence
              </h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm">
                      cloud
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-primary">
                      Weather Window
                    </span>
                    <span className="text-[10px] text-secondary">
                      Light rain predicted &bull; May 14
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm">
                      gpp_maybe
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-primary">
                      Safety Alert
                    </span>
                    <span className="text-[10px] text-secondary">
                      Diversion at Cleeve Hill
                    </span>
                  </div>
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
