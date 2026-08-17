# Compatibility Notes

This document records only releases that break existing behavior or require consumer migration.

## 0.3.0

`Dropdown` changes two defaults:

- `menuAlign` changes from `"right"` to `"left"`. Pass `menuAlign="right"` to preserve the previous alignment.
- `fitViewport` changes from `false` to `true`. Pass `fitViewport={false}` to preserve the previous stylesheet-level `100vh` panel limit instead of constraining the panel to the space available above or below the trigger.
