/** Statvis fork: one local bin/ci run holding CPU slots (statvis lib/dev/cpu_slots.rb). */
export type StatvisCiSlotHolder = {
  /** Working directory of the run, usually a statvis worktree path. */
  label: string
  pid: number
  slots: number
  since: string
}

export type StatvisCiSlotsSnapshot =
  | { available: false }
  | {
      available: true
      capacity: number
      busy: number
      /** bin/ci runs waiting for slots. */
      queued: number
      holders: StatvisCiSlotHolder[]
    }
