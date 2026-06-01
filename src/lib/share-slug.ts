/**
 * Bidirectional URL-safe slug encoding for routes cache keys.
 *
 * Cache key format (from buildCacheKey in route-engine.ts):
 *   grid=LAT,LNG|km=KM|theme=T|lunch=L|v=v2
 *
 * The two characters that aren't friendly in URL paths are `|` and `=`.
 * We substitute:
 *   `|` → `_`   (underscore — never appears in original cache keys)
 *   `=` → `~`   (tilde — URL-unreserved per RFC 3986, also absent from
 *               originals)
 *
 * Commas in coordinates and any other character pass through unchanged.
 * No `slug` column, no migration: this is a pure deterministic transform.
 *
 * If buildCacheKey ever introduces `_` or `~` in its output, slug round-trip
 * would silently break. The assertion in cacheKeyToSlug catches that the
 * first time the function is called with such a key — fails loudly in dev
 * before the broken URLs hit production.
 */

export function cacheKeyToSlug(cacheKey: string): string {
  if (cacheKey.includes("_") || cacheKey.includes("~")) {
    throw new Error(
      `cacheKeyToSlug: cache key contains a slug-reserved character ('_' or '~'). ` +
        `Update src/lib/share-slug.ts before merging the change that introduced it. ` +
        `cacheKey=${cacheKey}`,
    );
  }
  return cacheKey.replace(/\|/g, "_").replace(/=/g, "~");
}

export function slugToCacheKey(slug: string): string {
  // Decode percent-encoding first. Cache keys contain a comma (lat,lng), which
  // browsers encode to %2C in the URL path. Next.js page params arrive
  // un-decoded (unlike Route Handler params), so without this the %2C survives
  // into the cache key and the lookup misses → a 404 on every share link.
  // decodeURIComponent is a no-op on already-decoded input; guard against the
  // rare malformed-% case so it never throws.
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // leave as-is if the slug isn't valid percent-encoding
  }
  return decoded.replace(/~/g, "=").replace(/_/g, "|");
}
