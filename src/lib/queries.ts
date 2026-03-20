import { supabase } from "./supabase";

export async function getProperties(filters?: {
  maxDistance?: number;
  dogFriendly?: boolean;
  village?: string;
}) {
  let query = supabase
    .from("properties")
    .select("*")
    .eq("is_active", true)
    .order("trail_distance_miles", { ascending: true });

  if (filters?.maxDistance) {
    query = query.lte("trail_distance_miles", filters.maxDistance);
  }
  if (filters?.dogFriendly) {
    query = query.eq("is_dog_friendly", true);
  }
  if (filters?.village) {
    query = query.eq("village", filters.village);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getPropertyBySlug(slug: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data;
}

export async function getPropertyReviews(propertyId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getTrailSegments() {
  const { data, error } = await supabase
    .from("trail_segments")
    .select("*")
    .order("day_number", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getPropertiesWithCoordinates() {
  const { data, error } = await supabase.rpc("get_properties_with_coordinates");
  if (error) throw error;
  return data;
}

export async function getItineraryTemplates() {
  const { data, error } = await supabase
    .from("itinerary_templates")
    .select("*, itinerary_stops(*)")
    .eq("is_featured", true)
    .order("total_days", { ascending: true });

  if (error) throw error;
  return data;
}
