#!/usr/bin/env node
// arthome-check-tsconfig — the tsconfig locks have not been loosened.
//
// Reading the seven repositories' tsconfig.json files proves nothing: it is the
// RESOLVED configuration that runs, and an `extends` is bypassed by one local
// line. So the check looks at the result of resolution, not at the files.
//
// Two modes:
//   - if `tsc` resolves, ask it for `--showConfig` — that is the reference;
//   - otherwise resolve the `extends` chain ourselves (JSON with comments,
//     package-name resolution included). The fallback exists so the gate runs
//     BEFORE typescript is installed: a gate that needs an install in order to
//     exist does not exist on the day a repository is created.
//
// It also checks what `--showConfig` will never tell you: that the three base
// files of @arthome/tooling carry NO path-bearing option. Relative paths in an
// extended tsconfig resolve FROM THE FILE THEY ARE WRITTEN IN, i.e. from
// node_modules/@arthome/tooling/tsconfig/ — an include: ["src"] in the base
// would literally compile @arthome/tooling's own sources.
//
// See architecture/code-conventions.md sections 4.4.4, 4.5 and 4.5.1.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const CWD = process.cwd();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOCKS = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'tsconfig-locks.json'), 'utf8'));

const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const only = args.indexOf('--project');
const PROJECTS = only !== -1 && args[only + 1] ? [args[only + 1]] : null;

const problems = [];
const notes = [];

// ---------------------------------------------------------- JSON with comments
// tsconfig accepts // and /* */ and trailing commas, so JSON.parse alone will not do.
function parseJsonc(text) {
  let out = '';
  let i = 0;
  let inStr = false;
  let esc = false;
  while (i < text.length) {
    const c = text[i];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      i += 1;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}

const readJsonc = (p) => parseJsonc(fs.readFileSync(p, 'utf8'));

// ------------------------------------------------ resolving the extends chain
function resolveExtends(spec, fromFile) {
  const fromDir = path.dirname(fromFile);
  if (spec.startsWith('.') || path.isAbsolute(spec)) {
    const direct = path.resolve(fromDir, spec);
    for (const cand of [direct, `${direct}.json`, path.join(direct, 'tsconfig.json')]) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
    }
    return null;
  }
  // By package name. `extends` honours the `exports` field since PR #50955
  // (TypeScript 5.0); createRequire performs the same resolution.
  const require = createRequire(path.join(fromDir, 'noop.js'));
  try {
    return require.resolve(spec);
  } catch {
    // No `exports`, or the subpath is not exposed: fall back to the package
    // root, which is what TypeScript did BEFORE PR #50955.
    try {
      const parts = spec.split('/');
      const pkg = spec.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
      const rest = spec.slice(pkg.length + 1);
      const pkgJson = require.resolve(`${pkg}/package.json`);
      const cand = path.join(path.dirname(pkgJson), rest || 'tsconfig.json');
      if (fs.existsSync(cand)) {
        notes.push(
          `${path.relative(CWD, fromFile)}: "${spec}" resolved by falling back to the package root. ` +
            'Check that the subpath is listed in `exports` (with its .json extension).',
        );
        return cand;
      }
    } catch {
      /* genuinely not found */
    }
    return null;
  }
}

/** Merges the extends chain the way TypeScript does: base first, child last. */
function resolveConfig(file, seen = new Set()) {
  const abs = path.resolve(file);
  if (seen.has(abs)) {
    problems.push(`Cycle in the extends chain at ${path.relative(CWD, abs)}.`);
    return { compilerOptions: {}, chain: [], broken: true };
  }
  seen.add(abs);
  const json = readJsonc(abs);
  let merged = { compilerOptions: {} };
  let chain = [];
  let broken = false;
  const parents = json.extends ? (Array.isArray(json.extends) ? json.extends : [json.extends]) : [];
  for (const spec of parents) {
    const target = resolveExtends(spec, abs);
    if (!target) {
      broken = true;
      const installed = fs.existsSync(path.join(CWD, 'node_modules'));
      problems.push(
        `${path.relative(CWD, abs)}: extends "${spec}" not found.` +
          (installed
            ? '\n      In a pnpm workspace the package must be a DIRECT dependency of the' +
              '\n      repository: pnpm isolates, it does not hoist transitive dependencies.'
            : '\n      node_modules/ is absent: run `pnpm install` first.') +
          '\n      DO NOT copy the base options into this file to silence the gate:' +
          '\n      that would be one more parallel literal table (E2), and the base would stop' +
          '\n      being the source. Fix the link, not the symptom.',
      );
      continue;
    }
    const parent = resolveConfig(target, new Set(seen));
    if (parent.broken) broken = true;
    merged = { compilerOptions: { ...merged.compilerOptions, ...parent.compilerOptions } };
    chain = [...chain, ...parent.chain, path.relative(CWD, target)];
  }
  return {
    compilerOptions: { ...merged.compilerOptions, ...(json.compilerOptions ?? {}) },
    chain,
    broken,
    own: json,
  };
}

// --------------------------------------------------------- `tsc --showConfig`
const require0 = createRequire(path.join(CWD, 'noop.js'));

