-- Enable PostGIS for trail proximity queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Properties: B&Bs, hotels, glamping sites along the trail
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  property_type TEXT NOT NULL DEFAULT 'bnb', -- bnb, hotel, glamping, cottage, inn

  -- Location
  village TEXT NOT NULL,
  postcode TEXT,
  location GEOGRAPHY(POINT, 4326), -- GPS coordinates
  trail_distance_miles NUMERIC(4,2), -- verified distance from trail
  trail_distance_verified BOOLEAN DEFAULT false,
  trail_segment TEXT, -- e.g. "Chipping Campden to Broadway"
  day_on_trail INTEGER, -- which day of 7-day classic itinerary

  -- Details
  price_per_night INTEGER, -- in pence for accuracy
  currency TEXT DEFAULT 'GBP',
  rating NUMERIC(2,1),
  review_count INTEGER DEFAULT 0,

  -- Amenities (boolean flags)
  has_boot_dryer BOOLEAN DEFAULT false,
  has_luggage_transfer BOOLEAN DEFAULT false,
  has_laundry BOOLEAN DEFAULT false,
  has_packed_lunch BOOLEAN DEFAULT false,
  has_taxi_service BOOLEAN DEFAULT false,
  is_dog_friendly BOOLEAN DEFAULT false,
  is_eco_certified BOOLEAN DEFAULT false,
  has_wifi BOOLEAN DEFAULT false,
  has_parking BOOLEAN DEFAULT false,

  -- Host
  host_name TEXT,
  host_description TEXT,

  -- Images
  image_url TEXT,
  gallery_urls TEXT[], -- array of image URLs

  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rooms per property
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "King Ensuite (Garden View)"
  room_type TEXT NOT NULL, -- single, double, twin, family, suite
  max_occupancy INTEGER DEFAULT 2,
  price_per_night INTEGER, -- overrides property price if set
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Availability per room per date
CREATE TABLE availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  price_override INTEGER, -- optional price override for this date
  UNIQUE(room_id, date)
);

-- Bookings
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  property_id UUID REFERENCES properties(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  num_guests INTEGER DEFAULT 1,
  total_price INTEGER, -- in pence
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
  stripe_session_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_initials TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  walked_date TEXT, -- e.g. "May 2024"
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trail segments for the GPX route
CREATE TABLE trail_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- e.g. "Chipping Campden to Broadway"
  start_village TEXT NOT NULL,
  end_village TEXT NOT NULL,
  distance_miles NUMERIC(5,2),
  elevation_gain_ft INTEGER,
  difficulty TEXT, -- easy, moderate, strenuous
  day_number INTEGER, -- which day on 7-day classic
  description TEXT,
  route_geometry GEOGRAPHY(LINESTRING, 4326) -- the actual trail path
);

-- Itinerary templates
CREATE TABLE itinerary_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  total_days INTEGER,
  total_miles NUMERIC(5,1),
  direction TEXT, -- north_to_south, south_to_north, circular
  image_url TEXT,
  is_featured BOOLEAN DEFAULT false
);

-- Stops within an itinerary template
CREATE TABLE itinerary_stops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES itinerary_templates(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  village TEXT NOT NULL,
  label TEXT, -- e.g. "Start of Trail", "Historic Hub"
  mile_marker NUMERIC(5,1),
  notes TEXT
);

-- Create indexes for common queries
CREATE INDEX idx_properties_slug ON properties(slug);
CREATE INDEX idx_properties_village ON properties(village);
CREATE INDEX idx_properties_active ON properties(is_active) WHERE is_active = true;
CREATE INDEX idx_properties_location ON properties USING GIST(location);
CREATE INDEX idx_availability_room_date ON availability(room_id, date);
CREATE INDEX idx_availability_date ON availability(date) WHERE is_available = true;
CREATE INDEX idx_reviews_property ON reviews(property_id);
CREATE INDEX idx_trail_segments_day ON trail_segments(day_number);

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE trail_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Public read access for properties, rooms, availability, reviews, trail data
CREATE POLICY "Public read properties" ON properties FOR SELECT USING (true);
CREATE POLICY "Public read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Public read availability" ON availability FOR SELECT USING (true);
CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public read trail_segments" ON trail_segments FOR SELECT USING (true);
CREATE POLICY "Public read itinerary_templates" ON itinerary_templates FOR SELECT USING (true);
CREATE POLICY "Public read itinerary_stops" ON itinerary_stops FOR SELECT USING (true);
