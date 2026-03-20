-- Deactivate The Royal Oak (pub with no rooms, £0/night)
UPDATE properties SET is_active = false WHERE slug = 'the-royal-oak-painswick';

-- Replace Westward House (fictional) with The White Hart Inn, Winchcombe
-- Real inn on the Cotswold Way, North Street, Winchcombe
UPDATE properties SET
  name = 'The White Hart Inn',
  slug = 'the-white-hart-winchcombe',
  description = 'A charming 16th-century coaching inn in the heart of Winchcombe, perfectly positioned on the Cotswold Way. Traditional English rooms with exposed beams, a welcoming pub serving local ales and hearty food, and a warm atmosphere for weary walkers.',
  property_type = 'inn',
  price_per_night = 12000,
  rating = 4.5,
  host_name = 'The White Hart Team',
  has_wifi = true,
  has_parking = true,
  has_breakfast = true,
  has_boot_dryer = true,
  has_luggage_transfer = false,
  is_dog_friendly = true,
  website_url = 'https://www.booking.com/hotel/gb/the-white-hart-inn-winchcombe.html',
  image_url = 'https://images.unsplash.com/photo-1659559108995-a41c413392d6?w=800&q=80'
WHERE slug = 'westward-house';

-- Replace Cold Ashton Manor (fictional) with The Cross Hands Hotel, Old Sodbury
-- Real hotel near the Cotswold Way, between Tormarton and Old Sodbury
UPDATE properties SET
  name = 'The Cross Hands Hotel',
  slug = 'the-cross-hands-hotel',
  description = 'A traditional English country hotel set in the rolling South Cotswold hills near Old Sodbury. Comfortable en-suite rooms, a well-regarded restaurant, and easy access to the Cotswold Way trail. An ideal stop for the final stretch before Bath.',
  property_type = 'hotel',
  price_per_night = 10500,
  rating = 4.2,
  host_name = 'Cross Hands Team',
  village = 'Old Sodbury',
  day_on_trail = 8,
  has_wifi = true,
  has_parking = true,
  has_breakfast = true,
  has_boot_dryer = false,
  has_luggage_transfer = false,
  is_dog_friendly = true,
  website_url = 'https://www.booking.com/hotel/gb/the-cross-hands.html',
  image_url = 'https://images.unsplash.com/photo-1568144465867-480a894ed663?w=800&q=80'
WHERE slug = 'cold-ashton-manor';

-- Also run the image updates from migration 006 if not already applied
-- The Lygon Arms - Cotswold stone village
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1670620800550-db7fcecb9e14?w=800&q=80' WHERE slug = 'the-lygon-arms';
-- Holly House B&B - English thatched cottage
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1654445112674-85c94a3eae7b?w=800&q=80' WHERE slug = 'holly-house-bnb';
-- The Mount Inn - Stone country pub
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1656758073960-029d21e0bc28?w=800&q=80' WHERE slug = 'the-mount-inn';
-- Cleeve Hill Hotel - Stone manor
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1567002260893-954a299f8c6b?w=800&q=80' WHERE slug = 'cleeve-hill-hotel';
-- Cardynham House - Cotswold village
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1670620800060-b90889e9f7d9?w=800&q=80' WHERE slug = 'cardynham-house';
-- Bear of Rodborough - Stone village
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1670620800615-4225fe6ecb75?w=800&q=80' WHERE slug = 'bear-of-rodborough';
-- The Old Fleece - Stone building
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1583070507082-46fd6544694d?w=800&q=80' WHERE slug = 'the-old-fleece';
-- The Dog Inn - Country pub
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1676658885720-c879560dbafd?w=800&q=80' WHERE slug = 'old-sodbury-dog-inn';
-- The Swan Hotel - Cotswold stone
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1649182357947-0790cad72a94?w=800&q=80' WHERE slug = 'the-swan-wotton';