function viaTsc(project) {
  try {
    require0.resolve('typescript/package.json');
  } catch {
    return null; // typescript not installed: the fallback will be used
  }
  try {
    const out = execFileSync(
      process.execPath,
      [require0.resolve('typescript/bin/tsc'), '-p', project, '--showConfig'],
      { cwd: CWD, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return parseJsonc(out);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------- checks
function checkOptions(label, opts) {
  for (const [name, spec] of Object.entries(LOCKS.locked)) {
    if (opts[name] !== spec.value) {
      problems.push(
        `${label}: ${name} = ${JSON.stringify(opts[name])}, locked to ${JSON.stringify(spec.value)}.` +
          `\n      ${spec.why}`,
      );
    }
  }
  for (const [name, why] of Object.entries(LOCKS.forbidden)) {
    if (name.startsWith('_')) continue;
    if (name in opts) problems.push(`${label}: ${name} is forbidden.\n      ${why}`);
  }
  for (const [name, rule] of Object.entries(LOCKS.forbiddenValues)) {
    if (!(name in opts)) continue;
    const v = opts[name];
    if (rule.not.some((bad) => String(bad).toLowerCase() === String(v).toLowerCase())) {
      problems.push(`${label}: ${name} = ${JSON.stringify(v)} is forbidden.\n      ${rule.why}`);
    }
  }
}

function checkScoped() {
  for (const [pattern, expected] of Object.entries(LOCKS.scoped)) {
    if (pattern.startsWith('_')) continue;
    let hits;
    try {
      hits = fs.globSync(pattern, { cwd: CWD });
    } catch {
      hits = [];
    }
    for (const h of hits) {
      const resolved = resolveConfig(path.join(CWD, h));
      if (resolved.broken) continue;
      for (const [name, want] of Object.entries(expected)) {
        if (resolved.compilerOptions[name] !== want) {
          problems.push(
            `${h}: ${name} = ${JSON.stringify(resolved.compilerOptions[name])}, ` +
              `expected ${JSON.stringify(want)}.`,
          );
        }
      }
    }
  }
}

/** The three base files carry no path. */
function checkBasesCarryNoPaths() {
  const spec = LOCKS.mustNotCarryPaths;
  let toolingDir = null;
  for (const cand of ['packages/tooling', 'node_modules/@arthome/tooling']) {
    if (fs.existsSync(path.join(CWD, cand, 'package.json'))) {
      toolingDir = path.join(CWD, cand);
      break;
    }
  }
  if (!toolingDir) {
    notes.push('@arthome/tooling not found: base-file check skipped.');
    return;
  }
  for (const rel of spec.files) {
    const abs = path.join(toolingDir, rel);
    if (!fs.existsSync(abs)) {
      problems.push(`@arthome/tooling/${rel} is missing.`);
      continue;
    }
    const json = readJsonc(abs);
    for (const key of spec.keys) {
      if (key in json) {
        problems.push(`@arthome/tooling/${rel} carries "${key}".\n      ${spec._why}`);
      }
    }
    for (const key of spec.compilerOptions) {
      if (json.compilerOptions && key in json.compilerOptions) {
        problems.push(
          `@arthome/tooling/${rel} carries compilerOptions.${key}.\n      ${spec._why}`,
        );
      }
    }
    // stableTypeOrdering: only in lib.json, the one file TypeScript 7 never reads.
    if (
      json.compilerOptions &&
      'stableTypeOrdering' in json.compilerOptions &&
      !rel.endsWith('lib.json')
    ) {
      problems.push(
        `@arthome/tooling/${rel} carries stableTypeOrdering. Under TypeScript 7 the ` +
          'deterministic ordering is always on and cannot be turned off, so this option must ' +
          'live only in lib.json — the one base file TypeScript 7 never reads.',
      );
    }
  }
}

function findProjects() {
  if (PROJECTS) return PROJECTS;
  const out = [];
  for (const pattern of [
    'tsconfig.json',
    'packages/*/tsconfig.json',
    'packages/*/tsconfig.build.json',
    'services/*/tsconfig.json',
    'tools/*/tsconfig.json',
  ]) {
    try {
      out.push(...fs.globSync(pattern, { cwd: CWD }));
    } catch {
      /* nothing */
    }
  }
  return [...new Set(out)];
}

// ------------------------------------------------------------------------ main
const projects = findProjects();
let mode = 'fallback (internal resolution)';

for (const p of projects) {
  const fromTsc = viaTsc(p);
  if (fromTsc) {
    mode = 'tsc --showConfig';
    checkOptions(p, fromTsc.compilerOptions ?? {});
    continue;
  }
  const resolved = resolveConfig(path.join(CWD, p));
  // Broken extends chain: DO NOT cascade into the lock checks. Reporting ten
  // missing options when the single cause is a missing link invites copying them
  // into the repository — which is committing the very fault the base exists to
  // prevent. One cause, one message.
  if (resolved.broken) {
    notes.push(`${p}: locks not checked — extends chain is broken (see below).`);
    continue;
  }
  checkOptions(p, resolved.compilerOptions);
}

checkScoped();
checkBasesCarryNoPaths();

if (!QUIET) {
  console.log(`arthome-check-tsconfig: ${projects.length} project(s) — mode ${mode}`);
  if (projects.length) console.log(`  ${projects.join(', ')}`);
}
for (const n of notes) console.log(`  - ${n}`);

if (!projects.length) {
  console.error('WARN no tsconfig.json found. GATE INACTIVE.');
  process.exit(0);
}

if (problems.length) {
  console.error(`\nFAIL ${problems.length} loosened lock(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    '\n  The lock table is @arthome/tooling/tsconfig-locks.json — one table, for all seven repositories.',
  );
  process.exit(1);
}
if (!QUIET) console.log('PASS tsconfig locks intact');
