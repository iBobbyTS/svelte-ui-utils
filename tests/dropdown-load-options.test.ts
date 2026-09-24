import { describe, expect, it, vi } from 'vitest';
import {
  createFetchLoadOptions,
  createLocalLoadOptions,
  toMultiSelection,
  toSingleSelection
} from '../src/lib/dropdown/index.js';
import type { DropdownLoadContext } from '../src/lib/dropdown/index.js';

function context(overrides: Partial<DropdownLoadContext> = {}): DropdownLoadContext {
  return { limit: 10, signal: new AbortController().signal, ...overrides };
}

function jsonResponse(payload: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => payload
  } as Response;
}

describe('createLocalLoadOptions', () => {
  const options = [
    { label: 'Alice Chen', value: '1' },
    { label: 'Bob Li', value: '2', searchText: 'xiaoli' },
    { label: 'Carol Wu', value: '3' }
  ];

  it('matches options case-insensitively over label and searchText', async () => {
    const load = createLocalLoadOptions(options);

    const byLabel = await load('AL', context());
    expect((byLabel.options ?? []).map((option) => option.value)).toEqual(['1']);

    const bySearchText = await load('xiao', context());
    expect((bySearchText.options ?? []).map((option) => option.value)).toEqual(['2']);

    const everything = await load('', context({ limit: 2 }));
    expect(everything.options ?? []).toHaveLength(2);
  });

  it('runs custom matches over raw items, maps them with toOption, and slices to the limit', async () => {
    interface User {
      id: number;
      displayName: string;
    }
    const users: User[] = [
      { id: 7, displayName: '张三' },
      { id: 8, displayName: '李四' },
      { id: 9, displayName: '王五' }
    ];
    const load = createLocalLoadOptions(users, {
      toOption: (user) => ({ value: String(user.id), label: user.displayName }),
      matches: (user, query) => user.id !== 7 && user.displayName.includes(query)
    });

    const result = await load('四', context());
    expect(result.options).toEqual([{ value: '8', label: '李四' }]);

    const excluded = await load('张', context());
    expect(excluded.options).toEqual([]);
  });

  it('re-evaluates a getter source on every search and awaits async sources', async () => {
    let revision = 0;
    const load = createLocalLoadOptions(async () => {
      revision += 1;
      return [{ label: `item-${revision}`, value: String(revision) }];
    });

    const first = await load('item', context());
    const second = await load('item', context());
    expect((first.options ?? []).map((option) => option.value)).toEqual(['1']);
    expect((second.options ?? []).map((option) => option.value)).toEqual(['2']);
  });

  it('caps the context limit with the configured limit', async () => {
    const load = createLocalLoadOptions(options, { limit: 1 });

    const result = await load('', context({ limit: 10 }));
    expect(result.options ?? []).toHaveLength(1);
  });
});

describe('createFetchLoadOptions', () => {
  it('posts the default body and decodes the payload through mapOptions', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse({ options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] })
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      const load = createFetchLoadOptions({
        url: '/api/search',
        mapOptions: (payload) => (payload as { options: Array<{ label: string; value: string }> }).options ?? []
      });

      const result = await load('a', context());
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/search');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({ query: 'a', limit: 10 });
      expect(result.options).toHaveLength(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('builds a custom body, applies the configured limit, and slices the result', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse({ options: [1, 2, 3, 4, 5].map((id) => ({ label: `u${id}`, value: String(id) })) })
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      const load = createFetchLoadOptions({
        url: '/api/search',
        buildBody: (query, limit) => ({ groupId: 5, query, limit }),
        limit: 2,
        mapOptions: (payload) => (payload as { options: Array<{ label: string; value: string }> }).options ?? []
      });

      const result = await load('张', context({ limit: 10 }));
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({ groupId: 5, query: '张', limit: 2 });
      expect(result.options).toHaveLength(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('skips the request for a blank query', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    try {
      const load = createFetchLoadOptions({ url: '/api/search', mapOptions: () => [] });
      const result = await load('   ', context());
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.options).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('resolves with no options on HTTP failures unless throwOnError is set', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'boom' }, false)));
    try {
      const quiet = createFetchLoadOptions({ url: '/api/search', mapOptions: () => [] });
      await expect(quiet('a', context())).resolves.toEqual({ options: [] });

      const strict = createFetchLoadOptions({ url: '/api/search', mapOptions: () => [], throwOnError: true });
      await expect(strict('a', context())).rejects.toThrow('search request failed: 500');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('always swallows aborted requests', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(abortError)));
    try {
      const load = createFetchLoadOptions({ url: '/api/search', mapOptions: () => [], throwOnError: true });
      await expect(load('a', context())).resolves.toEqual({ options: [] });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('selection narrowing helpers', () => {
  it('normalizes a selection to the multiselect shape', () => {
    expect(toMultiSelection('a')).toEqual(['a']);
    expect(toMultiSelection(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('normalizes a selection to the single-select shape', () => {
    expect(toSingleSelection('a')).toBe('a');
    expect(toSingleSelection(['a', 'b'])).toBe('a');
    expect(toSingleSelection([])).toBe('');
  });
});
