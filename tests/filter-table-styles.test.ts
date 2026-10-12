import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('filter table title column fits content by default and stays resizable via CSS variable', () => {
  // jsdom 环境下 import.meta.url 不是 file 协议，?raw 又会被 vitest 的 CSS stub 置空，按工作目录读文件。
  const css = readFileSync(resolve(process.cwd(), 'src/lib/style.css'), 'utf8');
  // 标签列默认 max-content + nowrap：短标题不再为固定 10rem 留白，surplus 也不会
  // 压窄/推宽列；需要固定宽度的消费方仍可通过 --suu-filter-table-title-width 覆盖。
  expect(css).toMatch(
    /\.suu-filter-table__filters th \{[^}]*width: var\(--suu-filter-table-title-width, max-content\);[^}]*white-space: nowrap;/s
  );
  // 内容自适应依赖控件列声明吃满剩余宽度，否则 auto 表格的 surplus 分配仍会把
  // 标签列推宽；对固定宽度的消费方该声明是旧行为的显式化。
  expect(css).toMatch(
    /\.suu-filter-table__filters td \{[^}]*width: 100%;/s
  );
});
