import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getItineraryTemplates, getTrailSegments } from "@/lib/queries";

const FALLBACK_TEMPLATES = [
  {
    id: "1",
    name: "7-Day Classic",
    slug: "north-to-south-7",
    description: "The definitive Cotswold Way experience from Chipping Campden to Bath. A steady pace for the dedicated walker.",
    total_days: 7,
    total_miles: 102.0,
    direction: "north_to_south",
    image_url: null,
    itinerary_stops: [
      { day_number: 1, village: "Chipping Campden", label: "Start of Trail", mile_marker: 0.0 },
      { day_number: 1, village: "Broadway", label: "End of Day 1", mile_marker: 6.2 },
      { day_number: 2, village: "Winchcombe", label: "End of Day 2", mile_marker: 17.6 },
    ],
  },
  {
    id: "2",
    name: "8-Day Scenic",
    slug: "north-to-south-8",
    description: "A more relaxed pace with shorter days, allowing time to explore villages and detours along the way.",
    total_days: 8,
    total_miles: 102.0,
    direction: "north_to_south",
    image_url: null,
    itinerary_stops: [],
  },
  {
    id: "3",
    name: "Weekend Explorer",
    slug: "broadway-circular",
    description: "A focused 3-day loop around the charming hills of Broadway and Stanton. Perfect for a weekend escape.",
    total_days: 3,
    total_miles: 24.0,
    direction: "circular",
    image_url: null,
    itinerary_stops: [],
  },
];

const FALLBACK_SEGMENTS = [
  { name: "Chipping Campden to Broadway", start_village: "Chipping Campden", end_village: "Broadway", distance_miles: 6.2, elevation_gain_ft: 850, difficulty: "moderate", day_number: 1 },
  { name: "Broadway to Winchcombe", start_village: "Broadway", end_village: "Winchcombe", distance_miles: 11.4, elevation_gain_ft: 1240, difficulty: "strenuous", day_number: 2 },
];

const TEMPLATE_IMAGES = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
];

function formatDirection(dir: string) {
  if (dir === "north_to_south") return "North to South";
  if (dir === "south_to_north") return "South to North";
  if (dir === "circular") return "Circular";
  return dir;
}

