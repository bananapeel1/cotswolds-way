import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary text-secondary-container w-full py-10 sm:py-12 px-4 sm:px-8 border-t border-primary-container">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-7xl mx-auto">
        <div>
          <div className="text-surface font-headline text-2xl font-bold mb-6">
            The Cotswolds Way
          </div>
          <p className="text-sm text-primary-fixed leading-relaxed">
            Defining the standard for editorial-first trekking experiences in
            the United Kingdom.
          </p>
        </div>
        <div>
          <h5 className="font-bold text-xs uppercase tracking-widest mb-6 text-white">
            The Trail
          </h5>
          <ul className="space-y-4 text-sm">
            <li>
              <Link
                href="/maps"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Official Maps
              </Link>
            </li>
            <li>
              <Link
                href="/safety"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Safety Guide
              </Link>
            </li>
            <li>
              <Link
                href="/weather"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Weather Station
              </Link>
            </li>
            <li>
              <Link
                href="/news"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Trail News
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="font-bold text-xs uppercase tracking-widest mb-6 text-white">
            Plan Your Walk
          </h5>
          <ul className="space-y-4 text-sm">
            <li>
              <Link
                href="/search"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Find Accommodation
              </Link>
            </li>
            <li>
              <Link
                href="/itinerary"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Itinerary Builder
              </Link>
            </li>
            <li>
              <Link
                href="/account"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                My Account
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="font-bold text-xs uppercase tracking-widest mb-6 text-white">
            Stay Updated
          </h5>
          <p className="text-xs text-primary-fixed mb-4">
            Quarterly dispatches from the trail.
          </p>
          <div className="flex border-b border-primary-container pb-2">
            <input
              className="bg-transparent border-none text-xs w-full focus:ring-0 placeholder:text-primary-container text-white"
              placeholder="Your Email"
              type="email"
            />
            <button className="text-white">
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-primary-container flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-widest text-primary-fixed/60">
        <div>&copy; 2025 The Cotswolds Way. Part of the National Trails collection.</div>
        <div className="flex gap-6">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>
          <Link href="/accessibility" className="hover:text-white transition-colors">
            Accessibility
          </Link>
        </div>
      </div>
    </footer>
  );
}
