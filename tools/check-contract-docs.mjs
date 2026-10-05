#!/usr/bin/env node
// arthome-check-contract-docs — the documentation of the contracts stays out of the surfaces.
//
// WHAT IT GUARANTEES
//   1. No subpath a surface imports from @arthome/contracts reaches, at any depth, a docs or
//      examples module (`docs.ts`, `examples.ts`, `<module>.docs.ts`, `<module>.examples.ts`) or the
//      emitter (`src/openapi/`). A surface calling `createClient(storefrontApi)` therefore bundles
//      no operation prose, no registered example and no introduction. `./openapi` (the emitter) and
//      `./<api>/docs` (an api's docs, for a server's own docs) are server only and are not walked.
//   2. `MATURITY_BY_SERVICE` says what `transport.md` §5.11, which owns the regimes, says.
//
// HOW
//   Walks the SOURCES, as arthome-check-core-entry does, so it needs no install and no build.
//   `import type` and `export type` are skipped: under `verbatimModuleSyntax` they are the only
//   imports the compiler erases, and every other one survives into the bundle. The walk proves
//   itself on each api's docs module, which must reach the emitter's docs.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CWD = process.cwd();
const CONTRACTS = path.resolve(CWD, 'packages/contracts');
const SOURCES = path.join(CONTRACTS, 'src');
const EMITTER = path.join(SOURCES, 'openapi');
const EMITTER_SUBPATH = './openapi';
const DOCUMENTATION_MODULE = /(^|\/)(docs|examples)\.ts$|\.(docs|examples)\.ts$/;

const IMPORT_RE = /(?:^|\n)\s*(import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function runtimeSpecifiersOf(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  for (const [, , typeOnly, specifier] of source.matchAll(IMPORT_RE)) {
    if (typeOnly === undefined) out.push(specifier);
  }
  for (const [, specifier] of source.matchAll(DYNAMIC_RE)) out.push(specifier);
  return out;
}

function resolveRelative(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base.replace(/\.js$/, '.ts'), `${base}.ts`, path.join(base, 'index.ts')];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
}

/** Every module reachable from `entry`, each with the chain that reached it. */
function reachable(entry) {
  const chains = new Map([[entry, [entry]]]);
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift();
    for (const specifier of runtimeSpecifiersOf(file)) {
      if (!specifier.startsWith('.')) continue;
      const next = resolveRelative(file, specifier);
      if (next === null || chains.has(next)) continue;
      chains.set(next, [...chains.get(file), next]);
      queue.push(next);
    }
  }
  return chains;
}

function isDocumentation(file) {
  const relative = path.relative(SOURCES, file).split(path.sep).join('/');
  return DOCUMENTATION_MODULE.test(relative) || file.startsWith(`${EMITTER}${path.sep}`);
}

const rel = (file) => path.relative(CWD, file);

function surfaceEntries() {
  const manifest = JSON.parse(fs.readFileSync(path.join(CONTRACTS, 'package.json'), 'utf8'));
  return Object.entries(manifest.exports)
    .filter(([subpath, target]) => subpath !== EMITTER_SUBPATH && typeof target === 'object')
    .map(([subpath, target]) => [subpath, path.join(CONTRACTS, target['@arthome/source'])])
    .filter(([, entry]) => !DOCUMENTATION_MODULE.test(entry));
}

function checkSurfaces() {
  const failures = [];
  let walked = 0;
  for (const [subpath, entry] of surfaceEntries()) {
    const chains = reachable(entry);
    walked += chains.size;
    for (const [file, chain] of chains) {
      if (isDocumentation(file)) failures.push({ subpath, chain });
    }
  }
  const apiDocs = fs
    .readdirSync(SOURCES)
    .filter((dir) => path.join(SOURCES, dir) !== EMITTER)
    .map((dir) => path.join(SOURCES, dir, 'docs.ts'))
    .filter((file) => fs.existsSync(file));
  const blind = apiDocs.filter((file) => !reachable(file).has(path.join(EMITTER, 'docs.ts')));
  return { failures, walked, apiDocs, blind };
}

/** `| `identity`, `catalog` | **stable** |` rows of §5.11, as service -> regime. */
function regimesInTransport() {
  const transport = fs.readFileSync(path.resolve(CWD, 'architecture/transport.md'), 'utf8');
  const section = transport.slice(transport.indexOf('### 5.11'), transport.indexOf('### 5.12'));
  const regimes = new Map();
  for (const [, services, regime] of section.matchAll(
    /^\| ((?:`[a-z]+`(?:, )?)+) \| \*\*([a-z]+)\*\* \|/gm,
  )) {
    for (const [, service] of services.matchAll(/`([a-z]+)`/g)) regimes.set(service, regime);
  }
  return regimes;
}

function regimesInCode() {
  const source = fs.readFileSync(path.join(EMITTER, 'docs.ts'), 'utf8');
  const table = /MATURITY_BY_SERVICE[^=]*=\s*\{([^}]*)\}/.exec(source)?.[1] ?? '';
  const regimes = new Map();
  for (const [, member, regime] of table.matchAll(/\[Service\.([A-Z_]+)\]:\s*'([a-z]+)'/g)) {
    regimes.set(member.toLowerCase(), regime);
  }
  return regimes;
}

function main() {
  const { failures, walked, apiDocs, blind } = checkSurfaces();
  let failed = false;
  if (blind.length > 0) {
    console.error('FAIL the walk does not see the emitter from these docs modules:');
    for (const file of blind) console.error(`  ${rel(file)}`);
    failed = true;
  }
  if (failures.length > 0) {
    console.error(`FAIL a surface subpath reaches ${failures.length} documentation module(s):`);
    for (const { subpath, chain } of failures) {
      console.error(`  ${subpath}: ${chain.map(rel).join('\n      -> ')}`);
    }
    console.error('  Only an api docs module and the emitter import docs and examples.');
    failed = true;
  }
  const transport = regimesInTransport();
  const code = regimesInCode();
  const disagreements = [...new Set([...transport.keys(), ...code.keys()])].filter(
    (service) => transport.get(service) !== code.get(service),
  );
  if (transport.size === 0 || disagreements.length > 0) {
    console.error('FAIL MATURITY_BY_SERVICE and transport.md §5.11 disagree:');
    for (const service of disagreements) {
      console.error(
        `  ${service}: transport.md says ${transport.get(service) ?? 'nothing'}, the code ${code.get(service) ?? 'nothing'}`,
      );
    }
    failed = true;
  }
  if (failed) process.exit(1);
  console.log(
    `PASS no surface subpath reaches a docs or examples module (${walked} module visits; ` +
      `${apiDocs.length} docs modules seen reaching the emitter)`,
  );
  console.log(`PASS MATURITY_BY_SERVICE matches transport.md §5.11 (${code.size} services)`);
}

main();
