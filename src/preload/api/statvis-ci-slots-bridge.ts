import { ipcRenderer } from 'electron'
import type { StatvisCiSlotsSnapshot } from '../../shared/statvis-ci-slots'

/** Statvis fork: local bin/ci CPU slot usage. */
export type StatvisCiSlotsApi = {
  getSnapshot: () => Promise<StatvisCiSlotsSnapshot>
}

export const statvisCiSlotsApi: StatvisCiSlotsApi = {
  getSnapshot: () => ipcRenderer.invoke('statvisCiSlots:getSnapshot')
}
