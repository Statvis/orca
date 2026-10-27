import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { STATVIS_FORK_RELEASE_REPO } from '../../../shared/statvis-fork'

/** Marks the Statvis fork build so it is never mistaken for upstream Orca. */
export function StatvisForkBadge(): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Why: brand orange matches the SV disc stamped onto the fork's app icon. */}
        <span className="mx-1 inline-flex h-4 shrink-0 items-center rounded-full bg-[#ed5421] px-1.5 text-[10px] font-bold leading-none text-white [-webkit-app-region:no-drag]">
          SV
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        Statvis fork of Orca · updates from {STATVIS_FORK_RELEASE_REPO}
      </TooltipContent>
    </Tooltip>
  )
}
