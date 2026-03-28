import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface-container-low w-full py-16 px-4 sm:px-8 border-t border-outline-variant/10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
        <div>
          <div className="text-primary font-headline font-bold text-xl mb-4">
            The Cotswold Way
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            Trail-native accommodation booking for the 102-mile Cotswold Way National Trail.
          </p>
        </div>
        <div>
          <h5 className="font-label font-bold text-xs uppercase tracking-widest mb-6 text-primary">
            Explore
          </h5>
          <ul className="space-y-3 text-sm">
            <li>
              <Link href="/search" className="text-secondary hover:text-primary transition-colors">
                Find Accommodation
              </Link>
            </li>
            <li>
              <Link href="/itinerary" className="text-secondary hover:text-primary transition-colors">
                Itineraries
              </Link>
            </li>
            <li>
              <Link href="/maps" className="text-secondary hover:text-primary transition-colors">
                Trail Maps
              </Link>
            </li>
            <li>
              <Link href="/weather" className="text-secondary hover:text-primary transition-colors">
                Weather
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="font-label font-bold text-xs uppercase tracking-widest mb-6 text-primary">
            Information
          </h5>
          <ul className="space-y-3 text-sm">
            <li>
              <Link href="/safety" className="text-secondary hover:text-primary transition-colors">
                Safety Guide
              </Link>
            </li>
            <li>
              <Link href="/news" className="text-secondary hover:text-primary transition-colors">
                Trail News
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-secondary hover:text-primary transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-secondary hover:text-primary transition-colors">
                Terms of Use
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-5xl mx-auto mt-16 pt-8 border-t border-outline-variant/20 text-xs text-secondary/60">
        &copy; {new Date().getFullYear()} The Cotswold Way. Part of the National Trails collection.
      </div>
    </footer>
  );
}
