import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/pois
 *
 * Fetches points of interest along the Cotswold Way from Supabase.
 * POIs are pre-filtered to within 2.5km of the trail (seeded via scripts/seed-pois.ts).
 */

export interface POI {
  id: number;
  type: string;
  category: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceFromTrail: number;
  tags: Record<string, string>;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("pois")
      .select("id, type, category, name, latitude, longitude, distance_from_trail, opening_hours, phone, website, cuisine, wheelchair, fee")
      .order("distance_from_trail", { ascending: true });

    if (error) {
      console.error("Supabase POI fetch error:", error.message);
      return NextResponse.json({ error: "Failed to fetch POI data", pois: [] }, { status: 500 });
    }

    // Transform to match the frontend POI interface
    const pois: POI[] = (data || []).map((row) => ({
      id: row.id,
      type: row.type,
      category: row.category,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      distanceFromTrail: row.distance_from_trail,
      tags: {
        ...(row.opening_hours ? { opening_hours: row.opening_hours } : {}),
        ...(row.phone ? { phone: row.phone } : {}),
        ...(row.website ? { website: row.website } : {}),
        ...(row.cuisine ? { cuisine: row.cuisine } : {}),
        ...(row.wheelchair ? { wheelchair: row.wheelchair } : {}),
        ...(row.fee ? { fee: row.fee } : {}),
      },
    }));

    return NextResponse.json({ pois, cached: false, count: pois.length });
  } catch (error) {
    console.error("POI fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch POI data", pois: [] }, { status: 500 });
  }
}
