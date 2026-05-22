/**
 * Cotswolds AONB — bounding box and inside-area check.
 *
 * Single source of truth so the geocoder query bbox (client) and the API
 * route validation (server) never drift.
 *
 * The actual AONB polygon is irregular (~2,000 km², notable bulges around
 * Bath and Stroud). For V1 we use a generous bbox that contains the whole
 * AONB plus margin. False positives at the bbox corners (central Bath, the
 * M5 corridor) cost us nothing — the routing engine returns "no loop in
 * this area" naturally if the start is too far from a Cotswolds footpath
 * cluster.
 *
 * TODO (Milestone D): load the official Natural England AONB boundary
 * GeoJSON and switch isInsideCotswolds() to ST_Contains-style point-in-
 * polygon. That unlocks precise messaging like "your start is 2.3 km
 * outside the AONB; nearest valid start is Bisley".
 *
 * Bbox source: defra.gov.uk magic.gov.uk Cotswolds AONB designated
 * boundary, rounded outward to 0.05° for ergonomic numbers.
 */

export const COTSWOLDS_BBOX = {
  west: -2.45, // just west of Bath
  south: 51.4, // Bath / Bradford-on-Avon
  east: -1.5, // Banbury edge
  north: 52.1, // Chipping Campden / Mickleton
} as const;

/** Mapbox "west,south,east,north" bbox string for the Geocoding API. */
export const COTSWOLDS_BBOX_STRING =
  `${COTSWOLDS_BBOX.west},${COTSWOLDS_BBOX.south},${COTSWOLDS_BBOX.east},${COTSWOLDS_BBOX.north}`;

export const AONB_NAME = "Cotswolds AONB";

/**
 * Cheap inside-bbox check. Returns true if (lat, lng) is plausibly inside
 * the Cotswolds AONB. Bbox-only — see file header for the polygon caveat.
 */
export function isInsideCotswolds(lat: number, lng: number): boolean {
  return (
    lng >= COTSWOLDS_BBOX.west &&
    lng <= COTSWOLDS_BBOX.east &&
    lat >= COTSWOLDS_BBOX.south &&
    lat <= COTSWOLDS_BBOX.north
  );
}
