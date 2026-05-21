import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client for server-side writes that bypass RLS:
// route cache inserts (/api/routes/generate), seed scripts, backfills.
// Never import this into client components — leaking SUPABASE_SERVICE_ROLE_KEY
// to the browser would let anyone bypass row-level security.

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
