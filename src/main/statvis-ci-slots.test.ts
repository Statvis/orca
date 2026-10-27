import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }))

import { parseStatvisCiSlotHolder, readStatvisCiSlotsSnapshot } from './statvis-ci-slots'

const RUN_A = '/Users/me/worktrees/statvis-a (pid 101, since 2026-10-21T10:00:00-06:00)'
const RUN_B = '/Users/me/worktrees/statvis-b (pid 202, since 2026-10-21T10:05:00-06:00)'
const DEAD = '/tmp/old-run (pid 999, since 2026-10-16T10:20:12-06:00)'

async function slotsDir(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'statvis-ci-slots-'))
  await Promise.all(Object.entries(files).map(([name, text]) => writeFile(join(dir, name), text)))
  return dir
}

describe('statvis CI slots', () => {
  it('parses the holder text bin/ci writes into a slot file', () => {
    expect(parseStatvisCiSlotHolder(`${RUN_A}\n`)).toEqual({
      label: '/Users/me/worktrees/statvis-a',
      pid: 101,
      since: '2026-10-21T10:00:00-06:00'
    })
    expect(parseStatvisCiSlotHolder('')).toBeNull()
  })

  it('counts live holders, skips released and dead-pid slots, and asks for the queue', async () => {
    const dir = await slotsDir({
      'queue.lock': '',
      'slot-1.lock': RUN_A,
      'slot-2.lock': RUN_A,
      'slot-3.lock': RUN_B,
      'slot-4.lock': '',
      'slot-13.lock': DEAD
    })
    const countQueued = vi.fn(async () => 2)
    const snapshot = await readStatvisCiSlotsSnapshot({
      dir,
      capacity: 12,
      isAlive: (pid) => pid !== 999,
      countQueued
    })
    expect(snapshot).toEqual({
      available: true,
      capacity: 12,
      busy: 3,
      queued: 2,
      holders: [
        {
          label: '/Users/me/worktrees/statvis-a',
          pid: 101,
          since: '2026-10-21T10:00:00-06:00',
          slots: 2
        },
        {
          label: '/Users/me/worktrees/statvis-b',
          pid: 202,
          since: '2026-10-21T10:05:00-06:00',
          slots: 1
        }
      ]
    })
    expect(countQueued).toHaveBeenCalledWith(dir)
  })

  it('skips the queue probe when every slot is free', async () => {
    const dir = await slotsDir({ 'slot-1.lock': '', 'slot-2.lock': DEAD })
    const countQueued = vi.fn(async () => 5)
    const snapshot = await readStatvisCiSlotsSnapshot({
      dir,
      capacity: 12,
      isAlive: () => false,
      countQueued
    })
    expect(snapshot).toMatchObject({ available: true, busy: 0, queued: 0, holders: [] })
    expect(countQueued).not.toHaveBeenCalled()
  })

  it('widens capacity to a live slot beyond the configured count', async () => {
    const dir = await slotsDir({ 'slot-16.lock': RUN_A })
    const snapshot = await readStatvisCiSlotsSnapshot({
      dir,
      capacity: 12,
      isAlive: () => true,
      countQueued: async () => 0
    })
    expect(snapshot).toMatchObject({ capacity: 16, busy: 1 })
  })

  it('reports unavailable when bin/ci has never run on this machine', async () => {
    const snapshot = await readStatvisCiSlotsSnapshot({
      dir: join(tmpdir(), 'no-such-statvis-slots')
    })
    expect(snapshot).toEqual({ available: false })
  })
})
