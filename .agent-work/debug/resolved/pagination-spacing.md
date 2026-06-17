# DataTable Pagination Vertical Spacing

## Confirmed Observations

- User reports first centering attempt added a little top space but made the bottom space larger.
- Current diff adds `min-height: 58px` to `.suu-pagination`, flex centering to buttons/ellipsis, and fixed select height.
- The visual symptom is on MMS `/members`, consuming local `@ibobbyts/svelte-ui-utils` dist.

## Root Cause

- Measurements showed `.suu-pagination` itself was vertically centered:
  - page button: 12px top and 12px bottom inside the pagination row.
  - page-size select: 8px top and 8px bottom inside the pagination row.
- The apparent extra bottom space came from `.suu-data-table` having `rowGap: 12px`, which was stacked below the pagination row before the table header.

## Fix

- Changed `.suu-data-table` gap to `0`.
- Added `.suu-table-wrap + .suu-pagination { margin-top: 12px; }` to preserve spacing before the bottom pagination only.

## Verification

- `npm run package` passed.
- `npm run check` passed with 0 errors and 0 warnings.
- Synchronized local package into MMS via `sh scripts/sync-local-ui-utils.sh`.
- Browser DOM measurements after reload:
  - `paginationBottomToTableWrapTop: 0`.
  - `paginationBottomToHeaderTop: 0`.
  - `buttonBottomToHeaderTop: 12`.
  - `selectBottomToHeaderTop: 8`.
- User manually confirmed the UI looked correct.
