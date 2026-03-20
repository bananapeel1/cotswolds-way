-- Seed real Cotswold Way accommodations
-- Coordinates are approximate positions along the trail

INSERT INTO properties (slug, name, description, short_description, property_type, village, postcode, location, trail_distance_miles, trail_distance_verified, trail_segment, day_on_trail, price_per_night, rating, review_count, has_boot_dryer, has_luggage_transfer, has_laundry, has_packed_lunch, has_taxi_service, is_dog_friendly, is_eco_certified, has_wifi, has_parking, host_name, host_description, image_url) VALUES

('the-lygon-arms', 'The Lygon Arms', 'A historic 16th-century coaching inn in the heart of Broadway. The Lygon Arms has hosted Charles I and Oliver Cromwell, and today offers luxury accommodation with all modern amenities for Cotswold Way walkers.', 'Historic coaching inn with luxury rooms', 'inn', 'Broadway', 'WR12 7DU', ST_MakePoint(-1.8563, 52.0356)::geography, 0.1, true, 'Chipping Campden to Broadway', 2, 24500, 4.9, 128, true, true, true, true, true, true, false, true, true, 'The Lygon Arms Team', 'Family-run since the 16th century'),

('holly-house-bnb', 'Holly House B&B', 'A warm and welcoming B&B just steps from the Cotswold Way in Chipping Campden. Perfect for the first or last night of your walk, with hearty breakfasts and a cozy drying room.', 'Cozy walker-friendly B&B at the trail start', 'bnb', 'Chipping Campden', 'GL55 6HB', ST_MakePoint(-1.7798, 52.0536)::geography, 0.1, true, 'Start of Trail', 1, 11500, 4.7, 89, true, true, false, true, false, true, false, true, true, 'Margaret & Peter', '3rd generation Campden residents'),

('the-mount-inn', 'The Mount Inn', 'Perched high on the escarpment above Stanton with panoramic views across the Vale of Evesham. A genuine walkers'' pub with excellent real ales and hearty food.', 'Escarpment pub with stunning views', 'inn', 'Stanton', 'WR12 7NE', ST_MakePoint(-1.8267, 52.0178)::geography, 0.2, true, 'Broadway to Winchcombe', 2, 13500, 4.6, 67, true, false, false, true, false, true, false, true, true, 'James', 'Local publican for 15 years'),

('westward-house', 'Westward House', 'Elegant B&B in the picturesque town of Winchcombe, gateway to Sudeley Castle. Ideally positioned at the midpoint of a Cotswold Way day walk with comfortable ensuite rooms.', 'Elegant B&B in historic Winchcombe', 'bnb', 'Winchcombe', 'GL54 5LJ', ST_MakePoint(-1.9660, 51.9539)::geography, 0.3, true, 'Broadway to Winchcombe', 3, 14500, 4.8, 104, true, true, true, true, true, false, true, true, true, 'Edward', '5th generation Cotswolds resident'),

('cleeve-hill-hotel', 'Cleeve Hill Hotel', 'Set at the highest point of the Cotswold Way with breathtaking views over Cheltenham Racecourse and the Malvern Hills. Spacious rooms and a renowned restaurant.', 'Hilltop hotel at the trail''s highest point', 'hotel', 'Cleeve Hill', 'GL52 3PR', ST_MakePoint(-2.0047, 51.9374)::geography, 0.1, true, 'Winchcombe to Cleeve Hill', 3, 18500, 4.5, 92, true, true, true, false, true, false, false, true, true, 'Cleeve Hill Hotel', 'Family-owned country hotel'),

('the-royal-oak-painswick', 'The Royal Oak', 'A stylish gastro-pub in the "Queen of the Cotswolds" - Painswick. Beautifully restored rooms above a buzzing bar, with locally-sourced menus and craft ales.', 'Stylish gastro-pub in the Queen of the Cotswolds', 'inn', 'Painswick', 'GL6 6QG', ST_MakePoint(-2.1942, 51.7874)::geography, 0.1, true, 'Birdlip to Painswick', 5, 16500, 4.8, 156, true, true, true, true, true, true, true, true, false, 'Tom & Lucy', 'Award-winning restaurateurs'),

('cardynham-house', 'Cardynham House', 'Grade II listed 15th-century wool merchant''s house with stunning period features. Each room individually designed with luxury linens and modern bathrooms.', 'Medieval wool merchant''s house turned luxury B&B', 'bnb', 'Painswick', 'GL6 6YA', ST_MakePoint(-2.1918, 51.7885)::geography, 0.2, true, 'Birdlip to Painswick', 5, 15500, 4.9, 78, false, true, false, false, false, false, true, true, true, 'Amanda', 'Restoring Cotswold heritage since 2010'),

