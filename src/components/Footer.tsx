import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary text-secondary-container w-full py-12 px-8 border-t border-primary-container">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-7xl mx-auto">
        <div>
          <div className="text-surface font-headline italic text-2xl mb-6">
            The Cotswold Way
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
                href="#"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Official Maps
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Safety Guide
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Weather Station
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Trail News
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="font-bold text-xs uppercase tracking-widest mb-6 text-white">
            Booking
          </h5>
          <ul className="space-y-4 text-sm">
            <li>
              <Link
                href="#"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Manage Trek
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Gift Vouchers
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                Group Rates
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="text-primary-fixed hover:text-white transition-colors"
              >
                FAQ
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
        <div>&copy; 2025 The Cotswold Way. Part of the National Trails collection.</div>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-white transition-colors">
            Privacy
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Terms
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Accessibility
          </Link>
        </div>
      </div>
    </footer>
  );
}
