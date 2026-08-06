import { useEffect, useState } from 'react'

/**
 * Minimal hash-based router — no third-party dependency.
 *
 * We use hash routing (`#/`, `#/live-demo`) rather than history/path routing so
 * that the same static build works everywhere without server rewrites:
 *  - GitHub Pages project path (`/cc-trajectory-viewer/`) with no 404 fallback,
 *  - the CLI's built-in static server,
 *  - a plain `file://` open.
 *
 * Routes are the hash path with leading `#`, `/` and trailing `/` stripped:
 *   ``            → '' (landing)
 *   `#/`          → '' (landing)
 *   `#/live-demo` → 'live-demo'
 */
export type Route = '' | 'live-demo'

function readRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '').replace(/\/$/, '')
  return raw === 'live-demo' ? 'live-demo' : ''
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => readRoute())
  useEffect(() => {
    const onChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

/** Navigate to a route by updating the location hash. */
export function navigate(route: Route): void {
  window.location.hash = route ? `/${route}` : '/'
}
