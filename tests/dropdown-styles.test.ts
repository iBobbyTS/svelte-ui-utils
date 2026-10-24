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