('bear-of-rodborough', 'The Bear of Rodborough', 'A 17th-century coaching inn dramatically situated on Rodborough Common with far-reaching views. Popular with walkers approaching Stroud along the escarpment.', 'Dramatic hilltop coaching inn', 'inn', 'Rodborough', 'GL5 5DE', ST_MakePoint(-2.2174, 51.7236)::geography, 0.4, true, 'Painswick to King''s Stanley', 5, 17500, 4.4, 113, true, true, true, true, true, true, false, true, true, 'Bear Hotels Group', 'Historic Cotswold inn collection'),

('the-old-fleece', 'The Old Fleece', 'A charming boutique hotel in the market town of Stroud, perfect for walkers exploring the Stroud valleys section of the Cotswold Way.', 'Boutique hotel in vibrant Stroud', 'hotel', 'Stroud', 'GL5 1AP', ST_MakePoint(-2.2133, 51.7452)::geography, 0.5, true, 'Painswick to King''s Stanley', 6, 12500, 4.3, 64, false, true, true, false, true, false, true, true, true, 'Old Fleece Team', 'Reviving Stroud''s finest coaching inn'),

('old-sodbury-dog-inn', 'The Dog Inn', 'A traditional English pub with rooms in the quiet village of Old Sodbury. Well-positioned for the final stretch into Bath with genuine country hospitality.', 'Traditional country pub with rooms', 'inn', 'Old Sodbury', 'BS37 6LZ', ST_MakePoint(-2.3496, 51.5395)::geography, 0.2, true, 'Wotton-under-Edge to Old Sodbury', 6, 10500, 4.5, 45, true, false, false, true, false, true, false, true, true, 'Dave & Sue', 'Your final trail hosts'),

('the-swan-wotton', 'The Swan Hotel', 'An elegant Georgian hotel in the handsome town of Wotton-under-Edge. Beautiful rooms overlooking the valley, with a warm welcome for trail walkers.', 'Georgian elegance at trail''s halfway point', 'hotel', 'Wotton-under-Edge', 'GL12 7BE', ST_MakePoint(-2.3541, 51.6366)::geography, 0.3, true, 'Dursley to Wotton-under-Edge', 6, 14000, 4.6, 87, true, true, true, true, true, false, false, true, true, 'Swan Hotel', 'Wotton''s premier accommodation'),

('cold-ashton-manor', 'Cold Ashton Manor B&B', 'A beautiful manor house B&B in the peaceful village of Cold Ashton, the final overnight stop before Bath. Wake up to views across the valley to your destination.', 'Manor house B&B on the doorstep of Bath', 'bnb', 'Cold Ashton', 'SN14 8LA', ST_MakePoint(-2.3672, 51.4199)::geography, 0.3, true, 'Old Sodbury to Cold Ashton', 7, 13500, 4.7, 52, true, true, false, true, false, false, true, true, true, 'Catherine', 'Welcoming walkers to their final night');

-- Seed rooms for each property
INSERT INTO rooms (property_id, name, room_type, max_occupancy, price_per_night)
SELECT p.id, 'King Ensuite', 'double', 2, p.price_per_night
FROM properties p;

INSERT INTO rooms (property_id, name, room_type, max_occupancy, price_per_night)
SELECT p.id, 'Twin Room', 'twin', 2, p.price_per_night - 2000
FROM properties p;

-- Seed reviews
INSERT INTO reviews (property_id, guest_name, guest_initials, rating, title, body, walked_date) VALUES
((SELECT id FROM properties WHERE slug = 'the-lygon-arms'), 'James Davies', 'JD', 5, 'Perfect end to Day 1', 'The boot room was a lifesaver after a muddy stretch. The breakfast was hearty enough to fuel my walk to Broadway. Highly recommended for hikers.', 'May 2024'),
((SELECT id FROM properties WHERE slug = 'the-lygon-arms'), 'Sarah Roberts', 'SR', 5, 'True Walker Focus', 'They understood our logistics perfectly. Luggage was waiting in the room, and the laundry service was efficient. The beds are pure luxury.', 'June 2024'),
((SELECT id FROM properties WHERE slug = 'holly-house-bnb'), 'Michael Chen', 'MC', 5, 'Best Start to Our Walk', 'Margaret and Peter are wonderful hosts. The breakfast set us up perfectly for the first day. Walking distance to the trail marker couldn''t be easier.', 'April 2024'),
((SELECT id FROM properties WHERE slug = 'westward-house'), 'Emma Thompson', 'ET', 5, 'Winchcombe Gem', 'Beautifully appointed rooms and Edward is a font of local knowledge. He gave us tips on the Belas Knap detour that made our walk unforgettable.', 'July 2024'),
((SELECT id FROM properties WHERE slug = 'the-royal-oak-painswick'), 'David Wilson', 'DW', 5, 'Incredible Food, Perfect Location', 'The dinner alone was worth the stay. Right on the trail through Painswick. Tom and Lucy have created something really special here.', 'August 2024'),
((SELECT id FROM properties WHERE slug = 'cardynham-house'), 'Kate Morgan', 'KM', 5, 'Step Back in Time', 'Sleeping in a 15th-century wool merchant''s house was magical. The room was gorgeous and Amanda''s knowledge of local history is remarkable.', 'September 2024');

