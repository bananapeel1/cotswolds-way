interface POI {
  id: number;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distanceFromTrail: number;
  tags: Record<string, string>;
}

interface PubStop {
  name: string;
  mile: number;
  arrivalTime: string;
  distanceFromTrail: number;
  type: string;
}

function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const period = h >= 12 ? "pm" : "am";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")}${period}`;
}

export default function PubLunchCard({
  pubs,
  dayStartMile,
  dayEndMile,
  approximateMile,
  departureHour = 9,
}: {
  pubs: POI[];
  dayStartMile: number;
  dayEndMile: number;
  approximateMile: (lat: number) => number;
  departureHour?: number;
}) {
  // Find food POIs within this day's mile range
  const dayPubs = pubs
    .filter(p => ["pub", "cafe", "restaurant"].includes(p.type) && p.distanceFromTrail <= 500)
    .map(p => {
      const mile = approximateMile(p.latitude);
      return { name: p.name, mile, distanceFromTrail: p.distanceFromTrail, type: p.type };
    })
    .filter(p => p.mile >= dayStartMile && p.mile <= dayEndMile)
    .sort((a, b) => a.mile - b.mile);

  // Estimate arrival times (2.5 mph average) and take top 3
  const shown: PubStop[] = dayPubs.slice(0, 3).map(p => {
    const milesWalked = p.mile - dayStartMile;
    const hoursWalked = milesWalked / 2.5;
    return { ...p, arrivalTime: formatTime(departureHour + hoursWalked) };
  });

  if (shown.length === 0) return null;

  const typeIcon: Record<string, string> = { pub: "sports_bar", cafe: "coffee", restaurant: "restaurant" };

  return (
    <div className="mt-2">
      <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Lunch stops</p>
      <div className="space-y-1">
        {shown.map((pub, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] text-primary">
            <span className="material-symbols-outlined text-xs text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
              {typeIcon[pub.type] || "restaurant"}
            </span>
            <span className="flex-1 truncate">{pub.name}</span>
            <span className="text-secondary text-[10px]">~{pub.arrivalTime}</span>
            <span className="text-[9px] text-secondary">{pub.distanceFromTrail}m</span>
          </div>
        ))}
      </div>
    </div>
  );
}
