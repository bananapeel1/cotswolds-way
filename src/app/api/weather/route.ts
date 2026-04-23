import { NextRequest, NextResponse } from "next/server";

/**
 * Per-day forecast + astronomy for a planned walk.
 *
 * Query params:
 *   lat, lng   — a representative point along the trail (we default to trail centre)
 *   start      — ISO yyyy-mm-dd, day 1 of the walk
 *   days       — number of walking days (1-16)
 *
 * Uses Open-Meteo which is free, keyless, and provides a reliable 16-day
 * outlook + sunrise/sunset. Cache for 1 hour — the forecast only changes
 * meaningfully on the hour cycle.
 */
export const revalidate = 3600;

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  wind_speed_10m_max: number[];
  weather_code: number[];
  sunrise: string[];
  sunset: string[];
  daylight_duration: number[];
}

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

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const lat = parseFloat(params.get("lat") ?? "51.75");   // Cotswold Way midpoint
  const lng = parseFloat(params.get("lng") ?? "-2.20");
  const start = params.get("start");
  const days = Math.max(1, Math.min(16, parseInt(params.get("days") ?? "7")));

  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return NextResponse.json({ error: "start must be yyyy-mm-dd" }, { status: 400 });
  }

  const startDate = new Date(start + "T00:00:00Z");
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "invalid start date" }, { status: 400 });
  }
  const endDate = new Date(startDate.getTime() + (days - 1) * 86400000);
  const endStr = endDate.toISOString().slice(0, 10);

  // Only the 16-day model has forecast data; beyond that we return climate averages.
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const daysAhead = Math.floor((startDate.getTime() - now.getTime()) / 86400000);
  const isForecastable = daysAhead <= 16 && daysAhead >= -1;

  if (!isForecastable) {
    return NextResponse.json({
      source: "climate",
      message: "Date outside 16-day forecast window — showing monthly climatology only",
      forecast: [] as DayForecast[],
    });
  }

  const qs = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "weather_code",
      "sunrise",
      "sunset",
      "daylight_duration",
    ].join(","),
    timezone: "Europe/London",
    start_date: start,
    end_date: endStr,
  });

  try {
    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${qs}`, {
      next: { revalidate: 3600 },
    });
    if (!resp.ok) {
      return NextResponse.json(
        { error: `open-meteo ${resp.status}`, detail: await resp.text() },
        { status: 502 }
      );
    }
    const json = await resp.json() as { daily: OpenMeteoDaily };
    const d = json.daily;
    const forecast: DayForecast[] = d.time.map((date, i) => ({
      date,
      tempMaxC: d.temperature_2m_max[i],
      tempMinC: d.temperature_2m_min[i],
      precipMm: d.precipitation_sum[i] ?? 0,
      precipProbPct: d.precipitation_probability_max[i] ?? 0,
      windMaxKmh: d.wind_speed_10m_max[i],
      weatherCode: d.weather_code[i],
      sunriseIso: d.sunrise[i],
      sunsetIso: d.sunset[i],
      daylightHours: Math.round((d.daylight_duration[i] / 3600) * 10) / 10,
    }));
    return NextResponse.json({ source: "forecast", forecast });
  } catch (err) {
    return NextResponse.json(
      { error: "fetch_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
