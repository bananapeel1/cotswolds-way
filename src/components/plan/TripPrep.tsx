"use client";

import { useState, useMemo } from "react";
import type { DayStop } from "@/lib/plan-engine";

type Tab = "transport" | "baggage" | "packlist";

/**
 * Collapsible prep panel that sits above/near the route in step 2. Covers the
 * things walkers actually need to sort before leaving home but which the
 * planning tools of other trail sites typically ignore: getting to the start,
 * getting a bag forwarded each morning, and what to bring.
 */
export default function TripPrep({
  stops,
  direction,
  startDate,
  month,
}: {
  stops: DayStop[];
  direction: "north_to_south" | "south_to_north";
  startDate?: string;
  month: number;
}) {
  const [tab, setTab] = useState<Tab>("transport");
  const [open, setOpen] = useState(false);

  const totalNights = Math.max(0, stops.filter((s) => !s.restDay).length - 1);
  const hasAccommodation = stops.some((s) => s.accommodation);

  const startVillage = direction === "north_to_south" ? "Chipping Campden" : "Bath";
  const endVillage = direction === "north_to_south" ? "Bath" : "Chipping Campden";

  return (
    <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(30,63,43,0.06)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-[18px] text-sm font-semibold text-ink hover:bg-cream transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-forest">backpack</span>
          Before you go
          <span className="text-xs font-normal text-stone">· transport · baggage · pack list</span>
        </span>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className={`text-stone transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-cream">
          <div className="flex gap-1 px-5 pt-4">
            {[
              { key: "transport" as const, label: "Getting there", icon: "train" },
              { key: "baggage" as const, label: "Baggage transfer", icon: "luggage" },
              { key: "packlist" as const, label: "Pack list", icon: "checklist" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-xl transition-colors ${
                  tab === t.key ? "bg-forest text-white" : "text-stone hover:text-ink hover:bg-cream"
                }`}
              >
                <span className="material-symbols-outlined text-sm">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "transport" && <TransportPanel start={startVillage} end={endVillage} />}
          {tab === "baggage" && <BaggagePanel nights={totalNights} hasAccommodation={hasAccommodation} />}
          {tab === "packlist" && <PackListPanel month={month} startDate={startDate} nights={totalNights} />}
        </div>
      )}
    </div>
  );
}

// ─── Transport ────────────────────────────────────────────────────────────

