"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mainLinks = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/search", label: "Explore Stays", icon: "bed" },
  { href: "/plan", label: "Plan My Hike", icon: "hiking" },
  { href: "/explore", label: "Trail Explorer", icon: "explore" },
  { href: "/my-trip", label: "My Trip", icon: "luggage", requiresPlan: true },
];

const trailLinks = [
  { href: "/safety", label: "Safety Guide", icon: "health_and_safety" },
  { href: "/weather", label: "Weather", icon: "cloud" },
  { href: "/news", label: "Trail News", icon: "newspaper" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trailDropdownOpen, setTrailDropdownOpen] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cotswold-plan");
      if (raw) {
        const stored = JSON.parse(raw);
        setHasPlan(stored?.plan?.stops?.length > 0);
      }
    } catch { /* ignore */ }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTrailDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isTrailPage = trailLinks.some((l) => pathname === l.href);

  return (
    <nav className="bg-surface/80 backdrop-blur-xl sticky top-0 z-50 border-b border-outline-variant/10 shadow-ambient">
      <div className="flex justify-between items-center px-6 sm:px-8 py-4 max-w-screen-2xl mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-3 text-primary font-headline font-bold text-xl tracking-tight"
        >
          <img src="/logo.svg" alt="Logo" className="w-9 h-9" />
          <span className="hidden sm:inline">The Cotswolds Way</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-6">
          {mainLinks.filter(l => !l.requiresPlan || hasPlan).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-label text-sm font-bold transition-colors flex items-center gap-1.5 ${
                pathname === link.href
                  ? "text-primary"
                  : "text-[#5e5e5e] hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-base">{link.icon}</span>
              {link.label}
            </Link>
          ))}

          {/* The Trail dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setTrailDropdownOpen(!trailDropdownOpen)}
              className={`font-label text-sm font-bold transition-colors flex items-center gap-1.5 ${
                isTrailPage ? "text-primary" : "text-[#5e5e5e] hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-base">terrain</span>
              The Trail
              <span className={`material-symbols-outlined text-sm transition-transform ${trailDropdownOpen ? "rotate-180" : ""}`}>
                keyboard_arrow_down
              </span>
            </button>
            {trailDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 py-2 min-w-[200px] z-50">
                {trailLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setTrailDropdownOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-body hover:bg-surface-container-high transition-colors ${
                      pathname === link.href
                        ? "text-primary font-bold"
                        : "text-secondary hover:text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{link.icon}</span>
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop right — map icon */}
        <div className="hidden lg:flex items-center">
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
          className="lg:hidden flex items-center justify-center w-10 h-10 text-primary"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[28px]">menu</span>
        </button>
      </div>

      {/* Mobile overlay menu */}
      <div
        className={`fixed inset-0 z-[100] lg:hidden transition-opacity duration-300 ${
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
            <span className="font-headline font-bold text-primary text-lg">The Cotswolds Way</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="w-10 h-10 flex items-center justify-center text-primary"
            >
              <span className="material-symbols-outlined text-[28px]">close</span>
            </button>
          </div>

          <div className="flex flex-col px-6 overflow-y-auto flex-1 min-h-0 py-2">
            {mainLinks.filter(l => !l.requiresPlan || hasPlan).map((link) => (
              <MobileNavLink key={link.href} href={link.href} icon={link.icon} label={link.label} onClick={() => setMobileMenuOpen(false)} />
            ))}

            <div className="mt-5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">The Trail</span>
            </div>
            {trailLinks.map((link) => (
              <MobileNavLink key={link.href} href={link.href} icon={link.icon} label={link.label} onClick={() => setMobileMenuOpen(false)} />
            ))}
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
