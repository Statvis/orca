/**
 * Statvis fork: stable/RC updates come from this repo's releases, signed with Statvis' Developer ID.
 * Why upstream's repo is the default: upstream code and tests stay untouched, so rebases rarely
 * conflict. The fork's release build sets Statvis/orca via config/statvis-fork/set-release-repo.sh.
 */
export const STATVIS_FORK_RELEASE_REPO = 'stablyai/orca'
export const STATVIS_FORK_LATEST_DOWNLOAD_URL = `https://github.com/${STATVIS_FORK_RELEASE_REPO}/releases/latest/download`
