import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TripPlanner from "@/components/TripPlanner";

export default function PlanMyHikePage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative py-16 px-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Walker on Cotswold escarpment"
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=1920&q=80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h1 className="font-headline text-4xl font-bold text-white mb-3">Plan Your Walk</h1>
          <p className="text-white/80 text-lg">
            102 miles of England's finest trail. Build your perfect itinerary with walk scores, pub stops, and cost estimates.
          </p>
        </div>
      </section>

      {/* Trip Planner */}
      <section className="max-w-5xl mx-auto px-6 py-10">
        <TripPlanner />
      </section>

      {/* Quick info sections */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {/* What to Pack */}
          <div className="bg-surface-container-low rounded-xl p-6">
            <h3 className="font-bold text-primary text-sm mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>backpack</span>
              What to Pack
            </h3>
            <ul className="space-y-1.5 text-xs text-secondary">
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs">check</span> Waterproof jacket + trousers</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs">check</span> Walking boots (broken in)</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs">check</span> OS Explorer map or GPS</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs">check</span> Water bottle + snacks</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs">check</span> First aid kit + blister plasters</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs">check</span> Torch for winter walking</li>
            </ul>
          </div>

          {/* When to Walk */}
          <div className="bg-surface-container-low rounded-xl p-6">
            <h3 className="font-bold text-primary text-sm mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
              Best Time to Walk
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-primary font-bold">May — September</span>
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Best</span>
              </div>
              <p className="text-secondary">Long days, dry trails, wildflowers in bloom. Book early — popular months fill up fast.</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-primary font-bold">October — April</span>
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Quieter</span>
              </div>
              <p className="text-secondary">Fewer crowds, autumn colours, but shorter days and muddy paths.</p>
            </div>
          </div>

          {/* Getting There */}
          <div className="bg-surface-container-low rounded-xl p-6">
            <h3 className="font-bold text-primary text-sm mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>train</span>
              Getting There
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-primary font-bold">Chipping Campden (North)</p>
                <p className="text-secondary">Train to Moreton-in-Marsh (GWR), then bus or taxi (6 miles)</p>
              </div>
              <div>
                <p className="text-primary font-bold">Bath (South)</p>
                <p className="text-secondary">Direct trains from London Paddington (1h 30m), Bristol, and Birmingham</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
