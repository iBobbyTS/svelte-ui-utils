# Compatibility Notes

This document records only releases that break existing behavior or require consumer migration.

## 0.3.0

`Dropdown` changes two defaults:

- `menuAlign` changes from `"right"` to `"left"`. Pass `menuAlign="right"` to preserve the previous alignment.
- `fitViewport` changes from `false` to `true`. Pass `fitViewport={false}` to preserve the previous stylesheet-level `100vh` panel limit instead of constraining the panel to the space available above or below the trigger.

## 0.3.6

`Dropdown` changes its `fitContent` default from `false` to `true`. Menus now size horizontally to their option content by default. Pass `fitContent={false}` to preserve the previous trigger-width menu behavior.
