// lib/landing.ts — helpers for the web marketing landing (web build only).

// App deep-links are authored against `/` (the map's route in the native app):
// e.g. a shared restaurant `/?select=<osm_id>`, an auth-guard bounce
// `/?auth=required`, the surprise tab `/?surprise=1`. On the web `/` is the
// landing, not the map — so these must be forwarded to `/carte` to reach the map.
const MAP_PARAMS = ['select', 'auth', 'surprise', 'lat', 'lon']

/**
 * Given the current `window.location.search`, return the `/carte…` URL the map
 * should be reached at when the query carries an app deep-link, or `null` when
 * the visitor is just viewing the landing (no redirect needed).
 */
export function mapDeepLinkTarget(search: string): string | null {
  const params = new URLSearchParams(search)
  if (!MAP_PARAMS.some((k) => params.has(k))) return null
  const qs = params.toString()
  return qs ? `/carte?${qs}` : '/carte'
}
