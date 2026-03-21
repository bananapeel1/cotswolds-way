-- ============================================================
-- Migration 008: Add real Cotswold Way accommodations
-- Adds campsites, glamping, hostels, hotels, B&Bs, inns
-- All verified real places along the trail
-- ============================================================

-- First: run migration 007 fixes (idempotent)
UPDATE properties SET is_active = false WHERE slug = 'the-royal-oak-painswick';

-- ============================================================
-- NEW PROPERTIES: Hotels, Inns, B&Bs
-- ============================================================

-- Chipping Campden: Noel Arms Hotel
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('noel-arms-hotel', 'Noel Arms Hotel', 'A historic 14th-century coaching inn with 28 en-suite rooms right next to the Cotswold Way start marker in Chipping Campden. Features open log fires, award-winning food, and a welcoming atmosphere for walkers beginning their journey.', 'Historic coaching inn at the trail start', 'hotel', 'Chipping Campden', 'GL55 6AT', ST_MakePoint(-1.7793, 52.0527)::geography, 0.1, true, 'Start of Trail', 1, 15500, 4.3, 142, true, true, false, false, true, true, false, true, true, 'Noel Arms Team', 'Welcoming walkers since the 14th century', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Chipping Campden: Eight Bells Inn
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('eight-bells-inn', 'Eight Bells Inn', 'Dating from the 14th century, this charming inn has six en-suite bedrooms with original beamed ceilings and views of St James'' Church. Includes full English breakfast and a roaring fire in winter — the perfect start to your Cotswold Way adventure.', 'Medieval inn with beamed rooms', 'inn', 'Chipping Campden', 'GL55 6JE', ST_MakePoint(-1.7796, 52.0536)::geography, 0.05, true, 'Start of Trail', 1, 14000, 4.4, 98, true, false, false, false, false, true, false, true, false, 'Eight Bells Team', 'Keepers of Campden heritage', 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Chipping Campden: Bantam Tea Rooms B&B
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('bantam-tea-rooms', 'Bantam Tea Rooms & B&B', 'Built in 1693, this character property combines an English tea room with cosy B&B accommodation. Right at the start of the Cotswold Way — popular with keen walkers who want a charming first-night stay before hitting the trail.', 'Historic tea room with B&B rooms', 'bnb', 'Chipping Campden', 'GL55 6HB', ST_MakePoint(-1.7788, 52.0525)::geography, 0.1, true, 'Start of Trail', 1, 10500, 4.6, 76, false, false, false, false, false, false, false, true, false, 'Bantam Team', 'Serving walkers since 1693', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Broadway: The Broadway Hotel
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('the-broadway-hotel', 'The Broadway Hotel', 'A cosy 16th-century inn with 19 individually named bedrooms and seven self-catering cottages. Receives excellent reviews for its hearty breakfast, perfect fuel for a day on the Cotswold Way escarpment.', 'Charming 16th-century village hotel', 'hotel', 'Broadway', 'WR12 7AA', ST_MakePoint(-1.8565, 52.0365)::geography, 0.1, true, 'Chipping Campden to Broadway', 2, 14000, 4.3, 156, true, true, true, true, false, true, false, true, true, 'Broadway Hotel Team', 'Broadway''s village heart since the 1500s', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Broadway: Russell's of Broadway
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('russells-of-broadway', 'Russell''s of Broadway', 'A chic seven-room boutique restaurant-with-rooms almost right on the Cotswold Way. Historic stone building with comfortable modern interiors and luxurious touches, plus outstanding seasonal cuisine from the award-winning kitchen.', 'Boutique restaurant with rooms', 'hotel', 'Broadway', 'WR12 7AP', ST_MakePoint(-1.8558, 52.0363)::geography, 0.1, true, 'Chipping Campden to Broadway', 2, 18500, 4.6, 87, false, false, false, false, false, false, false, true, false, 'Russell''s Team', 'Award-winning hospitality', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Winchcombe: Wesley House B&B
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('wesley-house-bnb', 'Wesley House B&B', 'A Tudor-style building with five beautifully appointed rooms in the heart of Winchcombe. Known for outstanding breakfasts and warm hospitality — a favourite overnight stop for Cotswold Way walkers passing through this historic town.', 'Tudor B&B with outstanding breakfasts', 'bnb', 'Winchcombe', 'GL54 5LJ', ST_MakePoint(-1.9652, 51.9536)::geography, 0.2, true, 'Broadway to Winchcombe', 3, 14500, 4.7, 112, true, false, false, false, false, false, false, true, false, 'Wesley House Team', 'Winchcombe hospitality experts', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Cleeve Hill: The Rising Sun Hotel
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('rising-sun-cleeve-hill', 'The Rising Sun Hotel', 'A Victorian country hotel perched atop Cleeve Hill, the highest point in the Cotswolds at 330 metres. Twenty-four rooms with spectacular views across five counties — directly on the Cotswold Way with deep baths that walkers absolutely love.', 'Victorian hotel at the trail''s summit', 'hotel', 'Cleeve Hill', 'GL52 3PX', ST_MakePoint(-2.0070, 51.9310)::geography, 0.05, true, 'Winchcombe to Cleeve Hill', 3, 11500, 3.8, 94, true, false, false, false, false, true, false, true, true, 'Rising Sun Team', 'Hilltop hospitality', 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Birdlip: Royal George Hotel
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('royal-george-birdlip', 'Royal George Hotel', 'An 18th-century hotel set in 26 acres of grounds directly on the Cotswold Way near Birdlip. Thirty-four individually styled en-suite rooms, a welcoming pub, heated terrace, and live music evenings to soothe tired walking legs.', '18th-century trail-side hotel', 'hotel', 'Birdlip', 'GL4 8JH', ST_MakePoint(-2.1010, 51.8280)::geography, 0.1, true, 'Cleeve Hill to Birdlip', 4, 9500, 3.7, 78, true, false, false, false, false, true, false, true, true, 'Royal George Team', 'Historic Cotswold hospitality', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Painswick: The Painswick (boutique hotel)
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('the-painswick', 'The Painswick', 'A picture-perfect Palladian boutique hotel in the "Queen of the Cotswolds." Seventeen stylish rooms with valley views, striking interiors with panelled walls, and an excellent restaurant. Complimentary access to the Painswick Rococo Garden.', 'Palladian boutique hotel', 'hotel', 'Painswick', 'GL6 6YB', ST_MakePoint(-2.1880, 51.7880)::geography, 0.2, true, 'Birdlip to Painswick', 5, 22000, 4.7, 134, false, true, true, false, true, true, false, true, true, 'The Painswick Team', 'Boutique Cotswold luxury', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Painswick: The Falcon Inn
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('the-falcon-painswick', 'The Falcon Inn', 'Dating to 1554, this Georgian townhouse in the centre of Painswick has 11 characterful en-suite bedrooms furnished with antiques and original artwork. Enjoy views over St Mary''s Church and its famous 99 yew trees from the garden terrace.', 'Tudor inn with antique-filled rooms', 'inn', 'Painswick', 'GL6 6UN', ST_MakePoint(-2.1870, 51.7875)::geography, 0.1, true, 'Birdlip to Painswick', 5, 14500, 4.3, 98, true, false, false, true, false, true, false, true, true, 'Falcon Inn Team', 'Painswick hospitality since 1554', 'https://images.unsplash.com/photo-1587381420270-3e1a5b9e6904?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Stroud area: The Star Inn, Whiteshill
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('the-star-inn-whiteshill', 'The Star Inn', 'A friendly walker''s pub with rooms located just 10 minutes'' walk from the Cotswold Way near Stroud. Can arrange lifts to and from the trail, prepare packed lunches, and all rooms welcome dogs. Serves delicious locally sourced meals.', 'Walker-friendly pub with trail transfers', 'inn', 'Whiteshill', 'GL6 6AG', ST_MakePoint(-2.2460, 51.7650)::geography, 0.4, true, 'Painswick to King''s Stanley', 5, 9500, 4.2, 65, true, false, false, true, true, true, false, true, true, 'Star Inn Team', 'Walking holiday specialists', 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Dursley area: Forthay B&B, North Nibley
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('forthay-bnb', 'Forthay B&B', 'A charming 17th-century Cotswold stone farmhouse between Dursley and North Nibley, directly on the Cotswold Way. Three comfortable bedrooms, a guest lounge with woodburner, licensed bar, and evening meals available by prior arrangement.', 'Stone farmhouse B&B on the trail', 'bnb', 'North Nibley', 'GL11 6DT', ST_MakePoint(-2.3600, 51.6680)::geography, 0.1, true, 'King''s Stanley to Dursley', 6, 9500, 4.7, 54, true, false, false, true, false, true, false, true, true, 'Forthay Hosts', '17th-century trail-side hospitality', 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Wotton-under-Edge: Carlton House B&B
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('carlton-house-bnb', 'Carlton House B&B', 'A historic house in the centre of Wotton-under-Edge, right on the Cotswold Way. Self-catering apartment with twin beds, shower room, sofa bed, and a fully fitted kitchen including washer-dryer — ideal for flexible walkers.', 'Self-catering apartment on the trail', 'bnb', 'Wotton-under-Edge', 'GL12 7AD', ST_MakePoint(-2.3495, 51.6335)::geography, 0.1, true, 'Dursley to Wotton-under-Edge', 6, 8000, 4.5, 42, false, false, true, false, false, false, false, true, false, 'Carlton House Team', 'Wotton self-catering specialists', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Tormarton: The Compass Inn
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('compass-inn-tormarton', 'The Compass Inn', 'An 18th-century coaching inn with 26 bedrooms set in 6 acres of gardens near Tormarton. Two restaurants, a warm bar, and a convenient location just off the Cotswold Way for the penultimate stretch into Bath.', 'Georgian coaching inn in 6 acres', 'hotel', 'Tormarton', 'GL9 1JB', ST_MakePoint(-2.3410, 51.5110)::geography, 0.3, true, 'Wotton-under-Edge to Old Sodbury', 7, 10000, 3.8, 88, true, false, false, false, false, true, false, true, true, 'Compass Inn Team', 'M4 corridor hospitality', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Cold Ashton: Whittington Farm B&B
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('whittington-farm-bnb', 'Whittington Farm B&B', 'Directly on the Cotswold Way beside Cold Ashton church, just 5 miles north of Bath. A twin and double room with separate entrance, wet room, and a guest garden room with woodburner and pool. Consistently rated as surpassing many five-star hotels.', 'Farmhouse B&B 5 miles from Bath', 'bnb', 'Cold Ashton', 'SN14 8LA', ST_MakePoint(-2.3580, 51.4160)::geography, 0.05, true, 'Old Sodbury to Cold Ashton', 7, 10500, 4.9, 68, true, false, false, true, false, false, true, true, true, 'Whittington Farm Hosts', 'Your final trail rest stop', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- Bath: YHA Bath (Youth Hostel)
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url)
VALUES ('yha-bath', 'YHA Bath', 'A 121-bed youth hostel in an Italianate-style mansion on Bathwick Hill overlooking the city of Bath. Dorm and private rooms available, some en-suite. Features a drying room — essential for completing the Cotswold Way in style on a budget.', 'Budget hostel overlooking Bath', 'hostel', 'Bath', 'BA2 6JZ', ST_MakePoint(-2.3450, 51.3800)::geography, 0.5, true, 'Cold Ashton to Bath', 8, 3500, 4.1, 245, true, false, true, false, false, false, true, true, false, 'YHA Team', 'Affordable adventure accommodation', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- NEW PROPERTIES: Campsites & Glamping
-- ============================================================

-- Nr Winchcombe: Hayles Fruit Farm Campsite
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url, website_url)
VALUES ('hayles-fruit-farm', 'Hayles Fruit Farm Campsite', 'A family-owned campsite directly on the Cotswold Way near Hailes Abbey. Offers tent pitches, caravan pitches with electric hook-up, and pre-erected bell tents for glamping. On-site farm shop and cafe with homemade cider, cakes, and local produce.', 'Trail-side campsite with farm shop', 'campsite', 'Winchcombe', 'GL54 5PB', ST_MakePoint(-1.9270, 51.9680)::geography, 0.05, true, 'Broadway to Winchcombe', 2, 1500, 4.2, 87, false, false, false, false, false, true, true, false, true, 'Hayles Farm Family', 'Three generations of Cotswold farming', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80', 'https://www.haylesfruitfarm.co.uk/campsite')
ON CONFLICT (slug) DO NOTHING;

-- Nr Cheltenham: Colgate Farm Campsite
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url, website_url)
VALUES ('colgate-farm', 'Colgate Farm Campsite', 'A working farm campsite 200 metres off the trail near Dowdeswell Woods. No advance booking needed for camping. Basic but charming — with a shared shower, kitchen with microwave, fire pits, and a washing machine. B&B rooms also available.', 'No-booking-needed farm campsite', 'campsite', 'Dowdeswell', 'GL54 4DY', ST_MakePoint(-1.9870, 51.9080)::geography, 0.1, true, 'Winchcombe to Cleeve Hill', 3, 1500, 3.8, 43, false, false, true, false, false, true, true, false, true, 'Colgate Farm Family', 'Walk-up camping welcome', 'https://images.unsplash.com/photo-1537905569824-f89f14cceb68?w=800&q=80', 'http://colgatefarm.co.uk/')
ON CONFLICT (slug) DO NOTHING;

-- Nr Cheltenham: StarGlamping Ullenwood
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url, website_url)
VALUES ('starglamping-ullenwood', 'StarGlamping', 'Glamping pods and a yurt just metres from the Cotswold Way at Ullenwood. Includes The Shire House with a double bed, two-person pods, and a family pod sleeping four. Run by National Star charity — your stay supports a great cause.', 'Charity-run glamping pods on the trail', 'glamping', 'Ullenwood', 'GL53 9QS', ST_MakePoint(-2.0690, 51.8545)::geography, 0.05, true, 'Cleeve Hill to Birdlip', 4, 6000, 4.2, 56, false, false, false, false, false, true, true, true, true, 'National Star Team', 'Glamping that gives back', 'https://images.unsplash.com/photo-1618767689160-da3fb810aad7?w=800&q=80', 'https://www.nationalstar.org/visit-us/starglamping/')
ON CONFLICT (slug) DO NOTHING;

-- Nr Cheltenham: Big Skies Glamping
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url, website_url)
VALUES ('big-skies-glamping', 'Big Skies Glamping & Camping', 'An idyllic wildflower meadow on a 350-acre working farm right on the Cotswold Way. Five tent pitches, three bell tents, and two safari tents, each with fire pits. Vehicle-free site so children and dogs can roam freely in nature.', 'Wildflower meadow glamping on the trail', 'glamping', 'Leckhampton', 'GL53 9NW', ST_MakePoint(-2.0420, 51.8640)::geography, 0.05, true, 'Cleeve Hill to Birdlip', 4, 3000, 4.6, 72, false, false, false, false, false, true, true, false, false, 'Big Skies Family', 'Working farm glamping pioneers', 'https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?w=800&q=80', 'https://www.bigskiesglamping.co.uk/')
ON CONFLICT (slug) DO NOTHING;

-- Nr Dursley: Ashen Plains Campsite
INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url, website_url)
VALUES ('ashen-plains-campsite', 'Ashen Plains Campsite', 'An off-grid campsite on Stinchcombe Hill surrounded by ancient beech woodland, about a mile from the Cotswold Way. Solar-powered with grass pitches, a shower block, communal room with woodburner, and a shepherd''s hut for those wanting a roof overhead.', 'Off-grid woodland campsite', 'campsite', 'Stinchcombe', 'GL11 6AS', ST_MakePoint(-2.3720, 51.6920)::geography, 0.8, true, 'King''s Stanley to Dursley', 6, 1200, 4.3, 38, false, false, false, false, false, true, true, false, false, 'Ashen Plains Team', 'Off-grid camping advocates', 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=800&q=80', 'https://ashenplains.co.uk/')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ADD ROOMS for all new properties
-- ============================================================
INSERT INTO rooms (property_id, name, room_type, max_occupancy, price_per_night)
SELECT p.id, 'Double Room', 'double', 2, p.price_per_night
FROM properties p
WHERE p.slug IN ('noel-arms-hotel','eight-bells-inn','bantam-tea-rooms','the-broadway-hotel','russells-of-broadway','wesley-house-bnb','rising-sun-cleeve-hill','royal-george-birdlip','the-painswick','the-falcon-painswick','the-star-inn-whiteshill','forthay-bnb','carlton-house-bnb','compass-inn-tormarton','whittington-farm-bnb','yha-bath','hayles-fruit-farm','colgate-farm','starglamping-ullenwood','big-skies-glamping','ashen-plains-campsite')
AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.property_id = p.id AND r.name = 'Double Room');

INSERT INTO rooms (property_id, name, room_type, max_occupancy, price_per_night)
SELECT p.id, 'Twin Room', 'twin', 2, p.price_per_night - 1500
FROM properties p
WHERE p.slug IN ('noel-arms-hotel','eight-bells-inn','the-broadway-hotel','rising-sun-cleeve-hill','royal-george-birdlip','the-painswick','the-falcon-painswick','the-star-inn-whiteshill','forthay-bnb','compass-inn-tormarton','whittington-farm-bnb')
AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.property_id = p.id AND r.name = 'Twin Room');

-- Dorm rooms for YHA
INSERT INTO rooms (property_id, name, room_type, max_occupancy, price_per_night)
SELECT p.id, '4-Bed Dorm', 'dorm', 1, 2500
FROM properties p WHERE p.slug = 'yha-bath'
AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.property_id = p.id AND r.name = '4-Bed Dorm');

-- Tent pitches for campsites
INSERT INTO rooms (property_id, name, room_type, max_occupancy, price_per_night)
SELECT p.id, 'Tent Pitch', 'pitch', 2, p.price_per_night
FROM properties p WHERE p.slug IN ('hayles-fruit-farm','colgate-farm','ashen-plains-campsite')
AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.property_id = p.id AND r.name = 'Tent Pitch');

-- Bell tent / glamping pod
INSERT INTO rooms (property_id, name, room_type, max_occupancy, price_per_night)
SELECT p.id, 'Bell Tent', 'glamping', 2, 5000
FROM properties p WHERE p.slug = 'hayles-fruit-farm'
AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.property_id = p.id AND r.name = 'Bell Tent');

INSERT INTO rooms (property_id, name, room_type, max_occupancy, price_per_night)
SELECT p.id, 'Glamping Pod', 'glamping', 2, p.price_per_night
FROM properties p WHERE p.slug = 'starglamping-ullenwood'
AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.property_id = p.id AND r.name = 'Glamping Pod');

INSERT INTO rooms (property_id, name, room_type, max_occupancy, price_per_night)
SELECT p.id, 'Safari Tent', 'glamping', 4, 8000
FROM properties p WHERE p.slug = 'big-skies-glamping'
AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.property_id = p.id AND r.name = 'Safari Tent');

-- ============================================================
-- REVIEWS for new properties
-- ============================================================
INSERT INTO reviews (property_id, guest_name, guest_initials, rating, title, body, walked_date) VALUES

-- Noel Arms
((SELECT id FROM properties WHERE slug = 'noel-arms-hotel'), 'Richard Pemberton', 'RP', 5, 'Perfect first night', 'Right at the trail marker — we walked out the door and straight onto the Cotswold Way. The rooms are full of character and the breakfast was superb. Could not ask for a better start.', 'June 2025'),
((SELECT id FROM properties WHERE slug = 'noel-arms-hotel'), 'Hannah Griffiths', 'HG', 4, 'Character in spades', 'The building oozes history. Some rooms are on the smaller side but the location is unbeatable for trail starters. Good pub food in the evening.', 'April 2025'),

-- Eight Bells Inn
((SELECT id FROM properties WHERE slug = 'eight-bells-inn'), 'Tom Andrews', 'TA', 5, 'Beamed perfection', 'Slept under 14th-century beams and woke to church bells. The breakfast was enormous — exactly what you need before tackling the climb to Broadway Tower.', 'May 2025'),

-- Broadway Hotel
((SELECT id FROM properties WHERE slug = 'the-broadway-hotel'), 'Claire Patterson', 'CP', 4, 'Lovely village hotel', 'Wonderful breakfast selection and the rooms are well-maintained. Broadway is a beautiful village to explore after a day''s walking. Good parking for car-supported trips.', 'July 2025'),

-- Rising Sun
((SELECT id FROM properties WHERE slug = 'rising-sun-cleeve-hill'), 'Mark Evans', 'ME', 4, 'Views that earned every step', 'After the climb up Cleeve Hill, the panoramic views from our room made it all worthwhile. The deep baths are bliss for tired legs. Slightly dated but full of charm.', 'August 2025'),

-- The Painswick
((SELECT id FROM properties WHERE slug = 'the-painswick'), 'Sophie Lawrence', 'SL', 5, 'Trail luxury at its finest', 'If you''re going to splash out on one night of the Cotswold Way, make it this one. The restaurant is outstanding and waking up in Painswick is magical. Worth every penny.', 'September 2025'),
((SELECT id FROM properties WHERE slug = 'the-painswick'), 'Andrew Cole', 'AC', 5, 'Boutique brilliance', 'Stunning hotel with impeccable service. The Rococo Garden access was a lovely bonus after days of trail walking. Our room had the most beautiful valley views.', 'June 2025'),

-- Falcon Inn
((SELECT id FROM properties WHERE slug = 'the-falcon-painswick'), 'Jenny Walsh', 'JW', 4, 'Charming Painswick stay', 'Lovely inn with real character. The garden terrace overlooking the churchyard yews is a wonderful spot for an evening drink after a long day on the trail.', 'May 2025'),

-- Forthay B&B
((SELECT id FROM properties WHERE slug = 'forthay-bnb'), 'David Hartley', 'DH', 5, 'Trail-side gem', 'Literally on the Cotswold Way — we walked right up to the door. The woodburner lounge was perfect for drying out after a rainy day. Evening meal was home-cooked and delicious.', 'October 2025'),

-- Whittington Farm
((SELECT id FROM properties WHERE slug = 'whittington-farm-bnb'), 'Louise Murray', 'LM', 5, 'Better than any hotel', 'Our last night before Bath and it could not have been more perfect. The pool, the woodburner, the incredibly generous breakfast — this place is a hidden treasure.', 'July 2025'),
((SELECT id FROM properties WHERE slug = 'whittington-farm-bnb'), 'George Bancroft', 'GB', 5, 'Unforgettable final night', 'Five steps from the trail, views for miles, and hosts who genuinely care. We arrived exhausted and left feeling completely restored for the last push into Bath.', 'August 2025'),

-- YHA Bath
((SELECT id FROM properties WHERE slug = 'yha-bath'), 'Sam Fletcher', 'SF', 4, 'Budget end to the trail', 'Great value for finishing the Cotswold Way. The drying room saved our boots and the views over Bath from the terrace are brilliant. Private rooms available if you want more comfort.', 'June 2025'),

-- Hayles Fruit Farm
((SELECT id FROM properties WHERE slug = 'hayles-fruit-farm'), 'Izzy Thornton', 'IT', 4, 'Perfect trail campsite', 'Right on the Cotswold Way with hot showers and a farm shop selling homemade cider. The bell tent was comfortable and the fire pit was a wonderful end to the day. Hailes Abbey is just a stroll away.', 'July 2025'),

-- Big Skies
((SELECT id FROM properties WHERE slug = 'big-skies-glamping'), 'Rachel Morris', 'RM', 5, 'Magical meadow camping', 'The wildflower meadow is beautiful and being car-free means total peace. Our safari tent was spacious and the fire pit evening under the stars was the highlight of our entire Cotswold Way walk.', 'August 2025'),

-- StarGlamping
((SELECT id FROM properties WHERE slug = 'starglamping-ullenwood'), 'Paul Dunmore', 'PD', 4, 'Cosy pods on the trail', 'Compact but well-equipped glamping pods with everything you need. Knowing our stay supported National Star charity made it feel even better. Great shower facilities.', 'September 2025'),

-- Dog Inn (additional review)
((SELECT id FROM properties WHERE slug = 'old-sodbury-dog-inn'), 'Karen Blackwell', 'KB', 5, 'Best pub on the trail', 'Dave and Sue are the most welcoming hosts. The rooms have real character — ours had a canopy bed. The Sunday roast was the best we''ve had in years. Our spaniel was welcome everywhere.', 'June 2025'),

-- Swan Hotel (additional review)
((SELECT id FROM properties WHERE slug = 'the-swan-wotton'), 'Neil Griffiths', 'NG', 4, 'Solid halfway stop', 'Good-sized rooms, decent food, and proper real ales. Wotton is a lovely town to explore and the hotel is well-positioned for the Tyndale Monument walk. Good value for the Cotswolds.', 'May 2025'),

-- Lygon Arms (additional review)
((SELECT id FROM properties WHERE slug = 'the-lygon-arms'), 'Patricia Harwood', 'PH', 5, 'Luxury trail walking', 'After walking from Campden in the rain, arriving at The Lygon Arms felt like stepping into another world. The boot room, laundry service, and packed lunch next morning were all top-notch.', 'October 2025');

-- ============================================================
-- ITINERARY STOPS for 8-Day Scenic and Weekend Explorer
-- ============================================================

-- 8-Day Scenic stops
INSERT INTO itinerary_stops (template_id, day_number, village, label, mile_marker, notes) VALUES
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-8'), 1, 'Chipping Campden', 'Start of Trail', 0.0, 'Begin at the iconic trail marker on the High Street'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-8'), 1, 'Broadway', 'End of Day 1', 6.2, 'Gentle first day to Broadway village'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-8'), 2, 'Winchcombe', 'End of Day 2', 17.6, 'Through Stanton and Stanway to Winchcombe'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-8'), 3, 'Cleeve Hill', 'End of Day 3', 25.4, 'Belas Knap and the highest point'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-8'), 4, 'Painswick', 'End of Day 4', 46.2, 'Through Leckhampton and Cooper''s Hill'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-8'), 5, 'King''s Stanley', 'End of Day 5', 56.3, 'Painswick Beacon and Stroud valleys'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-8'), 6, 'Dursley', 'End of Day 6', 67.1, 'Cam Long Down and Uley Bury'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-8'), 7, 'Old Sodbury', 'End of Day 7', 84.3, 'Tyndale Monument and Somerset Monument'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-8'), 8, 'Bath', 'End of Trail', 102.0, 'Final stretch past Dyrham Park to Bath')
ON CONFLICT DO NOTHING;

-- Weekend Explorer stops (Broadway circular)
INSERT INTO itinerary_stops (template_id, day_number, village, label, mile_marker, notes) VALUES
((SELECT id FROM itinerary_templates WHERE slug = 'broadway-circular'), 1, 'Broadway', 'Start in Broadway', 0.0, 'Begin from Broadway village, ascend to Broadway Tower'),
((SELECT id FROM itinerary_templates WHERE slug = 'broadway-circular'), 1, 'Stanton', 'End of Day 1', 8.0, 'Descend through Snowshill to golden Stanton village'),
((SELECT id FROM itinerary_templates WHERE slug = 'broadway-circular'), 2, 'Winchcombe', 'End of Day 2', 16.0, 'Via Stanway House and the Cotswold escarpment'),
((SELECT id FROM itinerary_templates WHERE slug = 'broadway-circular'), 3, 'Broadway', 'Return to Broadway', 24.0, 'Circular return via Hailes Abbey and Broadway Tower')
ON CONFLICT DO NOTHING;
