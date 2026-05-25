-- Fix: upsert_route — accept midpoint_poi_id as TEXT to bypass PostgREST
-- integer coercion.
--
-- PostgREST serialises JSON integers as 4-byte PostgreSQL INTEGER even when
-- the declared function parameter type is BIGINT, causing:
--   "value "6108476011791251" is out of range for type integer"
-- for OSM POI IDs that exceed INT4_MAX (2,147,483,647).
--
-- Switching p_midpoint_poi_id to TEXT causes PostgREST to serialise the JSON
-- number as its text representation ('6108476011791251'), which PostgreSQL can
-- safely cast to BIGINT.  The body of the function checks whether the
-- resulting BIGINT value actually exists in pois before using it; if not it
-- falls back to NULL so the route still persists and the UI uses the geometric
-- midpoint coordinate.
--
-- Compatible with all deployed application builds: they already pass either a
-- JS number or null for this field, both of which PostgREST maps cleanly to
-- TEXT.

CREATE OR REPLACE FUNCTION upsert_route(
  p_cache_key TEXT,
  p_start_lng DOUBLE PRECISION,
  p_start_lat DOUBLE PRECISION,
  p_theme TEXT,
  p_target_km NUMERIC,
  p_actual_km NUMERIC,
  p_ascent_m INTEGER,
  p_duration_min INTEGER,
  p_midpoint_poi_id TEXT DEFAULT NULL,   -- was BIGINT; TEXT avoids INT4 coercion
  p_geometry_geojson TEXT,
  p_score NUMERIC,
  p_narrative TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_is_seo_page BOOLEAN DEFAULT false,
  p_engine_version TEXT DEFAULT 'v1'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_poi_id BIGINT := NULL;
BEGIN
  -- Only use the POI FK if the text value looks like a non-negative integer
  -- AND the row actually exists in pois (otherwise silently drop it so the
  -- INSERT succeeds).
  IF p_midpoint_poi_id IS NOT NULL
     AND p_midpoint_poi_id ~ '^\d+$'
  THEN
    BEGIN
      v_poi_id := p_midpoint_poi_id::BIGINT;
      -- FK guard: verify the row exists before inserting the FK
      IF NOT EXISTS (SELECT 1 FROM pois WHERE id = v_poi_id) THEN
        v_poi_id := NULL;
      END IF;
    EXCEPTION WHEN numeric_value_out_of_range THEN
      v_poi_id := NULL;
    END;
  END IF;

  RETURN (
    INSERT INTO routes (
      cache_key, start_location, theme, target_km, actual_km,
      ascent_m, duration_min, midpoint_poi_id, geometry, score,
      narrative, slug, is_seo_page, engine_version, updated_at
    )
    VALUES (
      p_cache_key,
      ST_SetSRID(ST_MakePoint(p_start_lng, p_start_lat), 4326)::geography,
      p_theme, p_target_km, p_actual_km,
      p_ascent_m, p_duration_min, v_poi_id,
      ST_GeomFromGeoJSON(p_geometry_geojson)::geography,
      p_score, p_narrative, p_slug, p_is_seo_page, p_engine_version,
      now()
    )
    ON CONFLICT (cache_key) DO UPDATE SET
      actual_km      = EXCLUDED.actual_km,
      ascent_m       = EXCLUDED.ascent_m,
      duration_min   = EXCLUDED.duration_min,
      midpoint_poi_id = EXCLUDED.midpoint_poi_id,
      geometry       = EXCLUDED.geometry,
      score          = EXCLUDED.score,
      narrative      = EXCLUDED.narrative,
      updated_at     = now()
    RETURNING id
  );
END;
$$;
