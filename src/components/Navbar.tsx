import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-surface/80 backdrop-blur-xl sticky top-0 z-50 shadow-[0_24px_40px_-4px_rgba(28,28,25,0.05)]">
      <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto w-full">
        <Link
          href="/"
          className="text-primary font-headline italic font-bold text-2xl tracking-tighter"
        >
          The Cotswold Way
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/search"
            className="text-secondary hover:text-primary transition-colors font-label text-xs font-bold uppercase tracking-widest"
          >
            Map Search
          </Link>
          <Link
            href="/itinerary"
            className="text-secondary hover:text-primary transition-colors font-label text-xs font-bold uppercase tracking-widest"
          >
            Itineraries
          </Link>
          <Link
            href="#"
            className="text-secondary hover:text-primary transition-colors font-label text-xs font-bold uppercase tracking-widest"
          >
            Luggage Transfers
          </Link>
          <Link
            href="#"
            className="text-secondary hover:text-primary transition-colors font-label text-xs font-bold uppercase tracking-widest"
          >
            Plan My Hike
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-secondary font-bold text-xs uppercase tracking-widest hover:text-primary transition-all">
            Sign In
          </button>
          <button className="bg-tertiary text-on-tertiary px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-tertiary-container transition-all">
            Book Now
          </button>
        </div>
      </div>
      <div className="bg-surface-container-low h-px w-full" />
    </nav>
  );
}
