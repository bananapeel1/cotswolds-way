-- Enable pgRouting for circular-walk generation.
-- The actual `ways` / `ways_vertices_pgr` tables are created by the
-- `osm2pgrouting` CLI during the one-off OSM ingest (see
-- scripts/ingest-osm-aonb.sh). This migration only ensures the extension
-- is available; the routing helper functions live in
-- scripts/post-ingest-routing-functions.sql and are applied after ingest.

CREATE EXTENSION IF NOT EXISTS pgrouting;
