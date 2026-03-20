-- Function to return properties with extracted coordinates for the map
CREATE OR REPLACE FUNCTION get_properties_with_coordinates()
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  village text,
  price_per_night integer,
  rating numeric,
  property_type text,
  day_on_trail integer,
  longitude float,
  latitude float
) AS $$
  SELECT
    p.id, p.slug, p.name, p.village, p.price_per_night, p.rating,
    p.property_type, p.day_on_trail,
    ST_X(p.location::geometry) as longitude,
    ST_Y(p.location::geometry) as latitude
  FROM properties p
  WHERE p.is_active = true
  ORDER BY p.day_on_trail;
$$ LANGUAGE sql;