function TransportPanel({ start, end }: { start: string; end: string }) {
  // Static reference data — the transport options don't change often, and each
  // service link is verified against the operator website.
  const toChippingCampden = [
    { mode: "Train + bus", via: "Moreton-in-Marsh (GWR) → bus 21/22 Stagecoach West", time: "~2h 45m from London Paddington", link: "https://www.nationalrail.co.uk/" },
    { mode: "Train + taxi", via: "Honeybourne station (GWR) → 10 min taxi", time: "~2h 30m from London Paddington", link: "https://www.nationalrail.co.uk/" },
    { mode: "Coach", via: "Stratford-upon-Avon → Pulham’s bus 1 to Moreton", time: "Slower but cheaper", link: "https://www.pulhamscoaches.com/" },
  ];
  const toBath = [
    { mode: "Train", via: "Bath Spa (GWR / CrossCountry)", time: "~1h 25m from London Paddington", link: "https://www.nationalrail.co.uk/" },
    { mode: "Coach", via: "National Express, Megabus to Bath", time: "~3h from London Victoria", link: "https://www.nationalexpress.com/" },
  ];

  const outbound = start === "Chipping Campden" ? toChippingCampden : toBath;
  const inbound = start === "Chipping Campden" ? toBath : toChippingCampden;

  return (
    <div className="px-5 pt-4 pb-5 space-y-4 text-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone mb-2">Getting to the start · {start}</p>
        <ul className="space-y-2">
          {outbound.map((o) => (
            <li key={o.mode} className="flex items-start gap-3 p-3 rounded-xl bg-cream">
              <span className="material-symbols-outlined text-base text-forest mt-0.5">
                {o.mode.includes("Train") ? "train" : "directions_bus"}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-ink">{o.mode}</p>
                <p className="text-xs text-stone">{o.via}</p>
                <p className="text-[11px] text-stone-light mt-0.5">{o.time}</p>
              </div>
              <a href={o.link} target="_blank" rel="noopener" className="text-xs font-semibold text-forest hover:underline whitespace-nowrap">
                Book ↗
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone mb-2">Returning from {end}</p>
        <ul className="space-y-2">
          {inbound.map((o) => (
            <li key={o.mode} className="flex items-start gap-3 p-3 rounded-xl bg-cream">
              <span className="material-symbols-outlined text-base text-forest mt-0.5">
                {o.mode.includes("Train") ? "train" : "directions_bus"}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-ink">{o.mode}</p>
                <p className="text-xs text-stone">{o.via}</p>
                <p className="text-[11px] text-stone-light mt-0.5">{o.time}</p>
              </div>
              <a href={o.link} target="_blank" rel="noopener" className="text-xs font-semibold text-forest hover:underline whitespace-nowrap">
                Book ↗
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Baggage ──────────────────────────────────────────────────────────────

function BaggagePanel({ nights, hasAccommodation }: { nights: number; hasAccommodation: boolean }) {
  const operators = [
    {
      name: "Cotswold Way Baggage Transfer",
      price: "~£10–14 per bag per day",
      turnaround: "Bag collected 9am, delivered by 5pm",
      coverage: "End-to-end Cotswold Way",
      website: "https://cotswoldwaybaggagetransfer.co.uk/",
      note: "Local operator, specialises in the Cotswold Way only.",
    },
    {
      name: "Sherpa Van",
      price: "~£10–13 per bag per day",
      turnaround: "9am pick-up, late-afternoon delivery",
      coverage: "Most UK long-distance trails including the Cotswold Way",
      website: "https://www.sherpavan.com/",
      note: "UK-wide operator with long-running reputation.",
    },
    {
      name: "AMS Luggage Transfers",
      price: "Quote on request",
      turnaround: "9am pick-up",
      coverage: "Cotswold Way, Thames Path, Ridgeway",
      website: "https://www.amsluggagetransfers.co.uk/",
      note: "Smaller independent — good for off-season.",
    },
  ];
  const estimate = nights > 0 ? `~£${nights * 11}–${nights * 14} total for ${nights} night${nights === 1 ? "" : "s"}` : null;

  return (
    <div className="px-5 pt-4 pb-5 space-y-4 text-sm">
      <div className="p-3 rounded-xl bg-forest/5 border border-forest/10 text-xs text-forest-deep">
        <p className="font-semibold mb-1">Why use baggage transfer?</p>
        <p>Walk with just a day pack; your main bag is driven to your next accommodation. Critical on the steeper escarpment days and makes booking dog-friendly stays easier.</p>
      </div>
      {!hasAccommodation && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <span className="material-symbols-outlined text-sm align-text-bottom mr-1">info</span>
          Book your accommodation first — operators need delivery addresses for each night.
        </div>
      )}
      <ul className="space-y-3">
        {operators.map((op) => (
          <li key={op.name} className="p-3 rounded-xl bg-cream">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{op.name}</p>
                <p className="text-xs text-stone">{op.coverage}</p>
              </div>
              <a href={op.website} target="_blank" rel="noopener" className="text-xs font-semibold text-forest hover:underline whitespace-nowrap">
                Visit ↗
              </a>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-stone">
              <div><span className="text-stone-light">Price:</span> {op.price}</div>
              <div><span className="text-stone-light">Schedule:</span> {op.turnaround}</div>
            </div>
            <p className="text-[11px] text-stone mt-2 italic">{op.note}</p>
          </li>
        ))}
      </ul>
      {estimate && (
        <p className="text-xs text-stone text-center italic">Rough total for your trip: {estimate}.</p>
      )}
    </div>
  );
}

// ─── Pack list ────────────────────────────────────────────────────────────

interface PackItem {
  name: string;
  why?: string;
  must: boolean;
}

function buildPackList(month: number, nights: number): { group: string; items: PackItem[] }[] {
  const isCold = month <= 2 || month >= 10;
  const isShoulder = [2, 3, 9].includes(month);
  const isSummer = month >= 5 && month <= 8;

  const essentials: PackItem[] = [
    { name: "Waterproof jacket with hood", must: true, why: "Cotswold weather turns on a sixpence" },
    { name: "Worn-in walking boots or trail shoes", must: true },
    { name: "Waterproof rucksack cover", must: true },
    { name: "1 L water bottle (or hydration bladder)", must: true, why: "Refill points are sparse between villages" },
    { name: "Printed OS map 179 + 155 (backup to GPX)", must: true, why: "Phone signal drops in wooded valleys" },
    { name: "Basic first-aid kit + blister plasters", must: true },
    { name: "Head torch + spare batteries", must: true },
    { name: "Charging cable + portable power bank", must: true },
  ];

  const clothing: PackItem[] = [
    { name: "Quick-dry walking trousers", must: true },
    { name: `${Math.min(3, nights)}+ sets of wool/synthetic base layers`, must: true },
    { name: `${Math.max(2, Math.min(nights, 3))} pairs merino walking socks`, must: true, why: "Wet feet ruin a walk" },
    { name: "Fleece or insulated midlayer", must: !isSummer },
    ...(isCold ? [
      { name: "Thermal base layers", must: true, why: "Sub-zero mornings possible" },
      { name: "Warm hat + gloves", must: true },
      { name: "Gaiters", must: false, why: "Mud is deep in winter" },
    ] : []),
    ...(isShoulder ? [
      { name: "Warm hat + light gloves", must: true, why: "Early/late season mornings are cold" },
    ] : []),
    ...(isSummer ? [
      { name: "Sun hat + sunglasses + SPF 30+", must: true },
      { name: "Shorts (for hot valley sections)", must: false },
    ] : []),
  ];

  const trailKit: PackItem[] = [
    { name: "Walking poles", must: false, why: "Save knees on the 300 m escarpment descents" },
    { name: "Blister plasters / Compeed", must: true },
    { name: "Dry bag or zip-lock for phone + map", must: true },
    { name: "Emergency whistle", must: true },
    { name: "Emergency foil blanket", must: false },
    { name: "Insect repellent", must: isSummer || isShoulder },
    { name: "Tick remover", must: true, why: "Ticks active Apr–Oct on Cotswold grassland" },
  ];

  const admin: PackItem[] = [
    { name: "Photo ID + EHIC/GHIC", must: true },
    { name: "Printed or offline copy of daily itinerary", must: true },
    { name: "Accommodation confirmation emails", must: true },
    { name: "Baggage-transfer labels (one per day)", must: nights > 0 },
    { name: "Cash (~£50) — some pubs are card-only but some aren't", must: true },
    { name: "Emergency contact sheet", must: true, why: "Leave a copy with someone at home" },
  ];

  return [
    { group: "Essentials", items: essentials },
    { group: "Clothing", items: clothing },
    { group: "Trail kit", items: trailKit },
    { group: "Admin & safety", items: admin },
  ];
}

function PackListPanel({ month, startDate, nights }: { month: number; startDate?: string; nights: number }) {
  const list = useMemo(() => buildPackList(month, nights), [month, nights]);
  const STORAGE_KEY = "cotswold-packlist-checked";
  const [checked, setChecked] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  function toggle(name: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch { /* ignore storage errors */ }
      return next;
    });
  }

  return (
    <div className="px-5 pt-4 pb-5 text-sm">
      <p className="text-xs text-stone mb-3">
        Tailored to {startDate ? `your walk from ${startDate}` : `a ${["January","February","March","April","May","June","July","August","September","October","November","December"][month]} walk`}
        {nights > 0 && ` (${nights} night${nights === 1 ? "" : "s"})`}.
        Tick items as you pack — saved to this device.
      </p>
      <div className="space-y-4">
        {list.map((section) => (
          <div key={section.group}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone mb-1.5">{section.group}</p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const on = checked.has(item.name);
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => toggle(item.name)}
                      className="w-full flex items-start gap-2.5 py-1.5 text-left hover:bg-cream rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <span
                        className={`inline-flex items-center justify-center w-4 h-4 rounded border shrink-0 mt-0.5 transition-colors ${
                          on ? "bg-forest border-forest text-white" : "border-stone-light bg-white"
                        }`}
                      >
                        {on && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="2 6 5 9 10 3" />
                          </svg>
                        )}
                      </span>
                      <span className="flex-1">
                        <span className={`text-[13px] ${on ? "line-through text-stone" : "text-ink"}`}>
                          {item.name}
                          {item.must && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-terracotta">must</span>}
                        </span>
                        {item.why && <span className="block text-[11px] text-stone">{item.why}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
