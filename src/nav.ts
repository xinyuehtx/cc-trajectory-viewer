import { createContext, useContext } from 'react'

export interface NavApi {
  /** Switch to the Diffs tab and scroll to the diff card for this event id. */
  openDiff: (eventId: string) => void
}

export const NavContext = createContext<NavApi>({ openDiff: () => {} })

export function useNav(): NavApi {
  return useContext(NavContext)
}
