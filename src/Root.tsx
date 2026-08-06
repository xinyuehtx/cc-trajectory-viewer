import App from './App'
import Landing from './components/Landing'
import { useHashRoute } from './lib/router'

/**
 * Top-level switch between the marketing landing page (`#/`) and the trajectory
 * viewer (`#/live-demo`).
 *
 * The viewer also renders when a `?src=` param is present so shared/embedded
 * links (and the CLI, which opens `#/live-demo`) go straight to it.
 */
export default function Root() {
  const route = useHashRoute()
  const hasSrc =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('src')

  if (route === 'live-demo' || hasSrc) return <App />
  return <Landing />
}
