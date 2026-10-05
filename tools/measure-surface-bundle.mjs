#!/usr/bin/env node
// arthome-measure-surface-bundle — what a surface ships when it calls `createClient(api)`.
//
//   node tools/measure-surface-bundle.mjs [--json]
//
// For each api, bundles the three lines a surface writes, minified and tree-shaken, and prints the
// raw and gzip sizes and what each part of the graph contributes. It also names every docs or
// examples module the bundle reached: there must be none.
//
// It bundles the SOURCES through the `@arthome/source` condition, as the workspace's tests resolve
// them, so it needs no build. A report, not a gate.
//
// rolldown is not a dependency of this repository: it is reached through vitest, then vite, which
// bundle with it. If that chain moves, the script says so rather than measuring something else.

import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACTS = path.join(ROOT, 'packages/contracts/src');
const APIS = [
  { name: 'storefront', module: 'storefront-api/index.ts', binding: 'storefrontApi' },
  { name: 'studio', module: 'studio-api/index.ts', binding: 'studioApi' },
];
const DOCUMENTATION_MODULE = /(^|\/)(docs|examples)(\.ts|\/)|\.(docs|examples)\.ts$/;

async function loadRolldown() {
  try {
    const fromRoot = createRequire(path.join(ROOT, 'package.json'));
    const fromVitest = createRequire(fromRoot.resolve('vitest/package.json'));
    const fromVite = createRequire(fromVitest.resolve('vite/package.json'));
    return await import(pathToFileURL(fromVite.resolve('rolldown')).href);
  } catch (cause) {
    throw new Error('rolldown is no longer reachable through vitest and vite.', { cause });
  }
}

function entryOf(api) {
  const client = path.join(CONTRACTS, 'http-client/index.ts');
  const module = path.join(CONTRACTS, api.module);
  return [
    `import { createClient } from ${JSON.stringify(client)};`,
    `import { ${api.binding} } from ${JSON.stringify(module)};`,
    `export const client = createClient(${api.binding}, { baseUrl: 'https://api.example', fetch });`,
  ].join('\n');
}

function partOf(id) {
  const normalized = id.split(path.sep).join('/');
  const zod = /\/node_modules\/zod\//.exec(normalized);
  if (zod !== null) return 'zod';
  if (normalized.includes('/packages/core/')) return '@arthome/core';
  const contracts = /\/packages\/contracts\/src\/([^/]+)\//.exec(normalized);
  if (contracts !== null) return `contracts/${contracts[1]}`;
  return 'other';
}

async function measure(rolldown, api) {
  const ENTRY = '\0surface-entry';
  const bundle = await rolldown.rolldown({
    input: ENTRY,
    platform: 'browser',
    logLevel: 'silent',
    resolve: { conditionNames: ['@arthome/source', 'import', 'default'] },
    plugins: [
      {
        name: 'surface-entry',
        resolveId: (source) => (source === ENTRY ? ENTRY : null),
        load: (id) => (id === ENTRY ? entryOf(api) : null),
      },
    ],
  });
  const { output } = await bundle.generate({ format: 'esm', minify: true });
  await bundle.close();
  const chunks = output.filter((item) => item.type === 'chunk');
  const code = chunks.map((chunk) => chunk.code).join('\n');
  const parts = new Map();
  const documentation = [];
  for (const chunk of chunks) {
    for (const [id, info] of Object.entries(chunk.modules)) {
      if (id === ENTRY) continue;
      const relative = path.relative(ROOT, id);
      if (DOCUMENTATION_MODULE.test(relative)) documentation.push(relative);
      const part = partOf(id);
      parts.set(part, (parts.get(part) ?? 0) + info.renderedLength);
    }
  }
  return {
    api: api.name,
    rawBytes: Buffer.byteLength(code),
    gzipBytes: gzipSync(code).length,
    renderedBeforeMinifying: Object.fromEntries([...parts].sort((a, b) => b[1] - a[1])),
    documentationModules: documentation,
  };
}

const kilobytes = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const rolldown = await loadRolldown();
const results = [];
for (const api of APIS) results.push(await measure(rolldown, api));

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
} else {
  for (const result of results) {
    process.stdout.write(
      `${result.api}: ${kilobytes(result.rawBytes)} minified, ${kilobytes(result.gzipBytes)} gzip\n`,
    );
    for (const [part, bytes] of Object.entries(result.renderedBeforeMinifying)) {
      process.stdout.write(`  ${part.padEnd(28)} ${kilobytes(bytes)} before minifying\n`);
    }
    process.stdout.write(
      result.documentationModules.length === 0
        ? '  docs or examples modules reached: none\n'
        : `  docs or examples modules reached: ${result.documentationModules.join(', ')}\n`,
    );
  }
}
process.exitCode = results.some((result) => result.documentationModules.length > 0) ? 1 : 0;
