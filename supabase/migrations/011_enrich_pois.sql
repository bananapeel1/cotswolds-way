-- Enrich the pois table with attributes the route engine needs for theming.
-- Existing columns (lat/lng/type/category/etc.) are unchanged — this is
-- additive only. Backfill of terrain_class and elevation_m happens in
-- scripts/backfill-poi-terrain.mjs.

ALTER TABLE pois
  ADD COLUMN IF NOT EXISTS elevation_m INTEGER,
  ADD COLUMN IF NOT EXISTS terrain_class TEXT
    CHECK (terrain_class IN ('ridge', 'valley', 'woodland', 'village', 'mixed')),
  ADD COLUMN IF NOT EXISTS scenic_score SMALLINT
    CHECK (scenic_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS is_lunch_stop BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pois_terrain_class ON pois(terrain_class)
  WHERE terrain_class IS NOT NULL;

-- Partial index: lunch-stop queries are the hot path, only ~5-10% of POIs
-- qualify, so a partial index keeps it small and selective.
CREATE INDEX IF NOT EXISTS idx_pois_is_lunch_stop ON pois(is_lunch_stop)
  WHERE is_lunch_stop = true;

-- A generated geography column lets the route engine use ST_DWithin /
-- nearest-neighbour operators against a GIST index without re-projecting
-- on every query. Generated from lat/lng so backfill is automatic.
ALTER TABLE pois
  ADD COLUMN IF NOT EXISTS geog GEOGRAPHY(POINT, 4326)
  GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_pois_geog ON pois USING GIST(geog);
