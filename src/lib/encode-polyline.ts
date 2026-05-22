/**
 * Google Encoded Polyline Algorithm (precision 5).
 *
 * The format Mapbox Static API accepts for path overlays. ~30 lines, no
 * dependency, replaces a 5KB package.
 *
 * Spec: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 *
 * Verified against Google's published reference:
 *   encodePolyline([
 *     [38.5, -120.2],
 *     [40.7, -120.95],
 *     [43.252, -126.453],
 *   ])
 *   === "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
 *
 * Note the point ordering is [lat, lng] — Google convention, NOT GeoJSON's
 * [lng, lat]. Callers working with GeoJSON LineString.coordinates must swap.
 */

export function encodePolyline(points: [number, number][], precision = 5): string {
  const factor = 10 ** precision;
  let lastLat = 0;
  let lastLng = 0;
  let result = "";

  for (const [lat, lng] of points) {
    const latI = Math.round(lat * factor);
    const lngI = Math.round(lng * factor);
    result += encodeValue(latI - lastLat);
    result += encodeValue(lngI - lastLng);
    lastLat = latI;
    lastLng = lngI;
  }
  return result;
}

/**
 * Encode a single signed integer delta using the polyline algorithm:
 *   1. Left-shift one bit.
 *   2. If the original was negative, invert (one's complement).
 *   3. Break into 5-bit chunks, least-significant first.
 *   4. OR every chunk except the last with 0x20 (continuation bit).
 *   5. Add 63 to each chunk to land in printable ASCII (63–126).
 */
function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let s = "";
  while (v >= 0x20) {
    s += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>>= 5;
  }
  s += String.fromCharCode(v + 63);
  return s;
}
