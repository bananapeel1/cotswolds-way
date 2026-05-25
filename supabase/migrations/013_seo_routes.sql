-- Phase 3: SEO walk pages
--
-- 1. Widen the theme CHECK to include 'mixed' (introduced in Milestone C;
--    the original migration only listed ridge/valley/woodland).
-- 2. get_route_by_slug — lookup for /walks/[slug] server component.
-- 3. get_nearby_properties — "Stay nearby" panel via ST_DWithin.
-- 4. set_route_seo_slug — seed script stamps cached rows as SEO pages.

-- ─── 1. Widen theme constraint ───────────────────────────────────────────────
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_theme_check;
ALTER TABLE routes ADD CONSTRAINT routes_theme_check
  CHECK (theme IN ('ridge', 'valley', 'woodland', 'mixed'));

-- ─── 2. get_route_by_slug ────────────────────────────────────────────────────
-- Returns the same fields as get_route_by_cache_key plus the start point
-- (extracted from the GEOGRAPHY column) so the SEO page can position the
-- "Stay nearby" radius correctly.
CREATE OR REPLACE FUNCTION get_route_by_slug(p_slug TEXT)
RETURNS TABLE(
  id UUID,
  cache_key TEXT,
  theme TEXT,
  target_km NUMERIC,
  actual_km NUMERIC,
  ascent_m INTEGER,
  duration_min INTEGER,
  midpoint_poi_id BIGINT,
  midpoint_name TEXT,
  midpoint_type TEXT,
  midpoint_lng DOUBLE PRECISION,
  midpoint_lat DOUBLE PRECISION,
  midpoint_scenic_score SMALLINT,
  midpoint_terrain_class TEXT,
  midpoint_is_lunch_stop BOOLEAN,
  geojson TEXT,
  score NUMERIC,
  narrative TEXT,
  slug TEXT,
  start_lat DOUBLE PRECISION,
  start_lng DOUBLE PRECISION,
  generated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    r.id,
    r.cache_key,
    r.theme,
    r.target_km,
    r.actual_km,
    r.ascent_m,
    r.duration_min,
    r.midpoint_poi_id,
    p.name             AS midpoint_name,
    p.type             AS midpoint_type,
    p.longitude        AS midpoint_lng,
    p.latitude         AS midpoint_lat,
    p.scenic_score     AS midpoint_scenic_score,
    p.terrain_class    AS midpoint_terrain_class,
    p.is_lunch_stop    AS midpoint_is_lunch_stop,
    ST_AsGeoJSON(r.geometry)             AS geojson,
    r.score,
    r.narrative,
    r.slug,
    ST_Y(r.start_location::geometry)     AS start_lat,
    ST_X(r.start_location::geometry)     AS start_lng,
    r.generated_at
  FROM routes r
  LEFT JOIN pois p ON p.id = r.midpoint_poi_id
  WHERE r.slug = p_slug
    AND r.is_seo_page = true
  LIMIT 1;
$$;

-- ─── 3. get_nearby_properties ────────────────────────────────────────────────
-- Returns properties within p_radius_m of (p_lat, p_lng), ordered by
-- distance. Used by the "Stay nearby" server component on walk SEO pages.
-- Default radius: 10 km.
CREATE OR REPLACE FUNCTION get_nearby_properties(
  p_lat      DOUBLE PRECISION,
  p_lng      DOUBLE PRECISION,
  p_radius_m INTEGER DEFAULT 10000
)
RETURNS TABLE(
  slug            TEXT,
  name            TEXT,
  village         TEXT,
  property_type   TEXT,
  price_per_night INTEGER,
  rating          NUMERIC,
  review_count    INTEGER,
  image_url       TEXT,
  distance_m      INTEGER
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    pr.slug,
    pr.name,
    pr.village,
    pr.property_type,
    pr.price_per_night,
    pr.rating,
    pr.review_count,
    pr.image_url,
    ST_Distance(
      pr.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    )::INTEGER AS distance_m
  FROM properties pr
  WHERE pr.is_active = true
    AND pr.location IS NOT NULL
    AND ST_DWithin(
          pr.location,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_radius_m
        )
  ORDER BY distance_m
  LIMIT 6;
$$;

-- ─── 4. set_route_seo_slug ───────────────────────────────────────────────────
-- Stamps an existing cached route as an SEO landing page. The seed script
-- calls this after generating each route via /api/routes/generate.
CREATE OR REPLACE FUNCTION set_route_seo_slug(p_cache_key TEXT, p_slug TEXT)
RETURNS VOID
LANGUAGE SQL
AS $$
  UPDATE routes
  SET
    slug        = p_slug,
    is_seo_page = true,
    updated_at  = now()
  WHERE cache_key = p_cache_key;
$$;
