-- Two-tier routes model: SEO sample pages (is_seo_page = true, coarse cache
-- key) vs bespoke user-generated routes (is_seo_page = false, exact-start key).
-- This migration prepares the table for the bespoke tier.

-- 1. Allow the 'mixed' theme. Migration 012 only permitted ridge/valley/
--    woodland, but the /walks form and the API (RequestSchema) have offered
--    'mixed' since Milestone C — so mixed-theme routes were silently failing
--    the CHECK on persist (no cache row, hence no share link). The inline
--    column CHECK from 012 is auto-named routes_theme_check.
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_theme_check;
ALTER TABLE routes
  ADD CONSTRAINT routes_theme_check
  CHECK (theme IN ('ridge', 'valley', 'woodland', 'mixed'));

-- 2. Bespoke rows accumulate one row per unique exact-start request. They are
--    deterministic (same exact key + engine_version regenerates an identical
--    route), so they're safe to prune on a TTL. This partial index keeps a
--    future prune job cheap, e.g.:
--      DELETE FROM routes
--      WHERE is_seo_page = false AND updated_at < now() - interval '90 days';
--    SEO rows (is_seo_page = true) are never pruned.
CREATE INDEX IF NOT EXISTS idx_routes_bespoke_age
  ON routes(updated_at)
  WHERE is_seo_page = false;
