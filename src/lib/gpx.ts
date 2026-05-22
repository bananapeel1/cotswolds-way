/**
 * Build a GPX 1.1 document for a generated walking route.
 *
 * Pure function — takes a LineString coordinate array (GeoJSON ordering:
 * [lng, lat]) plus a name and optional description, returns valid GPX XML.
 *
 * Validates against http://www.topografix.com/GPX/1/1/gpx.xsd. Tested via:
 *   xmllint --schema gpx.xsd <file>
 *
 * Why no dependency: the project doesn't ship any other XML or GPX work,
 * and the GPX 1.1 schema for a simple track is small enough to inline. A
 * library adds bundle weight for one caller.
 */

export interface GpxInput {
  /** Display name for both the metadata and the track. */
  name: string;
  /** Optional one-paragraph description for the metadata block. */
  description?: string;
  /** GeoJSON ordering: each coord is [longitude, latitude]. */
  coords: [number, number][];
}

export function buildGpx(input: GpxInput): string {
  const trkpts = input.coords
    .map(
      ([lng, lat]) =>
        `      <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"/>`,
    )
    .join("\n");

  const name = escapeXml(input.name);
  const description = input.description
    ? `\n    <desc>${escapeXml(input.description)}</desc>`
    : "";
  const time = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"
     creator="Cotswolds Way"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${name}</name>${description}
    <time>${time}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

const XML_ESCAPES: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
};

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => XML_ESCAPES[c] ?? c);
}
