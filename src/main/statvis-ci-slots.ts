import { readdir, readFile } from 'node:fs/promises'
import { cpus, homedir } from 'node:os'
import { join } from 'node:path'
import { ipcMain } from 'electron'
import { runProcess } from '@orca/process-host'
import type { StatvisCiSlotHolder, StatvisCiSlotsSnapshot } from '../shared/statvis-ci-slots'

// Statvis fork: reads the machine-wide CPU slots that statvis bin/ci shares across worktrees
// (statvis lib/dev/cpu_slots.rb). Each slot-N.lock is flock-held for a run's lifetime and names
// its holder; a killed run frees the lock but leaves its text behind, so liveness comes from the pid.

const SLOT_FILE = /^slot-(\d+)\.lock$/
const HOLDER_TEXT = /^(.*) \(pid (\d+), since (\S+)\)$/
const SNAPSHOT_REUSE_MS = 1500

export function getStatvisCiSlotsDir(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.STATVIS_CPU_SLOTS_DIR ||
    join(homedir(), '.local', 'state', 'statvis-worktrees', 'cpu-slots')
  )
}

export function parseStatvisCiSlotHolder(text: string): Omit<StatvisCiSlotHolder, 'slots'> | null {
  const match = HOLDER_TEXT.exec(text.trim())
  return match ? { label: match[1], pid: Number(match[2]), since: match[3] } : null
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // Why EPERM counts as alive: the process exists but belongs to another user.
    return error instanceof Error && 'code' in error && error.code === 'EPERM'
  }
}

let performanceCores: Promise<number | null> | null = null

// Why: matches bin/ci, which counts only Apple silicon performance cores.
function readPerformanceCores(): Promise<number | null> {
  if (process.platform !== 'darwin') {
    return Promise.resolve(null)
  }
  performanceCores ??= runProcess({
    program: 'sysctl',
    args: ['-n', 'hw.perflevel0.physicalcpu'],
    timeoutMs: 2000
  })
    .then((result) => {
      const cores = Number.parseInt(result.stdout.trim(), 10)
      return cores > 0 ? cores : null
    })
    .catch(() => null)
  return performanceCores
}

async function readConfiguredCapacity(): Promise<number> {
  const configured = Number.parseInt(process.env.STATVIS_CPU_SLOTS ?? '', 10)
  if (configured > 0) {
    return configured
  }
  return (await readPerformanceCores()) ?? cpus().length
}

// Why lsof: waiting runs hold queue.lock open (the front one polls, the rest block on flock).
async function countQueuedRuns(dir: string): Promise<number> {
  try {
    const result = await runProcess({
      program: 'lsof',
      args: ['-t', join(dir, 'queue.lock')],
      timeoutMs: 5000
    })
    return new Set(result.stdout.split('\n').filter((line) => line.trim() !== '')).size
  } catch {
    return 0
  }
}

type SnapshotOptions = {
  dir?: string
  capacity?: number
  isAlive?: (pid: number) => boolean
  countQueued?: (dir: string) => Promise<number>
}

export async function readStatvisCiSlotsSnapshot(
  options: SnapshotOptions = {}
): Promise<StatvisCiSlotsSnapshot> {
  const dir = options.dir ?? getStatvisCiSlotsDir()
  const isAlive = options.isAlive ?? isProcessAlive
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return { available: false }
  }

  const slots = await Promise.all(
    names.flatMap((name) => {
      const match = SLOT_FILE.exec(name)
      if (!match) {
        return []
      }
      return [
        readFile(join(dir, name), 'utf8')
          .then((text) => ({ index: Number(match[1]), holder: parseStatvisCiSlotHolder(text) }))
          .catch(() => ({ index: Number(match[1]), holder: null }))
      ]
    })
  )

  const holders = new Map<string, StatvisCiSlotHolder>()
  let busy = 0
  let highestBusySlot = 0
  for (const { index, holder } of slots) {
    if (!holder || !isAlive(holder.pid)) {
      continue
    }
    busy += 1
    highestBusySlot = Math.max(highestBusySlot, index)
    const key = `${holder.pid}:${holder.label}`
    const existing = holders.get(key)
    holders.set(
      key,
      existing ? { ...existing, slots: existing.slots + 1 } : { ...holder, slots: 1 }
    )
  }

  // Why max: a run started with a larger STATVIS_CPU_SLOTS than this app's environment sees.
  const capacity = Math.max(options.capacity ?? (await readConfiguredCapacity()), highestBusySlot)
  // Why gate on busy: with every slot free no run can be waiting, and lsof costs ~0.5s.
  const queued = busy > 0 ? await (options.countQueued ?? countQueuedRuns)(dir) : 0
  return {
    available: true,
    capacity,
    busy,
    queued,
    holders: [...holders.values()].sort((a, b) => a.since.localeCompare(b.since))
  }
}

let inFlight: { startedAt: number; snapshot: Promise<StatvisCiSlotsSnapshot> } | null = null

export function registerStatvisCiSlotsHandlers(): void {
  ipcMain.handle('statvisCiSlots:getSnapshot', (): Promise<StatvisCiSlotsSnapshot> => {
    // Why: every window polls; share one read (and one lsof) between them.
    if (!inFlight || Date.now() - inFlight.startedAt > SNAPSHOT_REUSE_MS) {
      inFlight = { startedAt: Date.now(), snapshot: readStatvisCiSlotsSnapshot() }
    }
    return inFlight.snapshot
  })
}
