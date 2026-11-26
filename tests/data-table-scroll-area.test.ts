import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import TableScrollAreaHarness from './fixtures/TableScrollAreaHarness.svelte';

test('共用视口的分组表使用真实双层表头，首列跨行固定，不创建另一套表头', () => {
  render(TableScrollAreaHarness);
  const viewport = screen.getByRole('region', { name: 'Score tables' });
  expect(viewport).not.toContainElement(screen.getByRole('button', { name: 'Toggle toolbar' }));
  const tables = [...viewport.querySelectorAll('table')];
  expect(tables).toHaveLength(4);
  for (const table of tables) {
    expect(table.parentElement).toHaveClass('suu-table-wrap--shared-scroll');
    expect(table).toHaveClass('suu-table--pin-first-column');
    expect(table.tHead).toHaveClass('suu-table__native-header');
    expect(table.tHead).not.toHaveClass('suu-table__in-flow-header');
    expect(table.tHead?.rows).toHaveLength(2);
    expect(table.tHead?.rows[0].cells[0]).toHaveAttribute('rowspan', '2');
    expect(table.tBodies[0].rows[0].cells[0]).toHaveAttribute('rowspan', '2');
    expect(table.tHead?.querySelectorAll('[data-suu-resize-track]')).toHaveLength(4);
  }
});

test('关闭吸顶不关闭共用横滚或固定首列', () => {
  render(TableScrollAreaHarness, { stickyHeader: false });
  const table = screen.getAllByRole('table')[0];
  expect(table.parentElement).toHaveClass('suu-table-wrap--shared-scroll');
  expect(table).toHaveClass('suu-table--pin-first-column');
  expect(table.querySelector('thead')).not.toHaveClass('suu-table__native-header');
  expect(table.querySelector('[data-suu-pinned-group]')).toBeNull();
});

test('中间普通列和非首子列按显示顺序吸附，父表头保留原跨列结构', () => {
  render(TableScrollAreaHarness, { pinDetails: true });
  const table = screen.getAllByRole('table')[0] as HTMLTableElement;
  const [main, sub] = table.tHead!.rows;
  const [part, group, status] = Array.from(main.cells);
  const [name, audio, notes] = Array.from(sub.cells);
  expect(group).toHaveAccessibleName('Players');
  expect(group).toHaveAttribute('colspan', '3');
  expect(group).toHaveAttribute('data-suu-pinned-group');
  expect(group.style.getPropertyValue('--suu-table-pin-start')).toBe('220px');
  expect(part.style.getPropertyValue('--suu-table-pin-start')).toBe('0px');
  expect(audio.style.getPropertyValue('--suu-table-pin-start')).toBe('220px');
  expect(status.style.getPropertyValue('--suu-table-pin-start')).toBe('530px');
  expect(audio).toHaveAttribute('data-suu-pinned-edge');
  expect(status).not.toHaveAttribute('data-suu-pinned-edge'); // 最后一列没有下一列，与表格外框不重复画线。
  expect(part).not.toHaveAttribute('data-suu-pinned-edge'); // 旧首列保留调用方原有边线。
  expect(name).not.toHaveAttribute('data-suu-pinned');
  expect(notes).not.toHaveAttribute('data-suu-pinned');
  const [first, next] = table.tBodies[0].rows;
  expect(first.cells[2]).toHaveTextContent('Ready');
  expect(first.cells[2].style.getPropertyValue('--suu-table-pin-start')).toBe('220px');
  expect(first.cells[2]).toHaveAttribute('data-suu-pinned-edge');
  expect(next.cells[1]).toHaveTextContent('Ready');
  expect(next.cells[1]).toHaveAttribute('data-suu-pinned-edge');
  expect(next.cells[1].style.getPropertyValue('--suu-table-pin-start')).toBe('220px');
});
