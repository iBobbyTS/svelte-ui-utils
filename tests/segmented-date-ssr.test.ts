// @vitest-environment node
// SSR 渲染输出字符串、esbuild transform 也不依赖 DOM；jsdom 的 TextEncoder
// polyfill 反而会破坏 esbuild 的环境不变量，故本文件单独用 node 环境。
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, beforeAll, expect, it } from 'vitest';
import { transform } from 'esbuild';
import { compile } from 'svelte/compiler';

// Compile the real component source for the server and render it through
// svelte/server: segment values must appear in SSR output from the incoming
// value alone. Before the initial-state fix, segments started as empty
// strings and only a $effect synced them from value — and $effect never runs
// on the server, so consumers rendered blank dates until hydration.
let SegmentedDateInputServer: unknown;
let render: typeof import('svelte/server').render;
// node_modules is ignored, so a crash between beforeAll/afterAll cannot leak
// build output into the working tree. Both files are plain ESM so the native
// import chain works without vitest transforms (source state.ts is TS only).
const compiledDirectory = path.resolve(process.cwd(), 'node_modules/.segmented-date-ssr-tests');

beforeAll(async () => {
  await mkdir(compiledDirectory, { recursive: true });
  const sourceDirectory = path.resolve(process.cwd(), 'src/lib/segmented-date');
  const source = (
    await readFile(path.join(sourceDirectory, 'SegmentedDateInput.svelte'), 'utf8')
  ).replace('from "./state.js";', 'from "./state.mjs";');
  const stateModule = await transform(
    await readFile(path.join(sourceDirectory, 'state.ts'), 'utf8'),
    { loader: 'ts', format: 'esm' }
  );
  await writeFile(path.join(compiledDirectory, 'state.mjs'), stateModule.code);
  const compiledFile = path.join(compiledDirectory, 'SegmentedDateInputServer.mjs');
  await writeFile(
    compiledFile,
    compile(source, {
      filename: 'SegmentedDateInput.svelte',
      generate: 'server'
    }).js.code
  );
  SegmentedDateInputServer = (await import(pathToFileURL(compiledFile).href)).default;
  ({ render } = await import('svelte/server'));
});

afterAll(async () => {
  await rm(compiledDirectory, { recursive: true, force: true });
});

function renderBody(value: string): string {
  const renderComponent = render as unknown as (
    component: unknown,
    options: { props: Record<string, unknown> }
  ) => { body: string };
  return renderComponent(SegmentedDateInputServer, {
    props: {
      name: 'dob',
      value,
      ariaLabel: 'Birthday',
      yearLabel: 'Year',
      monthLabel: 'Month',
      dayLabel: 'Day'
    }
  }).body;
}

function segmentValue(body: string, label: string): string {
  const input = body.match(new RegExp(`<input[^>]*aria-label="${label}"[^>]*>`))?.[0];
  if (!input) throw new Error(`segment input not found: ${label}`);
  return input.match(/\bvalue="([^"]*)"/)?.[1] ?? '';
}

function hiddenValue(body: string): string {
  const input = body.match(/<input[^>]*type="hidden"[^>]*name="dob"[^>]*>/)?.[0];
  if (!input) throw new Error('hidden input not found: dob');
  return input.match(/\bvalue="([^"]*)"/)?.[1] ?? '';
}

it('renders full dates into the segment inputs and hidden field on the server', () => {
  const body = renderBody('2001-05-17');
  expect(segmentValue(body, 'Year')).toBe('2001');
  expect(segmentValue(body, 'Month')).toBe('05');
  expect(segmentValue(body, 'Day')).toBe('17');
  expect(hiddenValue(body)).toBe('2001-05-17');
});

it('renders month-day-only values with an empty year segment', () => {
  // Consumers normalize to `${year}-${month}-${day}`, so a missing year keeps
  // a single leading dash (e.g. -05-17) rather than a double one.
  const body = renderBody('-05-17');
  expect(segmentValue(body, 'Year')).toBe('');
  expect(segmentValue(body, 'Month')).toBe('05');
  expect(segmentValue(body, 'Day')).toBe('17');
  expect(hiddenValue(body)).toBe('-05-17');
});

it('renders empty values as empty segments without inventing a date', () => {
  const body = renderBody('');
  expect(segmentValue(body, 'Year')).toBe('');
  expect(segmentValue(body, 'Month')).toBe('');
  expect(segmentValue(body, 'Day')).toBe('');
  expect(hiddenValue(body)).toBe('');
});
