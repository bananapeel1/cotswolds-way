import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function PlanMyHikePage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative py-32 px-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Walker on Cotswold escarpment"
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=1920&q=80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40" />
        </div>
        <div className="max-w-4xl mx-auto relative z-10 text-center text-white">
          <span className="text-tertiary-fixed font-bold uppercase tracking-[0.3em] text-xs mb-4 block">
            Your Adventure Starts Here
          </span>
          <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Plan My Hike
          </h1>
          <p className="font-body text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Everything you need to prepare for the Cotswold Way. From choosing your
            pace to packing the right gear.
          </p>
        </div>
      </section>

      {/* Getting Started */}
      <section className="py-24 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-tertiary font-bold uppercase tracking-[0.3em] text-xs mb-4 block">
              Step by Step
            </span>
            <h2 className="font-headline text-4xl md:text-5xl text-primary font-bold">
              Planning Your Walk
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <div className="space-y-12">
              <PlanStep
                number="1"
                title="Choose Your Direction"
                description="Most walkers go north to south (Chipping Campden to Bath), finishing with the dramatic descent into Bath. South to north offers quieter paths and a gentler start."
              />
              <PlanStep
                number="2"
                title="Pick Your Pace"
                description="The classic 7-day itinerary averages 14.5 miles per day. Our 8-day scenic option reduces this to 12.7 miles with time for village exploration. Weekend explorers can tackle highlight sections."
              />
              <PlanStep
                number="3"
                title="Book Your Stays"
                description="Use our interactive map to find verified near-trail accommodation. Every listing is within 0.5 miles of the path, so you never waste tired legs on long detours."
              />
              <PlanStep
                number="4"
                title="Arrange Logistics"
                description="Arrange transport to the start, download offline maps, and plan your daily distances. Our platform handles the coordination so you can focus on the walk."
              />
            </div>

            <div className="bg-surface-container-low rounded-2xl p-10 sticky top-28">
              <h3 className="font-headline text-2xl font-bold text-primary mb-6">
                Trail at a Glance
              </h3>
              <div className="space-y-6">
                <StatRow icon="straighten" label="Total Distance" value="102 miles (164 km)" />
                <StatRow icon="altitude" label="Total Ascent" value="4,600m (15,100ft)" />
                <StatRow icon="schedule" label="Typical Duration" value="6–9 days" />
                <StatRow icon="calendar_month" label="Best Season" value="May – September" />
                <StatRow icon="trending_up" label="Highest Point" value="Cleeve Hill (330m)" />
                <StatRow icon="signpost" label="Waymarking" value="National Trail acorn" />
              </div>
              <div className="mt-8 pt-8 border-t border-outline-variant/20">
                <Link
                  href="/itinerary"
                  className="block text-center bg-tertiary text-white py-4 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-tertiary-container transition-all"
                >
                  Browse Itineraries
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What to Pack */}
      <section className="py-24 px-8 bg-surface-container-low">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl text-primary font-bold mb-4">
              What to Pack
            </h2>
            <p className="text-secondary max-w-xl mx-auto">
              Travel light, walk far. Here&apos;s what experienced Cotswold Way
              walkers carry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PackingCard
              icon="backpack"
              title="Daypack Essentials"
              items={[
                "Waterproof jacket (always)",
                "Water bottle (1L minimum)",
                "Trail snacks & lunch",
                "OS Explorer maps 179 & 168",
                "First aid basics",
                "Sun protection",
                "Phone & portable charger",
              ]}
            />
            <PackingCard
              icon="checkroom"
              title="Clothing"
              items={[
                "Broken-in walking boots",
                "Moisture-wicking base layers",
                "Quick-dry walking trousers",
                "Fleece or insulating mid-layer",
                "Spare socks (merino wool)",
                "Hat and gloves (spring/autumn)",
                "Evening wear for pubs",
              ]}
            />
            <PackingCard
              icon="luggage"
              title="In Your Overnight Bag"
              items={[
                "Clean clothes for each day",
                "Toiletries",
                "Evening shoes",
                "Book or journal",
                "Chargers and cables",
                "Any medication",
                "Lightweight sleeping layer",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Best Time to Walk */}
      <section className="py-24 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-4xl text-primary font-bold mb-16 text-center">
            When to Walk
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SeasonCard
              season="Spring"
              months="March – May"
              icon="local_florist"
              highlights="Wildflowers, lambing season, quieter trails"
              note="Can be muddy after rain. Pack waterproofs."
              recommended
            />
            <SeasonCard
              season="Summer"
              months="June – August"
              icon="wb_sunny"
              highlights="Longest days, warmest weather, village fêtes"
              note="Book early — peak season for accommodation."
              recommended
            />
            <SeasonCard
              season="Autumn"
              months="September – November"
              icon="eco"
              highlights="Golden beech woods, harvest festivals, cooler walking"
              note="Shorter days. Carry a head torch from October."
              recommended
            />
            <SeasonCard
              season="Winter"
              months="December – February"
              icon="ac_unit"
              highlights="Dramatic skies, frosty escarpments, log fires"
              note="Some B&Bs close. Shorter daylight hours."
            />
          </div>
        </div>
      </section>

      {/* Getting There */}
      <section className="py-24 px-8 bg-surface-container-low">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-headline text-4xl text-primary font-bold mb-16 text-center">
            Getting There
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-white rounded-2xl p-10 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-tertiary text-2xl">train</span>
                <h3 className="font-headline text-xl font-bold text-primary">
                  Chipping Campden (North)
                </h3>
              </div>
              <p className="text-secondary text-sm leading-relaxed mb-4">
                Nearest station is Moreton-in-Marsh (7 miles), served by Great Western
                Railway from London Paddington. Regular buses connect to Chipping Campden.
              </p>
              <p className="text-secondary text-sm leading-relaxed">
                By car, the town has pay-and-display parking. Long-stay walkers can
                arrange secure parking through local providers.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-10 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-tertiary text-2xl">train</span>
                <h3 className="font-headline text-xl font-bold text-primary">
                  Bath (South)
                </h3>
              </div>
              <p className="text-secondary text-sm leading-relaxed mb-4">
                Bath Spa station is a major rail hub with direct services from London
                Paddington (90 minutes), Bristol, Cardiff, and the South West.
              </p>
              <p className="text-secondary text-sm leading-relaxed">
                The trail finishes at the Bath Abbey, a short walk from the station.
                Several park-and-ride services operate on the city outskirts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8 bg-surface-container-highest">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-headline text-3xl text-primary font-bold mb-4">
            Ready to start planning?
          </h2>
          <p className="text-secondary mb-8 max-w-lg mx-auto">
            Choose an itinerary template and customise it to your pace, then book
            your stays with one click.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/itinerary"
              className="bg-tertiary text-white px-10 py-4 rounded-lg font-bold text-xs uppercase tracking-[0.2em] hover:bg-tertiary-container transition-all inline-flex items-center gap-2"
            >
              View Itineraries
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
            <Link
              href="/search"
              className="bg-primary text-white px-10 py-4 rounded-lg font-bold text-xs uppercase tracking-[0.2em] hover:bg-primary-container transition-all inline-flex items-center gap-2"
            >
              Explore the Map
              <span className="material-symbols-outlined text-sm">map</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function PlanStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6">
      <div className="flex-shrink-0 w-10 h-10 bg-tertiary text-white rounded-full flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div>
        <h3 className="font-headline text-xl font-bold text-primary mb-2">{title}</h3>
        <p className="text-secondary leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-tertiary text-lg">{icon}</span>
        <span className="text-secondary text-sm">{label}</span>
      </div>
      <span className="font-bold text-primary text-sm">{value}</span>
    </div>
  );
}

function PackingCard({
  icon,
  title,
  items,
}: {
  icon: string;
  title: string;
  items: string[];
}) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-surface-container-low rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
        </div>
        <h3 className="font-headline text-lg font-bold text-primary">{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-secondary">
            <span className="material-symbols-outlined text-tertiary text-base mt-0.5">check</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeasonCard({
  season,
  months,
  icon,
  highlights,
  note,
  recommended,
}: {
  season: string;
  months: string;
  icon: string;
  highlights: string;
  note: string;
  recommended?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-8 ${recommended ? "bg-white shadow-sm" : "bg-surface-container-high"} relative`}>
      {recommended && (
        <span className="absolute top-4 right-4 text-tertiary">
          <span className="material-symbols-outlined text-base">thumb_up</span>
        </span>
      )}
      <span className="material-symbols-outlined text-3xl text-primary mb-4 block">{icon}</span>
      <h3 className="font-headline text-xl font-bold text-primary mb-1">{season}</h3>
      <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
        {months}
      </p>
      <p className="text-secondary text-sm leading-relaxed mb-4">{highlights}</p>
      <p className="text-xs text-tertiary italic">{note}</p>
    </div>
  );
}
