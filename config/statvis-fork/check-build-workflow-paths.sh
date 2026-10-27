#!/usr/bin/env bash
# Statvis fork: fail when statvis-fork-build.yml calls a script or pnpm task upstream moved or renamed
# (v1.4.256 moved config/scripts/*.mjs into subfolders and the mac build died after rebasing cleanly).
set -euo pipefail
cd "$(dirname "$0")/../.."
workflow=.github/workflows/statvis-fork-build.yml
missing=0

for path in $(grep -oE '(\./)?(config|\.github)/[A-Za-z0-9_./-]+' "$workflow" | sed 's#^\./##' | sort -u); do
  if [[ ! -e "$path" ]]; then
    echo "::error file=$workflow::$path no longer exists"
    missing=1
  fi
done

for task in $(grep -oE 'pnpm (run )?[a-z][a-z0-9:-]+' "$workflow" | awk '{print $NF}' | sort -u); do
  case "$task" in install | exec | run) continue ;; esac
  if ! node -e 'process.exit(require("./package.json").scripts?.[process.argv[1]] ? 0 : 1)' "$task"; then
    echo "::error file=$workflow::package.json has no \"$task\" script"
    missing=1
  fi
done

if (( missing )); then
  echo "::error::Update $workflow to match upstream's current paths (see upstream's release-mac-build.yml)." >&2
fi
exit "$missing"
