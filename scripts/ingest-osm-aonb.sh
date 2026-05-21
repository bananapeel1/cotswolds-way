#!/usr/bin/env bash
#
# One-shot OSM ingest for the Cotswolds AONB walking-route graph.
#
# Prerequisites (install once via Homebrew on macOS):
#   brew install osmium-tool osm2pgrouting postgresql
#
# Required env vars (export before running):
#   SUPABASE_DB_URL — direct connection string (NOT the pooler port).
#                     Format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
#                     Find at: Supabase dashboard → Project Settings → Database → Connection string → URI
#
# What this script does:
#   1. Downloads the Geofabrik England OSM extract (~700 MB).
#   2. Clips to the Cotswolds AONB bounding box using osmium (~30-60 MB result).
#   3. Runs osm2pgrouting against Supabase to populate `ways` + `ways_vertices_pgr`.
#   4. Adds derived `cost_off_road` columns the route engine relies on.
#   5. Applies post-ingest SQL functions (nearest_way_vertex, shortest_path_*).
#
# Re-runs are destructive on the routing tables only; nothing else in the
# database is touched. Plan on ~15-30 minutes total wallclock.

set -euo pipefail

# AONB bbox (roughly): south=51.3 west=-2.7 north=52.2 east=-1.5
# Buffer pad of ~0.1° so loops near the AONB edge don't run out of graph.
BBOX_W="-2.8"
BBOX_S="51.2"
BBOX_E="-1.4"
BBOX_N="52.3"

WORK_DIR="${WORK_DIR:-./tmp-osm-ingest}"
ENGLAND_PBF="${WORK_DIR}/england-latest.osm.pbf"
AONB_PBF="${WORK_DIR}/cotswolds-aonb.osm.pbf"
MAPCONFIG="$(dirname "$0")/mapconfig.xml"

mkdir -p "$WORK_DIR"

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Error: SUPABASE_DB_URL is not set." >&2
  echo "Get the URI from Supabase dashboard → Project Settings → Database (port 5432, NOT the 6543 pooler)." >&2
  exit 1
fi

echo "[1/5] Downloading England OSM extract (if not cached)..."
if [ ! -f "$ENGLAND_PBF" ]; then
  curl -L -o "$ENGLAND_PBF" \
    "https://download.geofabrik.de/europe/united-kingdom/england-latest.osm.pbf"
else
  echo "      Cached: $ENGLAND_PBF"
fi

echo "[2/5] Clipping to Cotswolds AONB bbox..."
osmium extract \
  --bbox "${BBOX_W},${BBOX_S},${BBOX_E},${BBOX_N}" \
  --overwrite \
  -o "$AONB_PBF" \
  "$ENGLAND_PBF"

echo "      Clipped extract: $(du -h "$AONB_PBF" | cut -f1)"

echo "[3/5] Parsing connection string for osm2pgrouting..."
# osm2pgrouting takes individual flags, not a URI. Parse the SUPABASE_DB_URL.
# Format: postgresql://USER:PASS@HOST:PORT/DBNAME
PG_USER=$(echo "$SUPABASE_DB_URL" | sed -nE 's|^postgresql://([^:]+):.*|\1|p')
PG_PASS=$(echo "$SUPABASE_DB_URL" | sed -nE 's|^postgresql://[^:]+:([^@]+)@.*|\1|p')
PG_HOST=$(echo "$SUPABASE_DB_URL" | sed -nE 's|^postgresql://[^@]+@([^:]+):.*|\1|p')
PG_PORT=$(echo "$SUPABASE_DB_URL" | sed -nE 's|^postgresql://[^@]+@[^:]+:([0-9]+).*|\1|p')
PG_DB=$(echo "$SUPABASE_DB_URL"   | sed -nE 's|^postgresql://[^/]+/(.+)$|\1|p')

if [ -z "$PG_HOST" ] || [ -z "$PG_DB" ]; then
  echo "Error: failed to parse SUPABASE_DB_URL." >&2
  exit 1
fi

echo "[4/5] Running osm2pgrouting (~5-15 min for AONB-sized extract)..."
PGPASSWORD="$PG_PASS" osm2pgrouting \
  --file "$AONB_PBF" \
  --conf "$MAPCONFIG" \
  --dbname "$PG_DB" \
  --username "$PG_USER" \
  --host "$PG_HOST" \
  --port "$PG_PORT" \
  --clean

echo "[5/5] Adding cost_off_road column and applying routing helper functions..."
psql "$SUPABASE_DB_URL" <<'SQL'
-- Add a cost column that's a function of length × highway priority.
-- The mapconfig.xml priority is loaded into the configuration table at ingest;
-- we read it back to compute cost_off_road = length_m * priority.
--
-- For osm2pgrouting v2+ the priority is stored on `osm_way_classes` and
-- joined via `ways.class_id`. Fall back to a length-only cost if the join
-- fails so the route engine still works degraded.
ALTER TABLE ways
  ADD COLUMN IF NOT EXISTS cost_off_road DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS reverse_cost_off_road DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS length_m DOUBLE PRECISION;

UPDATE ways w
SET
  length_m = ST_Length(w.the_geom::geography),
  cost_off_road = ST_Length(w.the_geom::geography)
    * COALESCE((SELECT priority FROM configuration c WHERE c.id = w.class_id), 1.0),
  reverse_cost_off_road = ST_Length(w.the_geom::geography)
    * COALESCE((SELECT priority FROM configuration c WHERE c.id = w.class_id), 1.0);

-- Index for routing performance.
CREATE INDEX IF NOT EXISTS idx_ways_source ON ways(source);
CREATE INDEX IF NOT EXISTS idx_ways_target ON ways(target);
CREATE INDEX IF NOT EXISTS idx_ways_geom ON ways USING GIST(the_geom);
CREATE INDEX IF NOT EXISTS idx_ways_vertices_geom ON ways_vertices_pgr USING GIST(the_geom);
SQL

psql "$SUPABASE_DB_URL" -f "$(dirname "$0")/post-ingest-routing-functions.sql"

echo
echo "Ingest complete. Quick verification:"
psql "$SUPABASE_DB_URL" -c "SELECT count(*) AS ways FROM ways;"
psql "$SUPABASE_DB_URL" -c "SELECT count(*) AS vertices FROM ways_vertices_pgr;"
echo
echo "Try a smoke-test routing query:"
echo "  psql \"\$SUPABASE_DB_URL\" -c \"SELECT * FROM pgr_dijkstra("
echo "    'SELECT gid AS id, source, target, cost_off_road AS cost, reverse_cost_off_road AS reverse_cost FROM ways',"
echo "    (SELECT id FROM ways_vertices_pgr LIMIT 1),"
echo "    (SELECT id FROM ways_vertices_pgr OFFSET 100 LIMIT 1)) LIMIT 5;\""
