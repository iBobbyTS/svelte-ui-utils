// @vitest-environment node
// 网站经 SvelteKit 服务端渲染消费 DataTable：分组表的结构（两行表头、跨行父格、
// 子行、colgroup）必须在没有浏览器的 SSR 输出里成立，且不能渲染吸顶副本。
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import DataTable from '../src/lib/data-table/DataTable.svelte';

type Detail = { id: number; label: string; count: string };
type SlotRow = { id: string; name: string; details: Detail[] };

const rows: SlotRow[] = [
  { id: 'a', name: '甲', details: [{ id: 1, label: '甲一', count: '1' }] },
  {
    id: 'b',
    name: '乙',
    details: [
      { id: 2, label: '乙一', count: '2' },
      { id: 3, label: '乙二', count: '3' }
    ]
  }
];

const columns = [
  { key: 'name', header: '姓名' },
  {
    key: 'details',
    header: '明细',
    subColumns: [
      { key: 'label', header: '项目' },
      { key: 'count', header: '数量', width: '6rem' }
    ],
    getSubRows: (row: unknown) => (row as SlotRow).details
  }
];

function renderTable(overrides: Record<string, unknown> = {}) {
  return render(DataTable as never, {
    props: { pagination: false, rows, columns, ...overrides } as never
  }).body;
}

describe('data table server rendering', () => {
  it('renders the grouped two-row header and the sub rows without a browser', () => {
    const body = renderTable();

    expect(body).toContain('suu-table--grouped');
    expect(body).toContain('<colgroup>');
    expect(body).toContain('scope="colgroup"');
    expect(body).toContain('colspan="2"');
    expect(body).toContain('rowspan="2"');
    expect(body.match(/<thead>/g)).toHaveLength(1);
    expect(body.match(/<tr[ >]/g)?.length).toBe(5);
    expect(body).toContain('项目');
    expect(body).toContain('数量');
    expect(body).toContain('甲一');
    expect(body).toContain('乙二');
    expect(body.match(/suu-table__row-group/g)).toHaveLength(2);
    expect(body).not.toContain('suu-table__sticky-clone');
  });

  it('renders a plain table with one header row and no grouped markup', () => {
    const body = render(DataTable as never, {
      props: {
        pagination: false,
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name' }]
      } as never
    }).body;

    expect(body).not.toContain('suu-table--grouped');
    expect(body).not.toContain('<colgroup>');
    expect(body.match(/<th[ >]/g)).toHaveLength(1);
    expect(body).not.toContain('data-suu-first-column');
    expect(body).not.toContain('suu-table__sticky-clone');
  });
});