-- Seed trail segments
INSERT INTO trail_segments (name, start_village, end_village, distance_miles, elevation_gain_ft, difficulty, day_number, description) VALUES
('Chipping Campden to Broadway', 'Chipping Campden', 'Broadway', 6.2, 850, 'moderate', 1, 'A gentle start ascending to Broadway Tower with panoramic views across the Vale of Evesham.'),
('Broadway to Winchcombe', 'Broadway', 'Winchcombe', 11.4, 1240, 'strenuous', 2, 'The toughest day with the steep escarpment climb. Pass through Stanton and Stanway villages.'),
('Winchcombe to Cleeve Hill', 'Winchcombe', 'Cleeve Hill', 7.8, 980, 'moderate', 3, 'Visit the ancient Belas Knap long barrow before ascending to Cleeve Common, the highest point on the trail.'),
('Cleeve Hill to Birdlip', 'Cleeve Hill', 'Birdlip', 12.5, 650, 'moderate', 3, 'Cross Charlton Kings Common with views over Cheltenham before reaching the Crickley Hill viewpoint.'),
('Birdlip to Painswick', 'Birdlip', 'Painswick', 8.3, 520, 'easy', 4, 'Through the beautiful beech woodlands of Cooper''s Hill and past the famous cheese-rolling slope.'),
('Painswick to King''s Stanley', 'Painswick', 'King''s Stanley', 10.1, 780, 'moderate', 5, 'Traverse the Painswick Beacon with Iron Age fort remains and descend through the Stroud valleys.'),
('King''s Stanley to Dursley', 'King''s Stanley', 'Dursley', 10.8, 920, 'strenuous', 5, 'A demanding section over Cam Long Down and Uley Bury hill fort.'),
('Dursley to Wotton-under-Edge', 'Dursley', 'Wotton-under-Edge', 7.5, 680, 'moderate', 6, 'Pass the Tyndale Monument commemorating the translator of the Bible into English.'),
('Wotton-under-Edge to Old Sodbury', 'Wotton-under-Edge', 'Old Sodbury', 12.4, 540, 'moderate', 6, 'Through Somerset Monument grounds and along the escarpment edge.'),
('Old Sodbury to Cold Ashton', 'Old Sodbury', 'Cold Ashton', 10.2, 480, 'easy', 7, 'The penultimate stage passing Dyrham Park (National Trust) with its deer park.'),
('Cold Ashton to Bath', 'Cold Ashton', 'Bath', 7.5, 320, 'easy', 7, 'The triumphant final stretch descending into the city of Bath and the Royal Crescent.');

-- Seed itinerary templates
INSERT INTO itinerary_templates (name, slug, description, total_days, total_miles, direction, is_featured) VALUES
('7-Day Classic', 'north-to-south-7', 'The definitive Cotswold Way experience from Chipping Campden to Bath. A steady pace for the dedicated walker.', 7, 102.0, 'north_to_south', true),
('8-Day Scenic', 'north-to-south-8', 'A more relaxed pace with shorter days, allowing time to explore villages and detours along the way.', 8, 102.0, 'north_to_south', true),
('Weekend Explorer', 'broadway-circular', 'A focused 3-day loop around the charming hills of Broadway and Stanton. Perfect for a weekend escape.', 3, 24.0, 'circular', true);

-- Seed itinerary stops for 7-day classic
INSERT INTO itinerary_stops (template_id, day_number, village, label, mile_marker, notes) VALUES
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-7'), 1, 'Chipping Campden', 'Start of Trail', 0.0, 'Begin at the iconic trail marker on the High Street'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-7'), 1, 'Broadway', 'End of Day 1', 6.2, 'Overnight in Broadway village'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-7'), 2, 'Winchcombe', 'End of Day 2', 17.6, 'The toughest day — reward yourself in Winchcombe'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-7'), 3, 'Birdlip', 'End of Day 3', 37.9, 'Highest point on the trail today'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-7'), 4, 'Painswick', 'End of Day 4', 46.2, 'The Queen of the Cotswolds'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-7'), 5, 'Dursley', 'End of Day 5', 67.1, 'Market town stop'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-7'), 6, 'Old Sodbury', 'End of Day 6', 84.3, 'Penultimate night'),
((SELECT id FROM itinerary_templates WHERE slug = 'north-to-south-7'), 7, 'Bath', 'End of Trail', 102.0, 'Finish at the Royal Crescent!');
