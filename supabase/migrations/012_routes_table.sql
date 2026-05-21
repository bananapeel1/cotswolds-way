-- Cache + storage for generated circular walks.
-- One row = one fully-generated loop, ready to render. The same table backs
-- ad-hoc postcode queries (cached after first generation) and the pre-seeded
-- SEO landing pages (rows where slug IS NOT NULL).

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cache key format: 'h3=<r7-cell>|km=<rounded>|theme=<theme>|v=<engine_version>'.
  -- Coarse on purpose: two postcodes in the same village share cache.
  cache_key TEXT UNIQUE NOT NULL,

  -- Where the loop starts/ends. NULL postcode is fine (e.g. SEO page seeded
  -- from a hardcoded village centre).
  start_postcode TEXT,
  start_location GEOGRAPHY(POINT, 4326) NOT NULL,

  -- Theme + length the loop was generated for. actual_km is what the engine
  -- produced after routing, which may be ±20% of target.
  theme TEXT NOT NULL CHECK (theme IN ('ridge', 'valley', 'woodland')),
  target_km NUMERIC(4,1) NOT NULL,
  actual_km NUMERIC(4,1) NOT NULL,

  -- Computed walking stats from the elevation profile + Tobler.
  ascent_m INTEGER NOT NULL,
  duration_min INTEGER NOT NULL,

  -- The lunch / midpoint POI the loop was anchored to.
  midpoint_poi_id BIGINT REFERENCES pois(id) ON DELETE SET NULL,

  -- The actual loop polyline. LINESTRING because we close the loop with the
  -- start point appearing as both first and last vertex.
  geometry GEOGRAPHY(LINESTRING, 4326) NOT NULL,

  -- scoreLoop() output. Used to compare candidate loops; persisted so we can
  -- evict low-scoring cached rows if better candidates appear later.
  score NUMERIC(3,2) NOT NULL CHECK (score >= 0 AND score <= 1),

  -- Gemini-generated narrative. Nullable because generation is async and we
  -- may want to insert a route row and back-fill narration later.
  narrative TEXT,

  -- SEO landing pages get a stable slug ('stow-on-the-wold-ridge-walk-12km').
  -- NULL for cached ad-hoc routes — they're addressable by id or cache_key.
  slug TEXT UNIQUE,
  is_seo_page BOOLEAN NOT NULL DEFAULT false,

  -- Bump on algorithm changes to invalidate. Old rows stay (SEO continuity).
  engine_version TEXT NOT NULL DEFAULT 'v1',

  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routes_cache_key ON routes(cache_key);
CREATE INDEX IF NOT EXISTS idx_routes_start_location ON routes USING GIST(start_location);
CREATE INDEX IF NOT EXISTS idx_routes_slug ON routes(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routes_seo ON routes(is_seo_page) WHERE is_seo_page = true;

-- Public read for /walks/[slug] pages. Writes happen via service-role from
-- the API route or seed script.
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for routes"
  ON routes FOR SELECT USING (true);

-- Upsert wrapper so the TS engine can pass geometry as GeoJSON text without
-- having to construct WKT or know about PostGIS internals.
CREATE OR REPLACE FUNCTION upsert_route(
  p_cache_key TEXT,
  p_start_lng DOUBLE PRECISION,
  p_start_lat DOUBLE PRECISION,
  p_theme TEXT,
  p_target_km NUMERIC,
  p_actual_km NUMERIC,
  p_ascent_m INTEGER,
  p_duration_min INTEGER,
  p_midpoint_poi_id BIGINT,
  p_geometry_geojson TEXT,
  p_score NUMERIC,
  p_narrative TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_is_seo_page BOOLEAN DEFAULT false,
  p_engine_version TEXT DEFAULT 'v1'
)
RETURNS UUID
LANGUAGE SQL
AS $$
  INSERT INTO routes (
    cache_key, start_location, theme, target_km, actual_km,
    ascent_m, duration_min, midpoint_poi_id, geometry, score,
    narrative, slug, is_seo_page, engine_version, updated_at
  )
  VALUES (
    p_cache_key,
    ST_SetSRID(ST_MakePoint(p_start_lng, p_start_lat), 4326)::geography,
    p_theme, p_target_km, p_actual_km,
    p_ascent_m, p_duration_min, p_midpoint_poi_id,
    ST_GeomFromGeoJSON(p_geometry_geojson)::geography,
    p_score, p_narrative, p_slug, p_is_seo_page, p_engine_version,
    now()
  )
  ON CONFLICT (cache_key) DO UPDATE SET
    actual_km = EXCLUDED.actual_km,
    ascent_m = EXCLUDED.ascent_m,
    duration_min = EXCLUDED.duration_min,
    midpoint_poi_id = EXCLUDED.midpoint_poi_id,
    geometry = EXCLUDED.geometry,
    score = EXCLUDED.score,
    narrative = EXCLUDED.narrative,
    updated_at = now()
  RETURNING id;
$$;

-- Read helper that returns geometry as GeoJSON and joins to pois for the
-- midpoint info the consumer wants on the rendered page.
CREATE OR REPLACE FUNCTION get_route_by_cache_key(p_cache_key TEXT)
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
  generated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    r.id, r.cache_key, r.theme, r.target_km, r.actual_km, r.ascent_m, r.duration_min,
    r.midpoint_poi_id,
    p.name, p.type, p.longitude, p.latitude, p.scenic_score, p.terrain_class, p.is_lunch_stop,
    ST_AsGeoJSON(r.geometry) AS geojson,
    r.score, r.narrative, r.slug, r.generated_at
  FROM routes r
  LEFT JOIN pois p ON p.id = r.midpoint_poi_id
  WHERE r.cache_key = p_cache_key
  LIMIT 1;
$$;

-- Set narrative on an existing cached row. Used by the API route after the
-- Gemini narration call completes (engine returns geometry first, narrative
-- streams in afterwards).
CREATE OR REPLACE FUNCTION set_route_narrative(p_cache_key TEXT, p_narrative TEXT)
RETURNS VOID
LANGUAGE SQL
AS $$
  UPDATE routes SET narrative = p_narrative, updated_at = now()
  WHERE cache_key = p_cache_key;
$$;
