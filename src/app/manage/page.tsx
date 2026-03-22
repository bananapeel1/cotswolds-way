import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function ManagePage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Manage Your Trek
          </h1>
          <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
            View your bookings, modify dates, download your itinerary, and keep everything organised in one place.
          </p>
        </div>
      </section>

      {/* Sign In Prompt */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-surface-container-low rounded-xl p-10 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
            <span className="material-symbols-outlined text-5xl text-tertiary mb-4">lock</span>
            <h2 className="font-headline text-2xl font-bold text-primary mb-3">Sign In to Continue</h2>
            <p className="font-body text-secondary mb-8 leading-relaxed">
              Access your bookings, saved itineraries, and trip details by signing into your account.
            </p>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 bg-tertiary text-on-tertiary px-8 py-3 rounded-lg font-label text-sm font-bold uppercase tracking-widest hover:bg-tertiary-container transition-all w-full justify-center"
            >
              <span className="material-symbols-outlined text-lg">login</span>
              Sign In
            </Link>
            <p className="font-body text-secondary text-xs mt-4">
              Don&apos;t have an account?{" "}
              <Link href="/account" className="text-tertiary font-semibold hover:underline">
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-20 px-8 bg-surface-container-low">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-3 text-center">What You Can Do</h2>
          <p className="font-body text-secondary text-center mb-12 max-w-xl mx-auto">
            Once signed in, your dashboard gives you full control over your Cotswold Way trip.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: "calendar_month", title: "View Bookings", desc: "See all your accommodation reservations in one place, with confirmation details, check-in times, and host contact information." },
              { icon: "edit_calendar", title: "Modify Dates", desc: "Need to adjust your schedule? Change dates for flexible bookings directly from your dashboard, subject to availability." },
              { icon: "download", title: "Download Itinerary", desc: "Export your complete trip plan as a PDF with daily routes, accommodation details, and walking directions between stops." },
              { icon: "notifications", title: "Trip Alerts", desc: "Receive notifications about trail conditions, weather warnings, and any changes affecting your route or accommodation." },
              { icon: "rate_review", title: "Leave Reviews", desc: "After your walk, share your experience to help fellow walkers. Review accommodation, trail conditions, and local pubs." },
              { icon: "favorite", title: "Saved Favourites", desc: "Bookmark properties and itinerary templates while planning. Return to them anytime from your account." },
            ].map((feature) => (
              <div key={feature.title} className="bg-surface rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
                <span className="material-symbols-outlined text-3xl text-tertiary mb-3">{feature.icon}</span>
                <h3 className="font-headline text-lg font-semibold text-primary mb-2">{feature.title}</h3>
                <p className="font-body text-secondary text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 px-8 bg-surface">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8 text-center">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/search"
              className="flex items-center gap-4 bg-surface-container-low rounded-xl p-6 shadow-[0_4px_24px_rgba(28,28,25,0.05)] hover:shadow-[0_8px_32px_rgba(28,28,25,0.1)] transition-shadow"
            >
              <span className="material-symbols-outlined text-3xl text-tertiary">search</span>
              <div>
                <h3 className="font-headline text-lg font-semibold text-primary">Search Accommodation</h3>
                <p className="font-body text-secondary text-xs">Find and book your next stay</p>
              </div>
            </Link>
            <Link
              href="/itinerary"
              className="flex items-center gap-4 bg-surface-container-low rounded-xl p-6 shadow-[0_4px_24px_rgba(28,28,25,0.05)] hover:shadow-[0_8px_32px_rgba(28,28,25,0.1)] transition-shadow"
            >
              <span className="material-symbols-outlined text-3xl text-tertiary">route</span>
              <div>
                <h3 className="font-headline text-lg font-semibold text-primary">Itinerary Builder</h3>
                <p className="font-body text-secondary text-xs">Plan your day-by-day route</p>
              </div>
            </Link>
            <Link
              href="/maps"
              className="flex items-center gap-4 bg-surface-container-low rounded-xl p-6 shadow-[0_4px_24px_rgba(28,28,25,0.05)] hover:shadow-[0_8px_32px_rgba(28,28,25,0.1)] transition-shadow"
            >
              <span className="material-symbols-outlined text-3xl text-tertiary">map</span>
              <div>
                <h3 className="font-headline text-lg font-semibold text-primary">Trail Maps</h3>
                <p className="font-body text-secondary text-xs">Download GPX and offline maps</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
