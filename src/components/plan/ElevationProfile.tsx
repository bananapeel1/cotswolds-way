"use client";

import { useState, useRef, useCallback } from "react";
import { ELEVATION_POINTS } from "@/lib/plan-engine";
import type { DayStop } from "@/lib/plan-engine";
import { useUnits } from "@/contexts/UnitContext";

export default function ElevationProfile({
  stops,
  direction,
  highlightDays,
}: {
  stops: DayStop[];
  direction: "north_to_south" | "south_to_north";
  highlightDays?: number[];
}) {
  const { formatDistance, formatElevationM, distanceUnit } = useUnits();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; mile: number; elev: number; visible: boolean }>({
    x: 0, y: 0, mile: 0, elev: 0, visible: false,
  });

  const W = 800;
  const H = 140;
  const pad = { left: 8, right: 8, top: 12, bottom: 24 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const maxElev = 340;

  const toX = (mile: number) => pad.left + (mile / 102) * innerW;
  const toY = (elev: number) => pad.top + innerH - (elev / maxElev) * innerH;

  const fillPath =
    ELEVATION_POINTS.map(([m, e], i) =>
      `${i === 0 ? "M" : "L"}${toX(m).toFixed(1)},${toY(e).toFixed(1)}`
    ).join(" ") +
    ` L${toX(102).toFixed(1)},${(pad.top + innerH).toFixed(1)} L${toX(0).toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;

  const linePath = ELEVATION_POINTS.map(([m, e], i) =>
    `${i === 0 ? "M" : "L"}${toX(m).toFixed(1)},${toY(e).toFixed(1)}`
  ).join(" ");

  // Day boundaries from cumulative miles (skip rest days with 0 width)
  const dayBoundaries: { day: number; mile: number; isTransfer?: boolean; isRest?: boolean }[] = stops.map(s => ({
    day: s.day, mile: s.cumulative, isTransfer: s.transfer, isRest: s.restDay,
  }));

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const mile = Math.max(0, Math.min(102, ((svgX - pad.left) / innerW) * 102));

    let nearest = ELEVATION_POINTS[0];
    let minDist = Infinity;
    for (const pt of ELEVATION_POINTS) {
      const d = Math.abs(pt[0] - mile);
      if (d < minDist) { minDist = d; nearest = pt; }
    }

    setTooltip({ x: toX(nearest[0]), y: toY(nearest[1]), mile: nearest[0], elev: nearest[1], visible: true });
  }, [innerW]);

  const startLabel = direction === "north_to_south" ? "Campden" : "Bath";
  const endLabel = direction === "north_to_south" ? "Bath" : "Campden";

  return (
    <div className="bg-surface-container-low rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">terrain</span>
          Elevation Profile
        </h3>
        <span className="text-[10px] text-secondary">Highest point: Cleeve Hill {formatElevationM(330)}</span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
      >
        {/* Day boundary shading */}
        {dayBoundaries.map((b, i) => {
          const prevMile = i === 0 ? 0 : dayBoundaries[i - 1].mile;
          const isHighlighted = highlightDays?.includes(b.day);
          const fillColor = b.isTransfer
            ? "rgba(100,100,100,0.08)"
            : isHighlighted
              ? "rgba(21,66,18,0.12)"
              : i % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent";
          return (
            <rect
              key={b.day}
              x={toX(prevMile)}
              y={pad.top}
              width={Math.max(0, toX(b.mile) - toX(prevMile))}
              height={innerH}
              fill={fillColor}
            />
          );
        })}

        {/* Elevation fill */}
        <path d={fillPath} fill="url(#elevGradient)" />
        <path d={linePath} fill="none" stroke="#154212" strokeWidth="1.5" />

        {/* Gradient */}
        <defs>
          <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#154212" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#154212" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Day boundary lines */}
        {dayBoundaries.slice(0, -1).map(b => (
          <line key={`line-${b.day}`} x1={toX(b.mile)} y1={pad.top} x2={toX(b.mile)} y2={pad.top + innerH}
            stroke="#154212" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.3" />
        ))}

        {/* Day labels */}
        {dayBoundaries.map((b, i) => {
          const prevMile = i === 0 ? 0 : dayBoundaries[i - 1].mile;
          const midX = (toX(prevMile) + toX(b.mile)) / 2;
          const width = toX(b.mile) - toX(prevMile);
          if (width < 15) return null; // skip labels for tiny segments (rest days)
          return (
            <text key={`label-${b.day}`} x={midX} y={pad.top + innerH + 14} textAnchor="middle"
              fill={b.isTransfer ? "#666" : "#665d4e"} fontSize="8" fontWeight="700">
              {b.isTransfer ? "🚌" : b.isRest ? "💤" : `D${b.day}`}
            </text>
          );
        })}

        {/* Highest point marker */}
        <circle cx={toX(22.8)} cy={toY(330)} r="3" fill="#541600" />

        {/* Tooltip crosshair */}
        {tooltip.visible && (
          <>
            <line x1={tooltip.x} y1={pad.top} x2={tooltip.x} y2={pad.top + innerH}
              stroke="#154212" strokeWidth="0.5" opacity="0.4" />
            <circle cx={tooltip.x} cy={tooltip.y} r="4" fill="#154212" stroke="white" strokeWidth="1.5" />
          </>
        )}

        {/* Axis labels */}
        <text x={pad.left} y={pad.top + innerH + 16} fill="#665d4e" fontSize="8">{startLabel}</text>
        <text x={pad.left + innerW} y={pad.top + innerH + 16} textAnchor="end" fill="#665d4e" fontSize="8">{endLabel}</text>
      </svg>

      {/* Tooltip popup */}
      {tooltip.visible && (
        <div className="text-[10px] text-secondary text-center mt-1">
          {formatDistance(tooltip.mile)} — {formatElevationM(tooltip.elev)} elevation
        </div>
      )}
    </div>
  );
}
