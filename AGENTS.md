# Repository Instructions

## Release Authorization

- A user request to publish authorizes exactly one publication. Do not publish a second time for the same request; require a new explicit authorization before any subsequent publication.

## Compatibility Documentation

- Update `COMPATIBILITY.md` only when a change breaks existing behavior or requires consumer migration.
- Do not add entries for backward-compatible features, fixes, refactors, tests, or documentation-only changes.
- Each entry must identify the release, describe the old and new behavior, and give the exact migration or opt-out path when one exists.

## Design Tokens

- `src/lib/style.css` 中的 `:root` 是视觉 token 的唯一来源。
- 新增或修改非零圆角前，先复用现有的 `--suu-radius-*` token；现有刻度无法表达已确认的设计需求时，先在该 token 区新增定义，再由组件引用。
- 组件样式不得直接写非零的 `border-radius` 数值，也不得在组件内临时计算新的圆角。`0` 可直接用于明确取消圆角。
- 涉及边框内外轮廓时，使用现有派生 token，确保内半径与外半径、边框宽度保持几何一致。
