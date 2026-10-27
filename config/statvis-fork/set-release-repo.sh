#!/usr/bin/env bash
# Points the app's updater at the given repo (e.g. Statvis/orca). Run before building a fork release.
set -euo pipefail

repo="${1:?usage: set-release-repo.sh <owner/repo>}"
file="$(cd "$(dirname "$0")/../.." && pwd)/src/shared/statvis-fork.ts"
pattern="^export const STATVIS_FORK_RELEASE_REPO = '[^']*'$"

if [[ "$(grep -c "$pattern" "$file")" != 1 ]]; then
  echo "set-release-repo: expected exactly one STATVIS_FORK_RELEASE_REPO line in $file" >&2
  exit 1
fi
sed -i.bak "s#$pattern#export const STATVIS_FORK_RELEASE_REPO = '$repo'#" "$file"
rm -f "$file.bak"
grep -q "STATVIS_FORK_RELEASE_REPO = '$repo'" "$file"
echo "Updater release repo set to $repo."
