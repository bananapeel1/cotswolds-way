"use client";

import { useEffect, useState } from "react";
import type { DayForecast } from "@/lib/weather";

interface ForecastState {
  loading: boolean;
  source: "forecast" | "climate" | null;
  forecast: DayForecast[];
  error: string | null;
}

/**
 * Fetches per-day forecast from the /api/weather route when the trip starts
 * within the 16-day forecast window. Outside that window, `source === "climate"`
 * and callers should fall back to WEATHER_DATA climatology.
 */
export function useForecast(startDate: string | undefined, days: number, lat = 51.75, lng = -2.20): ForecastState {
  const [state, setState] = useState<ForecastState>({
    loading: false,
    source: null,
    forecast: [],
    error: null,
  });

  useEffect(() => {
    if (!startDate || days < 1) {
      setState({ loading: false, source: null, forecast: [], error: null });
      return;
    }
    const ac = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    const qs = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      start: startDate,
      days: days.toString(),
    });
    fetch(`/api/weather?${qs}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setState({ loading: false, source: null, forecast: [], error: json.error });
          return;
        }
        setState({
          loading: false,
          source: json.source,
          forecast: json.forecast ?? [],
          error: null,
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState({ loading: false, source: null, forecast: [], error: err.message });
      });
    return () => ac.abort();
  }, [startDate, days, lat, lng]);

  return state;
}
