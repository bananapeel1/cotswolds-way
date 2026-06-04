-- Routing helper SQL functions — applied AFTER osm2pgrouting has populated
-- the `ways` and `ways_vertices_pgr` tables (see scripts/ingest-osm-aonb.sh).
-- Apply with: psql "$SUPABASE_DB_URL" -f scripts/post-ingest-routing-functions.sql
--
-- Schema notes: osm2pgrouting v3 names the primary key `id` (not `gid`) and
-- the geometry column `geom` (not `the_geom`). This file is written against
-- the v3 schema.

-- Find the nearest routing vertex to an arbitrary lng/lat point. Used to
-- snap the start location to the path graph before invoking pgr_dijkstra.
CREATE OR REPLACE FUNCTION nearest_way_vertex(p_lng DOUBLE PRECISION, p_lat DOUBLE PRECISION)
RETURNS BIGINT
LANGUAGE SQL
STABLE
AS $$
  SELECT id
  FROM ways_vertices_pgr
  ORDER BY geom <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
  LIMIT 1;
$$;

-- Compute shortest path between two routing vertices and return the merged
-- LineString geometry plus a few summary stats. The route engine calls this
-- twice per candidate POI (outbound + return leg).
--
-- Cost preference: footpaths/bridleways/tracks are cheap, residential roads
-- mid, primary/secondary roads heavily penalised. The exact multipliers live
-- in scripts/mapconfig.xml and are baked into the ways.cost_off_road column
-- at ingest time.
CREATE OR REPLACE FUNCTION shortest_path_between(start_vid BIGINT, end_vid BIGINT)
RETURNS TABLE(
  geojson TEXT,
  total_m DOUBLE PRECISION,
  road_m DOUBLE PRECISION,
  edge_ids BIGINT[]
)
LANGUAGE SQL
STABLE
AS $$
  WITH path AS (
    SELECT seq, edge
    FROM pgr_dijkstra(
      'SELECT id, source, target, cost_off_road AS cost, reverse_cost_off_road AS reverse_cost FROM ways',
      start_vid, end_vid, directed := false
    )
    WHERE edge != -1
  ),
  joined AS (
    SELECT
      p.seq,
      w.geom,
      ST_Length(w.geom::geography) AS edge_m,
      -- Treat anything with cost_off_road > 2x raw length as road.
      -- See mapconfig.xml — footpath/bridleway priority is 1.0, residential
      -- is 3.0, so the cost-to-length ratio cleanly separates them.
      CASE WHEN w.cost_off_road > w.length_m * 2 THEN ST_Length(w.geom::geography) ELSE 0 END AS road_m,
      w.id AS edge_id
    FROM path p JOIN ways w ON w.id = p.edge
  )
  SELECT
    ST_AsGeoJSON(ST_LineMerge(ST_Collect(geom ORDER BY seq))) AS geojson,
    SUM(edge_m) AS total_m,
    SUM(road_m) AS road_m,
    array_agg(edge_id ORDER BY seq) AS edge_ids
  FROM joined;
$$;

-- Same as shortest_path_between but with a set of edges to avoid. Used for
-- the "return leg" so the loop doesn't retrace the outbound. Excluded edges
-- get a giant cost penalty rather than being removed (pgr_dijkstra needs the
-- full graph in scope to find any path at all if connectivity is sparse).
CREATE OR REPLACE FUNCTION shortest_path_avoiding(
  start_vid BIGINT,
  end_vid BIGINT,
  avoid_edges BIGINT[]
)
RETURNS TABLE(
  geojson TEXT,
  total_m DOUBLE PRECISION,
  road_m DOUBLE PRECISION,
  edge_ids BIGINT[]
)
LANGUAGE SQL
STABLE
AS $$
  WITH path AS (
    SELECT seq, edge
    FROM pgr_dijkstra(
      format(
        'SELECT id, source, target, '
        || 'CASE WHEN id = ANY(ARRAY[%s]::bigint[]) THEN cost_off_road * 8 ELSE cost_off_road END AS cost, '
        || 'CASE WHEN id = ANY(ARRAY[%s]::bigint[]) THEN reverse_cost_off_road * 8 ELSE reverse_cost_off_road END AS reverse_cost '
        || 'FROM ways',
        array_to_string(avoid_edges, ','), array_to_string(avoid_edges, ',')
      ),
      start_vid, end_vid, directed := false
    )
    WHERE edge != -1
  ),
  joined AS (
    SELECT
      p.seq,
      w.geom,
      ST_Length(w.geom::geography) AS edge_m,
      CASE WHEN w.cost_off_road > w.length_m * 2 THEN ST_Length(w.geom::geography) ELSE 0 END AS road_m,
      w.id AS edge_id
    FROM path p JOIN ways w ON w.id = p.edge
  )
  SELECT
    ST_AsGeoJSON(ST_LineMerge(ST_Collect(geom ORDER BY seq))),
    SUM(edge_m),
    SUM(road_m),
    array_agg(edge_id ORDER BY seq)
  FROM joined;
$$;

-- Convenience: pull POIs within a distance band around a start, filtered by
-- theme. The route engine calls this once per generateLoop() call to get
-- candidate midpoints. Distances are metres.
CREATE OR REPLACE FUNCTION candidate_midpoint_pois(
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
