-- Fix property images with verified Cotswold/English building photos from Unsplash
-- Each photo ID was manually verified by browsing Unsplash search results

-- The Lygon Arms (luxury hotel, Broadway) - Cotswold stone village under blue sky
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1670620800550-db7fcecb9e14?w=800&q=80' WHERE slug = 'the-lygon-arms';

-- Holly House B&B (charming B&B, Ebrington) - English thatched cottage with greenery
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1654445112674-85c94a3eae7b?w=800&q=80' WHERE slug = 'holly-house-bnb';

-- The Mount Inn (hilltop pub, Stanton) - Stone country pub with stone walls
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1656758073960-029d21e0bc28?w=800&q=80' WHERE slug = 'the-mount-inn';

-- Westward House (B&B, Winchcombe) - Stone cottage with door and roses
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1659559108995-a41c413392d6?w=800&q=80' WHERE slug = 'westward-house';

-- Cleeve Hill Hotel (boutique B&B) - Stone manor surrounded by tall trees
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1567002260893-954a299f8c6b?w=800&q=80' WHERE slug = 'cleeve-hill-hotel';

-- The Royal Oak (village pub, Painswick) - English country pub with sign
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1656758073866-e12c8d8de36c?w=800&q=80' WHERE slug = 'the-royal-oak-painswick';

-- Cardynham House (15th-century house, Painswick) - Cotswold village street with trees
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1670620800060-b90889e9f7d9?w=800&q=80' WHERE slug = 'cardynham-house';

-- Bear of Rodborough (coaching inn) - Stone village street with green forest
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1670620800615-4225fe6ecb75?w=800&q=80' WHERE slug = 'bear-of-rodborough';

-- The Old Fleece (apartments, Stroud) - Stone building near river
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1583070507082-46fd6544694d?w=800&q=80' WHERE slug = 'the-old-fleece';

-- The Dog Inn (village pub, Old Sodbury) - Country pub house by water
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1676658885720-c879560dbafd?w=800&q=80' WHERE slug = 'old-sodbury-dog-inn';

-- The Swan Hotel (coaching inn, Wotton) - Cotswold stone building with flowers
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1649182357947-0790cad72a94?w=800&q=80' WHERE slug = 'the-swan-wotton';

-- Cold Ashton Manor (B&B) - Cotswold stone cottages with roses
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1568144465867-480a894ed663?w=800&q=80' WHERE slug = 'cold-ashton-manor';
