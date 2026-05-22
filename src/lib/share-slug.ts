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
  return slug.replace(/~/g, "=").replace(/_/g, "|");
}
