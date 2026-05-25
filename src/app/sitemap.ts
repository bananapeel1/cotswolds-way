import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const properties = require("@/data/properties.json") as { slug: string }[];

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://thecotswoldsway.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/plan`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/explore`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/walks`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/safety`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/weather`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE_URL}/news`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/accessibility`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const propertyPages: MetadataRoute.Sitemap = properties.map((p) => ({
    url: `${BASE_URL}/property/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // ─── SEO walk pages ────────────────────────────────────────────────────────
  // Fetch all pre-seeded walk slugs from Supabase. The public anon key is
  // sufficient — routes.is_seo_page = true rows are publicly readable.
  // Uses a 5 s AbortSignal so a Supabase blip doesn't hang the build.
  let walkPages: MetadataRoute.Sitemap = [];
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const sb = createClient(url, key, {
        global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }) },
      });
      const { data } = await sb
        .from("routes")
        .select("slug, updated_at")
        .eq("is_seo_page", true)
        .not("slug", "is", null)
        .order("updated_at", { ascending: false });

      walkPages = (data ?? []).map((r) => ({
        url: `${BASE_URL}/walks/${r.slug}`,
        lastModified: r.updated_at ?? now,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // Non-fatal — sitemap ships without walk pages rather than breaking the build.
  }

  return [...staticPages, ...propertyPages, ...walkPages];
}