export default async function ItineraryPage() {
  let templates;
  let segments;
  try {
    templates = await getItineraryTemplates();
    segments = await getTrailSegments();
  } catch {
    templates = FALLBACK_TEMPLATES;
    segments = FALLBACK_SEGMENTS;
  }
  if (!templates || templates.length === 0) templates = FALLBACK_TEMPLATES;
  if (!segments || segments.length === 0) segments = FALLBACK_SEGMENTS;

  // Use the template with the most stops for the timeline (7-Day Classic)
  const activeTemplate = templates.reduce(
    (best: Record<string, unknown>, t: Record<string, unknown>) =>
      ((t.itinerary_stops as unknown[]) || []).length > ((best.itinerary_stops as unknown[]) || []).length ? t : best,
    templates[0]
  );
  const stops = (activeTemplate.itinerary_stops || []).sort(
    (a: Record<string, unknown>, b: Record<string, unknown>) =>
      Number(a.mile_marker) - Number(b.mile_marker)
  );

  // Build connections between consecutive stops from trail segments
  const connections: { distance: string; terrain: string }[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const seg = segments.find(
      (s: Record<string, unknown>) =>
        s.start_village === stops[i].village || s.end_village === stops[i + 1].village
    );
    if (seg) {
      connections.push({
        distance: `${seg.distance_miles} MILES`,
        terrain: seg.difficulty === "strenuous" ? "Steep Escarpment" : seg.difficulty === "easy" ? "Gentle Walk" : "Moderate Ascent",
      });
    } else {
      const dist = (Number(stops[i + 1].mile_marker) - Number(stops[i].mile_marker)).toFixed(1);
      connections.push({ distance: `${dist} MILES`, terrain: "Walking" });
    }
  }

  const totalMiles = Number(activeTemplate.total_miles) || 102;
  const lastMile = stops.length > 0 ? Number(stops[stops.length - 1].mile_marker) : 0;
  const remaining = (totalMiles - lastMile).toFixed(1);

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
            {templates.map((tpl: Record<string, unknown>, idx: number) => (
              <div
                key={tpl.id as string}
                className="group relative bg-surface-container-lowest rounded-xl overflow-hidden hover:shadow-xl transition-all duration-500 flex flex-col cursor-pointer"
              >
                <div className="h-64 overflow-hidden">
                  <img
                    alt={tpl.name as string}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    src={(tpl.image_url as string) || TEMPLATE_IMAGES[idx % TEMPLATE_IMAGES.length]}
                  />
                </div>
                <div className="p-8 flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-headline text-2xl font-bold text-primary">
                      {tpl.name as string}
                    </h3>
                    <span className="bg-primary-fixed text-on-primary-fixed text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">
                      {tpl.total_days as number} Days
                    </span>
                  </div>
                  <p className="text-secondary text-sm leading-relaxed mb-6">
                    {tpl.description as string}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-label text-xs font-bold text-secondary uppercase tracking-widest">
                      {tpl.total_miles as number} Miles · {formatDirection(tpl.direction as string)}
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
                    {remaining}{" "}
                    <span className="text-sm font-normal">MI</span>
                  </span>
                </div>
                <div className="h-8 w-px bg-outline-variant/30" />
                <div className="text-center">
                  <span className="block font-label text-[10px] font-bold text-secondary uppercase tracking-widest">
                    Total Days
                  </span>
                  <span className="font-headline text-2xl font-bold text-primary">
                    {activeTemplate.total_days}{" "}
                    <span className="text-sm font-normal">DAYS</span>
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

              {stops.map((stop: Record<string, unknown>, i: number) => {
                const isStart = i === 0;
                const markerStyle = isStart ? "bg-primary" : "bg-surface-container-highest";
                const markerIcon = isStart ? "tour" : "radio_button_checked";
                const borderStyle = isStart ? "border-l-4 border-primary" : "";

                return (
                  <div key={`${stop.village}-${stop.mile_marker}`}>
                    {/* Stop */}
                    <div className="relative mb-16">
                      <div
                        className={`absolute -left-10 top-0 w-8 h-8 rounded-full ${markerStyle} border-4 border-surface flex items-center justify-center`}
                      >
                        <span
                          className={`material-symbols-outlined text-xs filled ${isStart ? "text-on-primary" : "text-secondary"}`}
                        >
                          {markerIcon}
                        </span>
                      </div>
                      <div
                        className={`bg-surface-container-low p-8 rounded-xl shadow-sm ${borderStyle}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="font-label text-xs font-bold text-tertiary uppercase tracking-widest block mb-1">
                              {stop.label as string}
                            </span>
                            <h4 className="font-headline text-2xl font-bold text-primary">
                              {stop.village as string}
                            </h4>
                          </div>
                          <span className="text-secondary font-label text-xs font-bold">
                            MILE {Number(stop.mile_marker).toFixed(1)}
                          </span>
                        </div>
                        {isStart ? (
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
                                  Required for Night {stop.day_number as number}
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
                                placeholder={`Search for stays in ${stop.village}...`}
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
                    {i < connections.length && (
                      <div className="relative py-4 mb-8 flex items-center justify-center">
                        <div className="bg-surface-container-highest px-4 py-2 rounded-full flex items-center gap-4">
                          <span className="material-symbols-outlined text-secondary text-sm">
                            terrain
                          </span>
                          <span className="font-label text-[10px] font-bold text-secondary uppercase tracking-widest">
                            {connections[i].distance} &bull;{" "}
                            {connections[i].terrain}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Remaining Trail */}
              {Number(remaining) > 0 && (
                <div className="relative py-12 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-secondary">
                      more_vert
                    </span>
                  </div>
                  <p className="font-headline text-xl text-secondary italic">
                    {remaining} miles remaining to the city of Bath
                  </p>
                </div>
              )}
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
                    0 / {activeTemplate.total_days}
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
                      Check forecast before booking
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
                      Trail Alerts
                    </span>
                    <span className="text-[10px] text-secondary">
                      No active diversions
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
