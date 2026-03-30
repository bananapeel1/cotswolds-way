import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cotswold Way News — Trail Updates & Walking Tips",
  description:
    "Latest news, trail condition updates, and walking tips for the Cotswold Way. Path closures, seasonal highlights, and planning advice for your next walk.",
  alternates: { canonical: "https://thecotswoldsway.com/news" },
};

const NEWS_ARTICLES = [
  {
    date: "12 March 2026",
    title: "Spring 2026 Trail Maintenance Complete",
    excerpt: "National Trails teams have finished the annual spring maintenance programme, clearing fallen trees from the winter storms, repairing stiles across the Dursley to Wotton section, and resurfacing eroded paths near Cleeve Hill summit. Over 40 volunteers contributed 600 hours of work.",
    category: "Maintenance",
  },
  {
    date: "28 February 2026",
    title: "New Campsite Opens Near Winchcombe",
    excerpt: "Sudeley Fields Campsite has opened just 800 metres from the trail between Winchcombe and Cleeve Hill. The site offers 15 tent pitches, hot showers, a drying room, and a small shop. Prices start at GBP 12 per person per night. Book direct through their website.",
    category: "Accommodation",
  },
  {
    date: "15 February 2026",
    title: "Cotswold Way Named Top 10 UK Trail 2026",
    excerpt: "Walking Magazine has named the Cotswold Way one of the top 10 long-distance trails in the UK for 2026, praising its variety of landscapes, well-maintained waymarking, and the quality of accommodation available along the route. The trail was highlighted for its accessibility to new long-distance walkers.",
    category: "Recognition",
  },
  {
    date: "5 January 2026",
    title: "Winter Walking Guide Published",
    excerpt: "Our comprehensive winter walking guide is now available, covering reduced daylight planning, kit recommendations for cold weather, and which sections are best avoided after heavy rain. The guide includes GPS waypoints for alternative low-level routes when the escarpment is icy.",
    category: "Guide",
  },
  {
    date: "18 December 2025",
    title: "Painswick to Birdlip Diversion Lifted",
    excerpt: "The temporary diversion on the Painswick to Birdlip section has been removed following completion of forestry work in Buckholt Wood. Walkers can now follow the original waymarked route through the ancient beech woodland. Thank you for your patience during the works.",
    category: "Route Update",
  },
  {
    date: "2 November 2025",
    title: "New Partnership with Local Baggage Transfer",
    excerpt: "We have partnered with Cotswold Sherpa to offer seamless baggage transfer between accommodations. Book through our itinerary builder and your bags will be waiting at your next stop. Available for bookings from April 2026 onwards.",
    category: "Service",
  },
];

export default function NewsPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Trail News &amp; Updates
          </h1>
          <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
            The latest from the Cotswold Way: route updates, new accommodation, maintenance schedules, and trail community news.
          </p>
        </div>
      </section>

      {/* News Articles */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {NEWS_ARTICLES.map((article, i) => (
              <article
                key={i}
                className="bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]"
              >
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="inline-block bg-tertiary/10 text-tertiary font-label text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    {article.category}
                  </span>
                  <span className="flex items-center gap-1.5 font-body text-secondary text-xs">
                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                    {article.date}
                  </span>
                </div>
                <h2 className="font-headline text-2xl font-bold text-primary mb-3">{article.title}</h2>
                <p className="font-body text-secondary leading-relaxed mb-4">{article.excerpt}</p>
                <Link
                  href="#"
                  className="inline-flex items-center gap-1.5 font-label text-sm font-bold text-tertiary hover:text-tertiary-container transition-colors uppercase tracking-widest"
                >
                  Read more
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe */}
      <section className="py-16 px-8 bg-surface-container-low">
        <div className="max-w-4xl mx-auto text-center">
          <span className="material-symbols-outlined text-5xl text-tertiary mb-4">mail</span>
          <h2 className="font-headline text-3xl font-bold text-primary mb-4">Stay in the Loop</h2>
          <p className="font-body text-secondary max-w-xl mx-auto mb-8 leading-relaxed">
            Subscribe to our quarterly trail dispatch for route updates, new accommodation listings, and seasonal walking advice.
          </p>
          <div className="flex max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 bg-surface border border-outline-variant/30 rounded-l-lg px-4 py-3 font-body text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-tertiary/30"
            />
            <button className="bg-tertiary text-on-tertiary px-6 py-3 rounded-r-lg font-label text-sm font-bold uppercase tracking-widest hover:bg-tertiary-container transition-all">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
