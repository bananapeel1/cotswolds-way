import { ELEVATION_POINTS } from "@/lib/plan-engine";

export default function MiniElevation({ startMile, endMile }: { startMile: number; endMile: number }) {
  // Extract elevation points for this day's mile range
  const points = ELEVATION_POINTS.filter(([mile]) => mile >= startMile && mile <= endMile);
  if (points.length < 2) return null;

  const W = 120;
  const H = 24;
  const PAD = 2;

  const mileRange = endMile - startMile || 1;
  const elevs = points.map(([, e]) => e);
  const maxElev = Math.max(...elevs, 100);
  const minElev = Math.min(...elevs, 0);
  const elevRange = maxElev - minElev || 1;

  const toX = (mile: number) => PAD + ((mile - startMile) / mileRange) * (W - PAD * 2);
  const toY = (elev: number) => PAD + (1 - (elev - minElev) / elevRange) * (H - PAD * 2);

  const linePath = points.map(([m, e], i) => `${i === 0 ? "M" : "L"}${toX(m).toFixed(1)},${toY(e).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${toX(points[points.length - 1][0]).toFixed(1)},${H} L${toX(points[0][0]).toFixed(1)},${H} Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <defs>
        <linearGradient id={`elev-${startMile}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#154212" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#154212" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#elev-${startMile})`} />
      <path d={linePath} fill="none" stroke="#154212" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  );
}
