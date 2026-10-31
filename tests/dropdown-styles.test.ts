import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

// jsdom 无布局，触发按钮的省略契约只能锁 CSS 声明本身（先例：filter-table-styles.test.ts）。
// 两条声明合起来才是完整契约：宿主宽度约束能传导进组件（min-width:0 防撑破），
// 超长文本在 label 内截断（hidden + ellipsis，多选叠加 nowrap 单行）。
test('dropdown trigger never stretches its host and ellipsizes overflow instead', () => {
  // jsdom 环境下 import.meta.url 不是 file 协议，?raw 又会被 vitest 的 CSS stub 置空，按工作目录读文件。
  const css = readFileSync(resolve(process.cwd(), 'src/lib/style.css'), 'utf8');
  expect(css).toMatch(/\.suu-dropdown \{[^}]*min-width: 0;/s);
  expect(css).toMatch(
    /\.suu-dropdown__label \{[^}]*min-width: 0;[^}]*overflow: hidden;[^}]*text-overflow: ellipsis;/s
  );
  expect(css).toMatch(
    /\.suu-dropdown--multiselect \.suu-dropdown__button \.suu-dropdown__label \{[^}]*white-space: nowrap;/s
  );
});

// 菜单横向溢出契约：portal 菜单宽度介于「触发器宽+外扩」与「JS 按对齐方向
// 算出的视口预算」之间，可放开通到内容宽（窄触发器表格里长选项不再两行截断）；
// 非 portal fit-content 菜单首选内容宽但受库级视口上限约束，受限后选项回退
// label 基础两行省略而不是被强制单行后横向裁切——强制 nowrap 因此被移除。
test('dropdown menus clamp horizontally and degrade to wrapping, never clipping', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/lib/style.css'), 'utf8');
  expect(css).toMatch(
    /\.suu-dropdown__menu--portal \{[^}]*width: max\(var\(--suu-dropdown-menu-width, 0px\), min\(max-content, var\(--suu-dropdown-menu-max-width, 100vw\)\)\);/s
  );
  expect(css).toMatch(
    /\.suu-dropdown__menu--fit-content:not\(\.suu-dropdown__menu--portal\) \{[^}]*width: max-content;[^}]*max-width: var\(--suu-dropdown-menu-max-width, calc\(100vw - 40px\)\);/s
  );
  expect(css).toMatch(
    /\.suu-dropdown__menu--fit-content:not\(\.suu-dropdown__menu--portal\) \.suu-dropdown__panel \{[^}]*min-width: min\(max-content, 100%\);/s
  );
  const optionRule = css.match(
    /\.suu-dropdown__menu--fit-content:not\(\.suu-dropdown__menu--portal\) \.suu-dropdown__option \{[^}]*\}/s
  )?.[0];
  expect(optionRule).toBeDefined();
  expect(optionRule).not.toMatch(/white-space:\s*nowrap/);
  expect(css).not.toMatch(
    /\.suu-dropdown__menu--fit-content[^{]*\.suu-dropdown__label \{/s
  );
});

// 输入态多选 chip 的截断链：chip 允许收缩 + 标签 min-width:0 才能触达省略，
// 移除按钮不参与收缩，超长昵称不得撑破控件或宿主表格。
test('dropdown multiselect chips ellipsize long labels inside the chip', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/lib/style.css'), 'utf8');
  expect(css).toMatch(
    /\.suu-dropdown__selected-item-label \{[^}]*min-width: 0;[^}]*overflow: hidden;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/s
  );
  expect(css).toMatch(/\.suu-dropdown__selected-remove \{[^}]*flex: 0 0 auto;/s);
});

// 截断链的前提是布局：输入态多选必须纵向排列。横向 inline-flex 里 chips
// 与输入框并排，nowrap chip 的 min-content 既撑破宿主约束又把输入框挤成
// 窄条，max-width:100% 解析不到受限的容器宽。
test('search-input multiselect dropdowns stack chips above the input', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/lib/style.css'), 'utf8');
  expect(css).toMatch(
    /\.suu-dropdown--search-input\.suu-dropdown--multiselect \{[^}]*flex-direction: column;/s
  );
});
