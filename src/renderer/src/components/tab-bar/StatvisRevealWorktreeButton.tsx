import { FolderOpen } from 'lucide-react'
import { useAppStore } from '@/store'
import { useRepoById, useWorktreeById } from '@/store/selectors'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { runtimeEnvironmentIdOrLocalUnlessTwin } from '@/lib/worktree-runtime-owner'
import { getWorkspaceFileRevealOwner, revealInFileManager } from '@/lib/reveal-in-file-manager'
import {
  getLocalPathOpenOwnerHostId,
  isRevealOrEditorOpenBlocked,
  type LocalPathOpenOwner
} from '@/lib/local-path-open-guard'
import { getLocalFileManagerLabel } from '@/lib/local-file-manager-label'

async function openWorkspaceFolder(path: string, owner: LocalPathOpenOwner): Promise<void> {
  const ownerHostId = getLocalPathOpenOwnerHostId(owner)
  if (ownerHostId !== 'unresolved' && (await window.api.shell.openFilePath(path, ownerHostId))) {
    return
  }
  // Why: reveal covers owners the system-default open refuses (e.g. WSL) and toasts real failures.
  await revealInFileManager(path, owner)
}

/** Statvis fork: opens the tab group's workspace folder in Finder (or the platform's file manager). */
export function StatvisRevealWorktreeButton({
  worktreeId
}: {
  worktreeId: string
}): React.JSX.Element | null {
  const worktree = useWorktreeById(worktreeId)
  const repo = useRepoById(worktree?.repoId ?? null)
  const runtimeEnvironmentId = useAppStore((s) =>
    runtimeEnvironmentIdOrLocalUnlessTwin(s, worktreeId)
  )
  // Why: a folder workspace has no repo row, so only the catalog owner names its SSH host.
  const owner = useAppStore((s) =>
    getWorkspaceFileRevealOwner(s, worktreeId, {
      connectionId: repo?.connectionId,
      runtimeEnvironmentId
    })
  )

  // Why hidden rather than disabled: an SSH or remote workspace has no local folder to show.
  if (!worktree?.path || owner === 'unresolved' || isRevealOrEditorOpenBlocked(owner)) {
    return null
  }
  const label = `Open in ${getLocalFileManagerLabel()}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => void openWorkspaceFolder(worktree.path, owner)}
          className="my-auto flex h-7 shrink-0 items-center rounded-md px-1.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={label}
        >
          <FolderOpen className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
