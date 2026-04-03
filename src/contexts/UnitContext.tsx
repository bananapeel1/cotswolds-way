"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react";

export type UnitSystem = "imperial" | "metric";

interface UnitContextValue {
  system: UnitSystem;
  toggle: () => void;
  formatDistance: (miles: number) => string;
  formatElevation: (feet: number) => string;
  formatElevationM: (metres: number) => string;
  formatTemp: (celsius: number) => string;
  formatTempRange: (low: number, high: number) => string;
  distanceUnit: "mi" | "km";
  elevationUnit: "ft" | "m";
  trailTotal: string;
  trailTotalShort: string;
}

const STORAGE_KEY = "cotswold-units";

const UnitContext = createContext<UnitContextValue | null>(null);

export function UnitProvider({ children }: { children: ReactNode }) {
  const [system, setSystem] = useState<UnitSystem>("imperial");
  const [hydrated, setHydrated] = useState(false);

  // Read preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "metric") setSystem("metric");
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setSystem(prev => {
      const next = prev === "imperial" ? "metric" : "imperial";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<UnitContextValue>(() => {
    const isMetric = system === "metric";

    const formatDistance = (miles: number): string => {
      if (isMetric) {
        const km = miles * 1.60934;
        return `${km % 1 === 0 ? km : km.toFixed(1)} km`;
      }
      return `${miles % 1 === 0 ? miles : Number(miles.toFixed(1))} mi`;
    };

    const formatElevation = (feet: number): string => {
      if (isMetric) return `${Math.round(feet * 0.3048)} m`;
      return `${Math.round(feet)} ft`;
    };

    // For data already stored in metres (e.g. ELEVATION_POINTS)
    const formatElevationM = (metres: number): string => {
      if (isMetric) return `${Math.round(metres)} m`;
      return `${Math.round(metres * 3.28084)} ft`;
    };

    const formatTemp = (celsius: number): string => {
      if (isMetric) return `${Math.round(celsius)}°C`;
      return `${Math.round(celsius * 9 / 5 + 32)}°F`;
    };

    const formatTempRange = (low: number, high: number): string =>
      `${formatTemp(low)}–${formatTemp(high)}`;

    return {
      system,
      toggle,
      formatDistance,
      formatElevation,
      formatElevationM,
      formatTemp,
      formatTempRange,
      distanceUnit: isMetric ? "km" : "mi",
      elevationUnit: isMetric ? "m" : "ft",
      trailTotal: isMetric ? "164 km" : "102 miles",
      trailTotalShort: isMetric ? "164km" : "102mi",
    };
  }, [system, toggle]);

  return <UnitContext value={value}>{children}</UnitContext>;
}

export function useUnits(): UnitContextValue {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error("useUnits must be used within a UnitProvider");
  return ctx;
}
