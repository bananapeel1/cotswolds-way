"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-surface/80 backdrop-blur-xl sticky top-0 z-50 shadow-[0_24px_40px_-4px_rgba(28,28,25,0.05)]">
      <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-3 text-primary font-headline italic font-bold text-2xl tracking-tighter"
        >
          <img src="/logo.svg" alt="Logo" className="w-9 h-9" />
          The Cotswold Way
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/"
            className="text-secondary hover:text-primary transition-colors font-label text-xs font-bold uppercase tracking-widest"
          >
            Home
          </Link>
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
            href="/plan"
            className="text-secondary hover:text-primary transition-colors font-label text-xs font-bold uppercase tracking-widest"
          >
            Plan My Hike
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <Link href="/account" className="text-secondary font-bold text-xs uppercase tracking-widest hover:text-primary transition-all">
            Sign In
          </Link>
          <Link href="/search" className="bg-tertiary text-on-tertiary px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-tertiary-container transition-all">
            Book Now
          </Link>
        </div>

        {/* Mobile hamburger button */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 text-primary"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[28px]">menu</span>
        </button>
      </div>
      <div className="bg-surface-container-low h-px w-full" />

      {/* Mobile overlay menu */}
      <div
        className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-300 ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Slide-in panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[80%] max-w-sm bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Close button */}
          <div className="flex justify-between items-center px-6 py-5 border-b border-outline-variant/10">
            <span className="font-headline italic font-bold text-primary text-lg">The Cotswold Way</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="w-10 h-10 flex items-center justify-center text-primary"
            >
              <span className="material-symbols-outlined text-[28px]">close</span>
            </button>
          </div>

          {/* Nav links — scrollable middle section */}
          <div className="flex flex-col px-6 overflow-y-auto flex-1 py-2">
            <MobileNavLink href="/" icon="home" label="Home" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/search" icon="map" label="Map Search" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/itinerary" icon="route" label="Itineraries" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/plan" icon="hiking" label="Plan My Hike" onClick={() => setMobileMenuOpen(false)} />

            <div className="mt-5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">The Trail</span>
            </div>
            <MobileNavLink href="/maps" icon="explore" label="Official Maps" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/safety" icon="health_and_safety" label="Safety Guide" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/weather" icon="cloud" label="Weather" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/news" icon="newspaper" label="Trail News" onClick={() => setMobileMenuOpen(false)} />
          </div>

          {/* Buttons — pinned to bottom */}
          <div className="flex flex-col gap-3 px-6 pb-10 pt-4 border-t border-outline-variant/20">
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-3 rounded-lg font-bold text-sm uppercase tracking-widest border-2 border-primary text-primary"
            >
              Sign In
            </Link>
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center bg-tertiary text-white py-3 rounded-lg font-bold text-sm uppercase tracking-widest"
            >
              Book Now
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
      className="flex items-center gap-3 py-3 border-b border-outline-variant/10 text-primary hover:text-tertiary transition-colors"
    >
      <span className="material-symbols-outlined text-lg text-secondary">{icon}</span>
      <span className="font-label text-sm font-bold uppercase tracking-widest">{label}</span>
    </Link>
  );
}
