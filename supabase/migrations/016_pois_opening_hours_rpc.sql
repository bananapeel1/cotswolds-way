-- Surface opening_hours from pois through the routing RPCs so the engine can
-- filter midpoint candidates by whether the pub is actually open on the
-- walker's chosen date. Three functions change return-type signature:
--
--   candidate_midpoint_pois  → adds opening_hours TEXT
--   get_route_by_cache_key   → adds midpoint_opening_hours TEXT
--   get_route_by_slug        → adds midpoint_opening_hours TEXT
--
-- A column-list change to a RETURNS TABLE function is a signature change, so
-- CREATE OR REPLACE will fail with "cannot change return type" — we DROP each
-- function first. No data migration; pois.opening_hours has been populated
-- by the OSM ingest (column added in 009) but was previously never read by
-- the route engine.

-- ─── 1. candidate_midpoint_pois ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS candidate_midpoint_pois(
  DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INT
);

CREATE FUNCTION candidate_midpoint_pois(
  start_lng DOUBLE PRECISION,
  start_lat DOUBLE PRECISION,
  theme_filter TEXT,
  band_lo_m DOUBLE PRECISION,
  band_hi_m DOUBLE PRECISION,
  max_candidates INT DEFAULT 5
)
RETURNS TABLE(
  id BIGINT,
  name TEXT,
  type TEXT,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  scenic_score SMALLINT,
  terrain_class TEXT,
  is_lunch_stop BOOLEAN,
  opening_hours TEXT,
  distance_m DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
AS $$
  WITH start_geog AS (
    SELECT ST_SetSRID(ST_MakePoint(start_lng, start_lat), 4326)::geography AS g
  )
  SELECT
    p.id, p.name, p.type, p.longitude, p.latitude,
    p.scenic_score, p.terrain_class, p.is_lunch_stop, p.opening_hours,
    ST_Distance(p.geog, (SELECT g FROM start_geog)) AS distance_m
  FROM pois p, start_geog
  WHERE
    ST_DWithin(p.geog, start_geog.g, band_hi_m)
    AND NOT ST_DWithin(p.geog, start_geog.g, band_lo_m)
    AND CASE theme_filter
      WHEN 'ridge'    THEN p.terrain_class = 'ridge'    OR (p.type = 'viewpoint' AND COALESCE(p.elevation_m, 0) >= 200)
      WHEN 'valley'   THEN p.terrain_class = 'valley'   OR p.type IN ('river', 'spring', 'mill')
      WHEN 'woodland' THEN p.terrain_class = 'woodland'
      ELSE true
    END
  ORDER BY COALESCE(p.scenic_score, 5) DESC, distance_m ASC
  LIMIT max_candidates;
$$;

-- ─── 2. get_route_by_cache_key ──────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_route_by_cache_key(TEXT);

CREATE FUNCTION get_route_by_cache_key(p_cache_key TEXT)
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
  midpoint_opening_hours TEXT,
  geojson TEXT,
  score NUMERIC,
  narrative TEXT,
  slug TEXT,
  generated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    r.id, r.cache_key, r.theme, r.target_km, r.actual_km, r.ascent_m, r.duration_min,
    r.midpoint_poi_id,
    p.name, p.type, p.longitude, p.latitude, p.scenic_score, p.terrain_class,
    p.is_lunch_stop, p.opening_hours,
    ST_AsGeoJSON(r.geometry) AS geojson,
    r.score, r.narrative, r.slug, r.generated_at
  FROM routes r
  LEFT JOIN pois p ON p.id = r.midpoint_poi_id
  WHERE r.cache_key = p_cache_key
  LIMIT 1;
$$;

-- ─── 3. get_route_by_slug ───────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_route_by_slug(TEXT);

CREATE FUNCTION get_route_by_slug(p_slug TEXT)
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
  midpoint_opening_hours TEXT,
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
    r.id, r.cache_key, r.theme, r.target_km, r.actual_km, r.ascent_m, r.duration_min,
    r.midpoint_poi_id,
    p.name             AS midpoint_name,
    p.type             AS midpoint_type,
    p.longitude        AS midpoint_lng,
    p.latitude         AS midpoint_lat,
    p.scenic_score     AS midpoint_scenic_score,
    p.terrain_class    AS midpoint_terrain_class,
    p.is_lunch_stop    AS midpoint_is_lunch_stop,
    p.opening_hours    AS midpoint_opening_hours,
    ST_AsGeoJSON(r.geometry) AS geojson,
    r.score, r.narrative, r.slug,
    ST_Y(r.start_location::geometry) AS start_lat,
    ST_X(r.start_location::geometry) AS start_lng,
    r.generated_at
  FROM routes r
  LEFT JOIN pois p ON p.id = r.midpoint_poi_id
  WHERE r.slug = p_slug
    AND r.is_seo_page = true
  LIMIT 1;
$$;
