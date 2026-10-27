#!/usr/bin/env bash
# Statvis fork: fail when app code names upstream's releases directly instead of STATVIS_FORK_RELEASE_REPO,
# which would make the fork check upstream for updates (v1.4.255 added two such URLs).
set -euo pipefail
cd "$(dirname "$0")/../.."
if git grep -nE 'stablyai\\?/orca\\?/releases' -- src/main src/shared \
  ':!*.test.ts' ':!*.spec.ts' ':!*.fixture.ts' ':!**/testing/**'; then
  echo "::error::Route the release URLs above through STATVIS_FORK_RELEASE_REPO (src/shared/statvis-fork.ts)." >&2
  exit 1
fi
