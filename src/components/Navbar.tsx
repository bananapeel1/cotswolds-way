"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/search", label: "Explore" },
    { href: "/itinerary", label: "Itineraries" },
    { href: "/plan", label: "Plan" },
  ];

  return (
    <nav className="bg-surface/80 backdrop-blur-xl sticky top-0 z-50 border-b border-outline-variant/10">
      <div className="flex justify-between items-center px-6 sm:px-8 py-4 max-w-screen-2xl mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-3 text-primary font-headline font-bold text-xl tracking-tight"
        >
          <img src="/logo.svg" alt="Logo" className="w-9 h-9" />
          The Cotswold Way
        </Link>

        {/* Desktop nav — centered links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-label text-base font-bold transition-colors ${
                pathname === link.href
                  ? "text-primary"
                  : "text-[#5e5e5e] hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop right — map icon */}
        <div className="hidden md:flex items-center">
          <Link
            href="/search"
            className="w-10 h-10 flex items-center justify-center text-primary hover:text-primary/70 transition-colors"
            aria-label="Map search"
          >
            <span className="material-symbols-outlined text-2xl">map</span>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 text-primary"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[28px]">menu</span>
        </button>
      </div>

      {/* Mobile overlay menu */}
      <div
        className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-300 ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMobileMenuOpen(false)}
        />

        <div
          className={`absolute top-0 right-0 h-screen w-[80%] max-w-sm bg-surface shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex justify-between items-center px-6 py-5 border-b border-outline-variant/10">
            <span className="font-headline font-bold text-primary text-lg">The Cotswold Way</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="w-10 h-10 flex items-center justify-center text-primary"
            >
              <span className="material-symbols-outlined text-[28px]">close</span>
            </button>
          </div>

          <div className="flex flex-col px-6 overflow-y-auto flex-1 min-h-0 py-2">
            <MobileNavLink href="/" icon="home" label="Home" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/search" icon="map" label="Explore Stays" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/itinerary" icon="route" label="Itineraries" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/plan" icon="hiking" label="Plan My Hike" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/explore" icon="explore" label="Trail Explorer" onClick={() => setMobileMenuOpen(false)} />

            <div className="mt-5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">The Trail</span>
            </div>
            <MobileNavLink href="/maps" icon="travel_explore" label="Official Maps" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/safety" icon="health_and_safety" label="Safety Guide" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/weather" icon="cloud" label="Weather" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/news" icon="newspaper" label="Trail News" onClick={() => setMobileMenuOpen(false)} />
          </div>

          <div className="flex flex-col gap-3 px-6 pb-10 pt-4 border-t border-outline-variant/20">
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center bg-primary text-white py-4 rounded-full font-bold text-sm"
            >
              Find a Stay
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function MobileNavLink({ href, icon, label, onClick }: { href: string; icon: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 py-3 border-b border-outline-variant/10 text-primary hover:text-primary/70 transition-colors"
    >
      <span className="material-symbols-outlined text-lg text-secondary">{icon}</span>
      <span className="font-label text-sm font-bold">{label}</span>
    </Link>
  );
}
