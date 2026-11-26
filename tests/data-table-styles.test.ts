import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('原位吸顶表格使用随单元格移动的连续边框，普通表格保持折叠边框', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/lib/style.css'), 'utf8');
  expect(css).toMatch(/\.suu-table\s*\{[^}]*border-collapse:\s*collapse\s*;/);
  expect(css).toMatch(
    /\.suu-table-wrap--in-flow-header\s*>\s*\.suu-table\s*\{[^}]*border-collapse:\s*separate\s*;[^}]*border-spacing:\s*0\s*;/
  );
  expect(css).not.toMatch(/\.suu-table__in-flow-header\s+th[^{}]*\{[^}]*box-shadow:/);
});
