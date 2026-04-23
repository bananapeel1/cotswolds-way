/**
 * Weather utilities for the plan — shared between client and server.
 *
 * `DayForecast` mirrors the API route response; `describeWmo` maps Open-Meteo
 * WMO weather codes to a short label + Material Symbols icon name so UI can
 * render them directly without another lookup table.
 */

export interface DayForecast {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  precipMm: number;
  precipProbPct: number;
  windMaxKmh: number;
  weatherCode: number;
  sunriseIso: string;
  sunsetIso: string;
  daylightHours: number;
}

export interface WeatherDescription {
  label: string;
  icon: string;
  /** Severity 0 = fine, 1 = so-so, 2 = uncomfortable, 3 = dangerous for walking. */
  severity: 0 | 1 | 2 | 3;
}

/** Open-Meteo uses WMO codes: https://open-meteo.com/en/docs */
export function describeWmo(code: number): WeatherDescription {
  if (code === 0) return { label: "Clear", icon: "wb_sunny", severity: 0 };
  if (code === 1) return { label: "Mainly clear", icon: "wb_sunny", severity: 0 };
  if (code === 2) return { label: "Partly cloudy", icon: "partly_cloudy_day", severity: 0 };
  if (code === 3) return { label: "Overcast", icon: "cloud", severity: 1 };
  if (code === 45 || code === 48) return { label: "Fog", icon: "foggy", severity: 2 };
  if (code >= 51 && code <= 55) return { label: "Drizzle", icon: "rainy", severity: 1 };
  if (code === 56 || code === 57) return { label: "Freezing drizzle", icon: "ac_unit", severity: 3 };
  if (code >= 61 && code <= 65) return { label: "Rain", icon: "rainy", severity: 2 };
  if (code === 66 || code === 67) return { label: "Freezing rain", icon: "ac_unit", severity: 3 };
  if (code >= 71 && code <= 75) return { label: "Snow", icon: "ac_unit", severity: 3 };
  if (code === 77) return { label: "Snow grains", icon: "ac_unit", severity: 2 };
  if (code >= 80 && code <= 82) return { label: "Showers", icon: "rainy", severity: 2 };
  if (code === 85 || code === 86) return { label: "Snow showers", icon: "ac_unit", severity: 3 };
  if (code === 95) return { label: "Thunderstorm", icon: "thunderstorm", severity: 3 };
  if (code === 96 || code === 99) return { label: "Thunderstorm + hail", icon: "thunderstorm", severity: 3 };
  return { label: "Unknown", icon: "cloud", severity: 1 };
}

/** HH:MM in local time from an ISO timestamp. */
export function formatLocalTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}
