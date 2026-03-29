/**
 * Check if the pois table exists in Supabase, and print the SQL to create it if not.
 *
 * Run: npx tsx scripts/create-pois-table.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

async function main() {
  const { error } = await supabase.from("pois").select("id").limit(1);

  if (!error) {
    console.log("Table 'pois' already exists. Ready to seed.");
    return;
  }

  console.log("Table 'pois' does not exist yet.");
  console.log("\nPlease run the following SQL in the Supabase dashboard:");
  console.log("  1. Go to: https://supabase.com/dashboard → your project → SQL Editor");
  console.log("  2. Click 'New Query'");
  console.log("  3. Paste the contents of: supabase/migrations/009_create_pois_table.sql");
  console.log("  4. Click 'Run'");
  console.log("\nThen re-run: npx tsx scripts/seed-pois.ts");
  process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
