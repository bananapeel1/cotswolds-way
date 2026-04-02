import type { SavedPOI } from "@/lib/plan-engine";

const POI_ICONS: Record<string, string> = {
  pub: "sports_bar", cafe: "coffee", restaurant: "restaurant",
  water: "water_drop", toilets: "wc", parking: "local_parking",
  bus_stop: "directions_bus", train: "train",
  shop: "shopping_bag", atm: "payments", pharmacy: "medical_services",
  post_office: "mail", church: "church", viewpoint: "visibility",
  picnic: "deck", campsite: "camping",
};

export default function SavedPoisList({
  pois,
  day,
  onRemove,
}: {
  pois: SavedPOI[];
  day: number;
  onRemove: (day: number, poiId: number) => void;
}) {
  if (pois.length === 0) return null;

  return (
    <div className="mt-2">
      <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Saved stops</p>
      <div className="space-y-1">
        {pois.map((poi) => (
          <div key={poi.id} className="flex items-center gap-2 text-[11px] text-primary">
            <span className="material-symbols-outlined text-xs text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
              {POI_ICONS[poi.type] || "location_on"}
            </span>
            <span className="flex-1 truncate">{poi.name}</span>
            <span className="text-[9px] text-secondary capitalize">{poi.type.replace("_", " ")}</span>
            <button onClick={() => onRemove(day, poi.id)} className="text-secondary hover:text-red-500 shrink-0">
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
