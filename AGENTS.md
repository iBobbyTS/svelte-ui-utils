# Repository Instructions

## Release Authorization

- A user request to publish authorizes exactly one publication. Do not publish a second time for the same request; require a new explicit authorization before any subsequent publication.

## Compatibility Documentation

- Update `COMPATIBILITY.md` only when a change breaks existing behavior or requires consumer migration.
- Do not add entries for backward-compatible features, fixes, refactors, tests, or documentation-only changes.
- Each entry must identify the release, describe the old and new behavior, and give the exact migration or opt-out path when one exists.
