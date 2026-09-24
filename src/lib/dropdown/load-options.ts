import type { DropdownLoadOptions, DropdownOption } from './types.js';

/**
 * Source of local items for `createLocalLoadOptions`: a static array, or a
 * getter re-evaluated on every search when the underlying state changes.
 */
export type LocalLoadOptionsSource<TItem> = TItem[] | (() => TItem[] | Promise<TItem[]>);

export interface LocalLoadOptionsConfig<TItem, TOption extends DropdownOption> {
  /**
   * Converts a domain item into an option. Omit it only when the items already
   * satisfy the `{ label, value }` option contract.
   */
  toOption?: (item: TItem) => TOption;
  /**
   * Match predicate over the raw item; the query arrives trimmed. Defaults to
   * a case-insensitive substring match on the converted option's
   * `label`/`searchText`, where an empty query matches everything.
   */
  matches?: (item: TItem, query: string) => boolean;
  /** Upper bound applied on top of the context limit. */
  limit?: number;
}

function defaultOptionMatches(option: DropdownOption, query: string): boolean {
  const haystack = `${option.label} ${option.searchText ?? ''}`.trim().toLowerCase();
  return haystack.includes(query.toLowerCase());
}

/**
 * Builds a `loadOptions` implementation over an in-memory item list, so
 * "filter a local array, map it to options, slice to the limit" no longer has
 * to be written per call site. The result fits both the root `Dropdown` search
 * mode and the data-table `filter.dropdownSearch` control.
 */
export function createLocalLoadOptions<TItem extends DropdownOption>(
  source: LocalLoadOptionsSource<TItem>,
  config?: { matches?: (item: TItem, query: string) => boolean; limit?: number }
): DropdownLoadOptions;
export function createLocalLoadOptions<TItem, TOption extends DropdownOption>(
  source: LocalLoadOptionsSource<TItem>,
  config: LocalLoadOptionsConfig<TItem, TOption> & { toOption: (item: TItem) => TOption }
): DropdownLoadOptions;
export function createLocalLoadOptions<TItem, TOption extends DropdownOption>(
  source: LocalLoadOptionsSource<TItem>,
  config: LocalLoadOptionsConfig<TItem, TOption> = {}
): DropdownLoadOptions {
  return async (rawQuery, context) => {
    const query = rawQuery.trim();
    const items = typeof source === 'function' ? await source() : source;
    const toOption = config.toOption ?? ((item: TItem) => item as unknown as TOption);
    // A custom predicate sees the raw items (domain fields, exclusions); the
    // default one needs the converted options, so conversion order differs.
    const matched = config.matches
      ? items.filter((item) => config.matches?.(item, query)).map(toOption)
      : items.map(toOption).filter((option) => defaultOptionMatches(option, query));
    const limit = Math.min(config.limit ?? Number.POSITIVE_INFINITY, context.limit);
    return { options: matched.slice(0, limit) };
  };
}

export interface FetchLoadOptionsConfig<TOption extends DropdownOption> {
  /** Request URL; the JSON body defaults to `{ query, limit }`. */
  url: string;
  /** HTTP method, default `POST`. */
  method?: string;
  /** Extra request headers on top of `content-type: application/json`. */
  headers?: Record<string, string>;
  /** Builds the JSON body from the trimmed query and the effective limit. */
  buildBody?: (query: string, limit: number) => Record<string, unknown>;
  /**
   * Decodes the JSON payload into options; the factory slices the result to
   * the effective limit.
   */
  mapOptions: (payload: unknown, query: string) => TOption[];
  /** Upper bound applied on top of the context limit. */
  limit?: number;
  /**
   * Rethrow HTTP and network failures instead of resolving with no options.
   * Aborted requests (a newer query superseded this one) always resolve with
   * no options.
   */
  throwOnError?: boolean;
}

/**
 * Builds a `loadOptions` implementation around one JSON search endpoint: URL,
 * optional body builder, payload decoding, limit handling, and abort/HTTP
 * error policy in one place. Use it for both the root `Dropdown` search mode
 * and the data-table `filter.dropdownSearch` control.
 */
export function createFetchLoadOptions<TOption extends DropdownOption>(
  config: FetchLoadOptionsConfig<TOption>
): DropdownLoadOptions {
  return async (rawQuery, context) => {
    const query = rawQuery.trim();
    if (!query) {
      return { options: [] };
    }
    const limit = Math.min(config.limit ?? Number.POSITIVE_INFINITY, context.limit);
    try {
      const response = await fetch(config.url, {
        method: config.method ?? 'POST',
        headers: { 'content-type': 'application/json', ...config.headers },
        body: JSON.stringify(config.buildBody ? config.buildBody(query, limit) : { query, limit }),
        signal: context.signal
      });
      if (!response.ok) {
        if (config.throwOnError) {
          throw new Error(`search request failed: ${response.status}`);
        }
        return { options: [] };
      }
      const payload: unknown = await response.json();
      const options = config.mapOptions(payload, query);
      return { options: Array.isArray(options) ? options.slice(0, limit) : [] };
    } catch (error) {
      if (
        config.throwOnError &&
        !(error instanceof Error && error.name === 'AbortError')
      ) {
        throw error;
      }
      return { options: [] };
    }
  };
}
