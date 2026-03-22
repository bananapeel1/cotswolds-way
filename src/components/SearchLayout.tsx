"use client";

import { useState } from "react";
import Link from "next/link";
import TrailMap from "@/components/TrailMap";
import type { MapProperty } from "@/components/TrailMap";

interface AccommodationCard {
  slug: string;
  name: string;
  rating: number;
  propertyType: string;
  typeLabel: string;
  typeIcon: string;
  distance: string;
  distanceIcon: string;
  price: number;
  priceLabel: string;
  badge: string | null;
  badgeColor: string;
  urgency: string;
  urgencyColor: string;
  amenities: { icon: string; label: string; active: boolean }[];
  image: string;
  shortDescription?: string;
}

export default function SearchLayout({
  accommodations,
  mapProperties,
}: {
  accommodations: AccommodationCard[];
  mapProperties: MapProperty[];
}) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const selectedProperty = selectedSlug
    ? accommodations.find((a) => a.slug === selectedSlug) || null
    : null;
  const selectedMapProp = selectedSlug
    ? mapProperties.find((p) => p.slug === selectedSlug) || null
    : null;

  return (
    <main className="flex-grow flex flex-col md:flex-row h-[calc(100vh-65px)]">
      {/* Mobile view toggle */}
      <div className="md:hidden flex bg-surface border-b border-outline-variant/20">
        <button
          onClick={() => setMobileView("list")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
            mobileView === "list"
              ? "text-primary border-b-2 border-primary"
              : "text-secondary"
          }`}
        >
          <span className="material-symbols-outlined text-lg">list</span>
          List
        </button>
        <button
          onClick={() => setMobileView("map")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
            mobileView === "map"
              ? "text-primary border-b-2 border-primary"
              : "text-secondary"
          }`}
        >
          <span className="material-symbols-outlined text-lg">map</span>
          Map
        </button>
      </div>

      {/* Left: Scrollable List */}
      <section
        className={`w-full md:w-1/2 flex flex-col bg-surface overflow-hidden border-r border-outline-variant/20 ${
          mobileView === "map" ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Filter Bar */}
        <div className="bg-surface px-4 sm:px-8 pt-6 sm:pt-8 pb-4 z-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline text-3xl font-bold tracking-tight text-primary">
              Accommodations
            </h2>
            <span className="text-sm font-label text-secondary">
              {accommodations.length} properties found
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            <button className="flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold whitespace-nowrap">
              <span className="material-symbols-outlined text-sm">distance</span>
              Under 0.5mi
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-bold whitespace-nowrap hover:bg-secondary-container transition-colors">
              Budget
              <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-bold whitespace-nowrap hover:bg-secondary-container transition-colors">
              <span className="material-symbols-outlined text-sm">pets</span>
              Dog-friendly
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-bold whitespace-nowrap hover:bg-secondary-container transition-colors">
              Amenities
              <span className="material-symbols-outlined text-sm">tune</span>
            </button>
          </div>
          <div className="h-px w-full bg-outline-variant/20 mt-2" />
        </div>

        {/* Accommodation Cards */}
        <div className="px-4 sm:px-8 pb-12 space-y-4 sm:space-y-6 overflow-y-auto no-scrollbar flex-grow">
          {accommodations.map((acc) => (
            <Link
              href={`/property/${acc.slug}`}
              key={acc.slug}
              className={`bg-surface-container-lowest rounded-2xl overflow-hidden flex flex-col sm:flex-row shadow-sm hover:shadow-md transition-shadow group border block ${
                selectedSlug === acc.slug
                  ? "border-tertiary ring-2 ring-tertiary/20"
                  : "border-outline-variant/10"
              }`}
            >
              <div className="w-full sm:w-48 h-48 relative shrink-0 overflow-hidden">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={acc.name}
                  src={acc.image}
                />
                <div className="absolute top-2 left-2 bg-primary/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">{acc.typeIcon}</span>
                  {acc.typeLabel}
                </div>
              </div>
              <div className="p-6 flex flex-col justify-between flex-grow">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-headline text-xl font-bold text-primary">
                      {acc.name}
                    </h4>
                    <div className="flex items-center text-tertiary">
                      <span className="material-symbols-outlined text-sm filled">star</span>
                      <span className="text-sm font-bold ml-1">{acc.rating}</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-label text-secondary uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs">{acc.distanceIcon}</span>
                    {acc.distance}
                  </p>
                  <div className="flex gap-4 mb-4">
                    {acc.amenities.map((amenity) => (
                      <div key={amenity.icon} className="group/icon relative cursor-help">
                        <span
                          className={`material-symbols-outlined text-secondary ${!amenity.active ? "opacity-30" : "hover:text-primary"} transition-colors`}
                        >
                          {amenity.icon}
                        </span>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/icon:block bg-primary text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                          {amenity.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-outline-variant/10 pt-4">
                  <div>
                    <p className={`text-[10px] ${acc.urgencyColor} font-bold mb-1 uppercase tracking-tighter`}>
                      {acc.urgency}
                    </p>
                    <p className="text-2xl font-headline font-bold text-primary">
                      &pound;{acc.price}
                      <span className="text-sm font-body font-normal text-secondary">
                        {acc.priceLabel}
                      </span>
                    </p>
                  </div>
                  <span className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-primary-container transition-colors">
                    View Stay
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Right: Interactive Map */}
      <section
        className={`w-full md:w-1/2 relative ${
          mobileView === "list" ? "hidden md:block" : "block"
        }`}
        style={mobileView === "map" ? { height: "calc(100vh - 65px - 49px)" } : undefined}
      >
        <TrailMap
          properties={mapProperties}
          activeSlug={selectedSlug || undefined}
          onMarkerClick={(slug) => setSelectedSlug(slug)}
        />

        {/* Property Preview Card (slides up from bottom when marker clicked) */}
        {selectedProperty && selectedMapProp && (
          <div className="absolute bottom-6 left-6 right-6 z-30 animate-slide-up">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/20">
              <button
                onClick={() => setSelectedSlug(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
              >
                <span className="material-symbols-outlined text-sm text-secondary">close</span>
              </button>
              <div className="flex">
                <div className="w-40 h-40 shrink-0 overflow-hidden">
                  <img
                    src={selectedProperty.image}
                    alt={selectedProperty.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 flex flex-col justify-between flex-grow min-w-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">{selectedProperty.typeIcon}</span>
                        {selectedProperty.typeLabel}
                      </span>
                      <div className="flex items-center text-tertiary">
                        <span className="material-symbols-outlined text-xs filled">star</span>
                        <span className="text-xs font-bold ml-0.5">{selectedMapProp.rating}</span>
                      </div>
                    </div>
                    <h3 className="font-headline text-lg font-bold text-primary truncate">
                      {selectedProperty.name}
                    </h3>
                    <p className="text-xs text-secondary mt-0.5">
                      {selectedMapProp.village} · Day {selectedMapProp.dayOnTrail}
                    </p>
                  </div>
                  <div className="flex items-end justify-between mt-3">
                    <p className="text-xl font-headline font-bold text-primary">
                      &pound;{selectedProperty.price}
                      <span className="text-xs font-body font-normal text-secondary">
                        {selectedProperty.priceLabel}
                      </span>
                    </p>
                    <Link
                      href={`/property/${selectedProperty.slug}`}
                      className="bg-tertiary text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-tertiary-container transition-colors flex items-center gap-1"
                    >
                      View Details
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
