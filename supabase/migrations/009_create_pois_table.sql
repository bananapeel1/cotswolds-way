-- Points of interest along the Cotswold Way corridor
-- Sourced from OpenStreetMap via Overpass API, filtered to within 2.5km of trail
CREATE TABLE IF NOT EXISTS pois (
  id BIGINT PRIMARY KEY,                -- OSM element ID
  type TEXT NOT NULL,                    -- pub, cafe, water, toilets, etc.
  category TEXT NOT NULL,                -- food, water, facilities, transport, services, outdoors
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  distance_from_trail INTEGER NOT NULL DEFAULT 0, -- meters from nearest point on trail
  opening_hours TEXT,
  phone TEXT,
  website TEXT,
  cuisine TEXT,
  wheelchair TEXT,
  fee TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pois_type ON pois(type);
CREATE INDEX IF NOT EXISTS idx_pois_category ON pois(category);
CREATE INDEX IF NOT EXISTS idx_pois_latitude ON pois(latitude);

-- Enable RLS with public read
ALTER TABLE pois ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for pois" ON pois FOR SELECT USING (true);
