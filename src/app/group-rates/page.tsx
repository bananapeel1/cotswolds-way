import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

const PRICING_TIERS = [
  { size: "6-10 walkers", discount: "10%", desc: "Perfect for friends and walking clubs. Save 10% on all accommodation booked through our platform.", highlight: false },
  { size: "11-20 walkers", discount: "15%", desc: "Ideal for larger groups and charity walks. Priority booking at partner properties plus 15% savings.", highlight: true },
  { size: "20+ walkers", discount: "Contact us", desc: "Bespoke rates for large parties, corporate groups, and organised events. We will build a custom package.", highlight: false },
];

export default function GroupRatesPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Group &amp; Corporate Rates
          </h1>
          <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
            Walking with friends, a club, or your team? We offer discounted rates for groups of 6 or more along the Cotswold Way.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8 text-center">Why Book as a Group?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: "savings", title: "Save Money", desc: "Group discounts from 10-15% on all accommodation, reducing the cost per person significantly." },
              { icon: "support_agent", title: "Dedicated Support", desc: "A single point of contact to coordinate bookings across multiple properties for your entire group." },
              { icon: "local_shipping", title: "Baggage Transfer", desc: "Coordinated luggage transport between stops, so your group can walk light." },
              { icon: "restaurant", title: "Group Dining", desc: "We can arrange group meals at partner pubs and restaurants along the route." },
            ].map((benefit) => (
              <div key={benefit.title} className="text-center">
                <span className="material-symbols-outlined text-3xl text-tertiary mb-3">{benefit.icon}</span>
                <h3 className="font-headline text-lg font-semibold text-primary mb-2">{benefit.title}</h3>
                <p className="font-body text-secondary text-sm leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-20 px-8 bg-surface-container-low">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-12 text-center">Pricing Tiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.size}
                className={`rounded-xl p-8 text-center flex flex-col shadow-[0_4px_24px_rgba(28,28,25,0.05)] ${
                  tier.highlight
                    ? "bg-primary text-white ring-2 ring-tertiary"
                    : "bg-surface"
                }`}
              >
                <span className="material-symbols-outlined text-3xl mb-3" style={{ color: tier.highlight ? "#ff9069" : undefined }}>
                  {tier.highlight ? "star" : "group"}
                </span>
                <p className={`font-label text-xs uppercase tracking-widest mb-2 ${tier.highlight ? "text-primary-fixed" : "text-secondary"}`}>
                  {tier.size}
                </p>
                <p className={`font-headline text-4xl font-bold mb-4 ${tier.highlight ? "text-white" : "text-primary"}`}>
                  {tier.discount}
                  {tier.discount !== "Contact us" && <span className="text-lg font-normal"> off</span>}
                </p>
                <p className={`font-body text-sm leading-relaxed flex-1 ${tier.highlight ? "text-primary-fixed" : "text-secondary"}`}>
                  {tier.desc}
                </p>
                <button
                  className={`mt-6 px-6 py-3 rounded-lg font-label text-sm font-bold uppercase tracking-widest transition-all ${
                    tier.highlight
                      ? "bg-tertiary text-on-tertiary hover:bg-tertiary-container"
                      : "bg-primary text-white hover:bg-primary-container"
                  }`}
                >
                  {tier.discount === "Contact us" ? "Get a Quote" : "Enquire Now"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Corporate Section */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="material-symbols-outlined text-5xl text-tertiary mb-4">corporate_fare</span>
              <h2 className="font-headline text-3xl font-bold text-primary mb-4">Corporate Team Building</h2>
              <p className="font-body text-secondary leading-relaxed mb-6">
                The Cotswold Way offers a unique team building experience. Choose from single-day challenges to multi-day treks, with all logistics managed by us. Walking together builds stronger teams than any conference room.
              </p>
              <ul className="space-y-3">
                {[
                  "Custom route planning for your group's fitness level",
                  "Professional guide options available",
                  "Evening dining and accommodation coordination",
                  "Branded certificates of completion",
                  "Optional charity fundraising support",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 font-body text-secondary text-sm">
                    <span className="material-symbols-outlined text-sm text-tertiary mt-0.5">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
              <h3 className="font-headline text-xl font-semibold text-primary mb-4">Request a Quote</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Company name"
                  className="w-full bg-surface border border-outline-variant/30 rounded-lg px-4 py-3 font-body text-sm text-primary placeholder:text-secondary/50"
                />
                <input
                  type="email"
                  placeholder="Contact email"
                  className="w-full bg-surface border border-outline-variant/30 rounded-lg px-4 py-3 font-body text-sm text-primary placeholder:text-secondary/50"
                />
                <input
                  type="number"
                  placeholder="Group size"
                  className="w-full bg-surface border border-outline-variant/30 rounded-lg px-4 py-3 font-body text-sm text-primary placeholder:text-secondary/50"
                />
                <textarea
                  placeholder="Tell us about your event..."
                  rows={4}
                  className="w-full bg-surface border border-outline-variant/30 rounded-lg px-4 py-3 font-body text-sm text-primary placeholder:text-secondary/50 resize-none"
                />
                <button className="w-full bg-tertiary text-on-tertiary px-6 py-3 rounded-lg font-label text-sm font-bold uppercase tracking-widest hover:bg-tertiary-container transition-all">
                  Submit Enquiry
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-8 bg-surface-container-low">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-headline text-3xl font-bold text-primary mb-4">Ready to Plan Your Group Walk?</h2>
          <p className="font-body text-secondary max-w-xl mx-auto mb-8 leading-relaxed">
            Start by exploring accommodation on our interactive map. Filter by group-friendly properties that can host larger parties.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 bg-tertiary text-on-tertiary px-8 py-3 rounded-lg font-label text-sm font-bold uppercase tracking-widest hover:bg-tertiary-container transition-all"
          >
            <span className="material-symbols-outlined text-lg">search</span>
            Search Accommodation
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
