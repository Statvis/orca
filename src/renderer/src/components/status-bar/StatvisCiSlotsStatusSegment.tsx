import { useEffect, useState } from 'react'
import { Cpu } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { isPairedWebClientWindow } from '@/lib/desktop-window-chrome'
import { basename } from '@/lib/path'
import type { StatvisCiSlotsSnapshot } from '../../../../shared/statvis-ci-slots'
import { STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS } from './status-bar-context-menu-policy'

const POLL_MS = 3000

function useStatvisCiSlots(): StatvisCiSlotsSnapshot | null {
  const [snapshot, setSnapshot] = useState<StatvisCiSlotsSnapshot | null>(null)
  useEffect(() => {
    const api = window.api?.statvisCiSlots
    if (!api) {
      return
    }
    let mounted = true
    const poll = (): void => {
      // Why: a hidden window has no one to show slot counts to.
      if (document.visibilityState !== 'visible') {
        return
      }
      void api
        .getSnapshot()
        .then((next) => mounted && setSnapshot(next))
        .catch(() => {})
    }
    poll()
    const timer = window.setInterval(poll, POLL_MS)
    document.addEventListener('visibilitychange', poll)
    return () => {
      mounted = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [])
  return snapshot
}

function heldFor(since: string): string {
  const minutes = Math.floor((Date.now() - Date.parse(since)) / 60_000)
  if (!Number.isFinite(minutes) || minutes < 1) {
    return 'under a minute'
  }
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/** Statvis fork: how many local bin/ci CPU slots are in use, and how many runs are waiting. */
export function StatvisCiSlotsStatusSegment({
  iconOnly
}: {
  iconOnly: boolean
}): React.JSX.Element | null {
  const snapshot = useStatvisCiSlots()
  if (isPairedWebClientWindow() || !snapshot?.available) {
    return null
  }

  const { busy, capacity, queued, holders } = snapshot
  const summary = `${busy} of ${capacity} CI slots in use${queued > 0 ? `, ${queued} queued` : ''}`

  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
              className="inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
              aria-label={summary}
            >
              <Cpu className={`size-3 ${busy > 0 ? 'text-foreground' : ''}`} />
              {!iconOnly ? (
                <span className="text-[11px] font-medium tabular-nums">
                  CI {busy}/{capacity}
                  {queued > 0 ? (
                    <span className="text-[color:var(--status-warning)]"> · {queued} queued</span>
                  ) : null}
                </span>
              ) : null}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {summary}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
        side="top"
        align="end"
        sideOffset={8}
        className="w-72"
      >
        <DropdownMenuLabel>
          <div className="flex items-center justify-between gap-3">
            <span>Local CI slots</span>
            <span className="font-normal text-muted-foreground tabular-nums">
              {busy}/{capacity} in use{queued > 0 ? ` · ${queued} queued` : ''}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {holders.length === 0 ? (
          <div className="px-2 py-1.5 text-[12px] text-muted-foreground">No bin/ci runs</div>
        ) : (
          holders.map((holder) => (
            <div
              key={`${holder.pid}:${holder.label}`}
              className="flex items-center justify-between gap-3 px-2 py-1.5 text-[12px]"
              title={`${holder.label} (pid ${holder.pid})`}
            >
              <span className="min-w-0 truncate">{basename(holder.label)}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {holder.slots} {holder.slots === 1 ? 'slot' : 'slots'} · {heldFor(holder.since)}
              </span>
            </div>
          ))
        )}
        {queued > 0 ? (
          <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
            {queued} {queued === 1 ? 'run is' : 'runs are'} waiting for free slots
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
