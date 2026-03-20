-- Update website URLs for verified properties
UPDATE properties SET website_url = 'https://www.lygonarmshotel.co.uk/' WHERE slug = 'the-lygon-arms';
UPDATE properties SET website_url = 'http://www.hollyhousebandb.co.uk/' WHERE slug = 'holly-house-bnb';
UPDATE properties SET website_url = 'https://www.themountinn.co.uk/' WHERE slug = 'the-mount-inn';
UPDATE properties SET website_url = 'https://cleevehillhotel.co.uk/' WHERE slug = 'cleeve-hill-hotel';
UPDATE properties SET website_url = 'https://www.cotswold-inns-hotels.co.uk/the-bear-of-rodborough' WHERE slug = 'bear-of-rodborough';
UPDATE properties SET website_url = 'https://the-dog-inn.co.uk/' WHERE slug = 'old-sodbury-dog-inn';
UPDATE properties SET website_url = 'https://swanhotelwotton.com/' WHERE slug = 'the-swan-wotton';

-- Properties without confirmed websites - link to Booking.com search
UPDATE properties SET website_url = 'https://www.booking.com/searchresults.html?ss=Painswick+Gloucestershire' WHERE slug = 'the-royal-oak-painswick';
UPDATE properties SET website_url = 'https://www.booking.com/searchresults.html?ss=Painswick+Gloucestershire' WHERE slug = 'cardynham-house';
UPDATE properties SET website_url = 'https://www.booking.com/hotel/gb/old-fleece-apartments.en-gb.html' WHERE slug = 'the-old-fleece';
UPDATE properties SET website_url = 'https://www.booking.com/searchresults.html?ss=Winchcombe+Gloucestershire' WHERE slug = 'westward-house';
UPDATE properties SET website_url = 'https://www.booking.com/searchresults.html?ss=Cold+Ashton' WHERE slug = 'cold-ashton-manor';
