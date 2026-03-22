import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

const FAQ_CATEGORIES = [
  {
    title: "The Trail",
    icon: "hiking",
    questions: [
      {
        q: "How long does it take to walk the Cotswold Way?",
        a: "Most walkers complete the full 102 miles in 7 to 10 days, averaging 10-15 miles per day. Faster walkers can do it in 5-6 days, while a more leisurely pace with rest days might take 12-14 days. We recommend 8 days as a good balance between challenge and enjoyment.",
      },
      {
        q: "Which direction should I walk - north to south or south to north?",
        a: "The traditional direction is north to south, from Chipping Campden to Bath. This puts the prevailing wind at your back and saves the dramatic descent into Bath for the grand finale. However, south to north is equally valid and some walkers prefer starting in Bath for easier transport links.",
      },
      {
        q: "How difficult is the Cotswold Way?",
        a: "The Cotswold Way is moderate in difficulty. There are no scrambles or extreme terrain, but the cumulative ascent of approximately 3,660 metres means it is physically demanding over multiple days. The steepest sections are around Cleeve Hill and the descent to Dursley. Good basic fitness and comfortable walking boots are essential.",
      },
      {
        q: "Is the trail well signposted?",
        a: "Yes, the Cotswold Way is a designated National Trail and is waymarked with the distinctive acorn symbol throughout. Signposts appear at road crossings and junctions. However, in some wooded areas and open fields, markers can be spaced further apart. We recommend carrying a map or GPS device as backup.",
      },
      {
        q: "When is the best time to walk the Cotswold Way?",
        a: "Late spring (May-June) and early autumn (September-October) offer the best conditions: moderate temperatures, manageable daylight hours, and fewer crowds. Summer provides the longest days but can be hot on exposed ridges. Winter walking is possible but requires more planning around short daylight hours and muddy conditions.",
      },
    ],
  },
  {
    title: "Accommodation",
    icon: "hotel",
    questions: [
      {
        q: "What types of accommodation are available along the trail?",
        a: "The Cotswold Way offers a wide range: campsites, glamping sites, hostels (including YHA), bed and breakfasts, inns with rooms, boutique hotels, and self-catering cottages. Most are within a mile of the trail. Our platform lists verified properties with direct booking links.",
      },
      {
        q: "How far in advance should I book accommodation?",
        a: "For peak season (June-September) and weekends, we recommend booking 2-3 months ahead, especially for popular stops like Broadway, Painswick, and Bath. Midweek walking in spring or autumn offers more flexibility, but booking at least 2-4 weeks ahead is still advisable for the most popular properties.",
      },
      {
        q: "Can I camp wild along the Cotswold Way?",
        a: "Wild camping is not legally permitted along the Cotswold Way as the trail passes primarily through private farmland. However, several dedicated campsites are located near the trail. Some landowners may grant permission if asked politely, but this cannot be relied upon. Always use designated sites.",
      },
      {
        q: "Do accommodations offer drying facilities for wet gear?",
        a: "Many B&Bs and inns along the trail offer drying rooms or radiators in rooms for wet gear. We note this in our property listings where available. Hostels typically have communal drying rooms. If this is important to you, check the amenities listed on each property page or contact the host directly.",
      },
    ],
  },
  {
    title: "Booking",
    icon: "book_online",
    questions: [
      {
        q: "How does booking work on this platform?",
        a: "We provide verified listings of accommodation along the Cotswold Way with direct links to book with each property. This means you deal directly with your host, avoiding third-party booking fees. Our itinerary builder helps you plan which properties to book for each night of your walk.",
      },
      {
        q: "Can I modify or cancel a booking?",
        a: "Cancellation and modification policies vary by property. Since you book directly with each accommodation, their individual policies apply. We recommend checking the cancellation terms at the time of booking. Most properties offer free cancellation up to 7-14 days before arrival.",
      },
      {
        q: "Is there a baggage transfer service?",
        a: "We are partnering with Cotswold Sherpa and other local baggage transfer services. These companies will move your bags between accommodation stops for approximately GBP 8-12 per bag per transfer. You can arrange this through our itinerary builder or directly with the provider.",
      },
      {
        q: "Do you offer package deals for the whole trail?",
        a: "We are developing full trail packages that bundle accommodation, baggage transfer, and route guidance into a single booking. In the meantime, our itinerary builder helps you plan and book each stop individually. Sign up for our newsletter to be notified when packages launch.",
      },
    ],
  },
  {
    title: "Getting There",
    icon: "directions",
    questions: [
      {
        q: "How do I get to Chipping Campden (the northern start)?",
        a: "The nearest railway station is Moreton-in-Marsh (7 miles), served by Great Western Railway from London Paddington. Bus route 1 or 2 connects Moreton-in-Marsh to Chipping Campden. Alternatively, Honeybourne station (5 miles) has connections from the Midlands. Taxis from either station cost around GBP 15-20.",
      },
      {
        q: "How do I get to Bath (the southern end)?",
        a: "Bath Spa station has direct trains from London Paddington (90 minutes), Bristol (15 minutes), and many other cities. The trail ends at Bath Abbey in the city centre, a 10-minute walk from the station. Bath is also well-served by National Express coaches.",
      },
      {
        q: "How do I get back to my starting point after finishing?",
        a: "If walking north to south, take a train from Bath Spa to Moreton-in-Marsh (approximately 2.5 hours with one change), then a bus or taxi to Chipping Campden. Plan this in advance as the last connecting bus from Moreton-in-Marsh departs around 6pm on weekdays.",
      },
      {
        q: "Is there parking at either end of the trail?",
        a: "Chipping Campden has a pay-and-display car park on Back Ends (long-stay available). Bath has several Park and Ride facilities on the outskirts. For multi-day walks, consider whether leaving a car for a week is practical and cost-effective compared to public transport.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about walking the Cotswold Way, booking accommodation, and planning your trip.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-4xl mx-auto space-y-16">
          {FAQ_CATEGORIES.map((category) => (
            <div key={category.title}>
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-2xl text-tertiary">{category.icon}</span>
                <h2 className="font-headline text-2xl font-bold text-primary">{category.title}</h2>
              </div>
              <div className="space-y-3">
                {category.questions.map((faq, i) => (
                  <details
                    key={i}
                    className="group bg-surface-container-low rounded-xl shadow-[0_4px_24px_rgba(28,28,25,0.05)] overflow-hidden"
                  >
                    <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-body text-primary font-semibold text-sm leading-snug select-none">
                      {faq.q}
                      <span className="material-symbols-outlined text-xl text-secondary shrink-0 transition-transform group-open:rotate-180">
                        expand_more
                      </span>
                    </summary>
                    <div className="px-6 pb-5">
                      <p className="font-body text-secondary text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 px-8 bg-surface-container-low">
        <div className="max-w-4xl mx-auto text-center">
          <span className="material-symbols-outlined text-5xl text-tertiary mb-4">help</span>
          <h2 className="font-headline text-3xl font-bold text-primary mb-4">Still Have Questions?</h2>
          <p className="font-body text-secondary max-w-xl mx-auto mb-8 leading-relaxed">
            We are here to help you plan the perfect Cotswold Way walk. Get in touch and we will respond within 24 hours.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <a
              href="mailto:hello@cotswoldway.com"
              className="inline-flex items-center gap-2 bg-tertiary text-on-tertiary px-8 py-3 rounded-lg font-label text-sm font-bold uppercase tracking-widest hover:bg-tertiary-container transition-all"
            >
              <span className="material-symbols-outlined text-lg">mail</span>
              Email Us
            </a>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-lg font-label text-sm font-bold uppercase tracking-widest hover:bg-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-lg">search</span>
              Search Accommodation
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
