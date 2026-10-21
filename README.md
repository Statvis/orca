# Statvis fork of Orca — automation branch

This default branch only holds automation. The fork's code is on `statvis/main`
(upstream release tag + Statvis commits); releases are published here and the
installed app (orange **SV** badge) updates from them.

- `statvis-fork-sync.yml` (every 2h): when stablyai/orca ships a stable release,
  rebases `statvis/main` onto it, tags it, opens a draft release, and dispatches
  the build.
- `statvis-fork-build.yml`: copy kept here only so the workflow can be dispatched;
  the run uses the version on `statvis/main`.

If a sync fails with a rebase conflict: rebase `statvis/main` onto the new tag
locally, resolve, `git push --force-with-lease`, then re-run the sync workflow.
