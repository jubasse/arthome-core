#!/usr/bin/env node
// arthome-check-core-entry — the gate on @arthome/core's TWO ENTRY POINTS.
//
// WHAT IT GUARANTEES
//   @arthome/core's `.` entry point imports zod AT NO DEPTH.
//
// WHAT IT DOES NOT COVER, STATED BECAUSE THE NAME IMPLIES MORE THAN THE
// MECHANISM DELIVERS
//   It walks the IMPORT GRAPH. A dependency that arrives any other way is
//   invisible to it, and one such route was live in this repository: the root
//   tsconfig carried `types: ["node"]` against an @types/node that was never
//   installed, and that project includes `packages/*/src`. Had it resolved, a
//   Node global would have been in scope throughout @arthome/core — and this
//   gate would have stayed green, because A GLOBAL IS NOT AN IMPORT.
//
//   So: ambient types, `types` and `typeRoots`, triple-slash directives and
//   globals injected by a tsconfig are all OUT OF SCOPE here. They belong to
//   whoever owns the tsconfig, and the thing that catches them is `types: []`
//   on the shared base rather than this tool.
//
//   A gate's guarantee is only as wide as its mechanism, and a gate that does
//   not say where its mechanism stops will be read as covering the whole of
//   what its name suggests.
//
// WHY THIS IS A GATE AND NOT A CONVENTION
//   zod's cost is FIXED and tied to the import, not marginal and tied to the
//   number of schemas: two agents measured it independently and converge to
//   within 1 KB — 93 KB gzipped for a single `z.string()` on the classic entry
//   point, 7.5 KB on tree-shaken `zod/mini` (D-012). So a single `import { z }`
//   added deep inside a rules module is enough to hand the whole bill to TV and
//   mobile, WITH NOTHING REPORTING IT: the code compiles, the tests pass, and
//   the bundle grows by 93 KB.
//
//   That is exactly the profile of a fault a principle does not catch.
//
// HOW
//   Walk the import graph from src/index.ts, over the SOURCES. No build, no
//   node_modules, no module resolution: the same choice as arthome-check-enums,
//   and for the same reason — the gate must work from day one.
//
// See architecture/core-port-plan.md section 2.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CWD = process.cwd();
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const QUIET = args.includes('--quiet');

const CORE_SRC = path.resolve(CWD, opt('core', 'packages/core/src'));
const ENTRY = path.join(CORE_SRC, 'index.ts');
const SCHEMA_ENTRY = path.join(CORE_SRC, 'schema', 'index.ts');

// What must never be reachable from the `.` entry point.
const FORBIDDEN = [
  {
    test: (s) => s === 'zod' || s.startsWith('zod/'),
    why: 'zod — fixed cost of 93 KB gzipped (D-012)',
  },
  {
    test: (s) => s.startsWith('node:'),
    why: 'Node API — the package must run under Metro and in a browser',
  },
];

const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function specifiersOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const m of src.matchAll(IMPORT_RE)) out.push(m[1]);
  for (const m of src.matchAll(DYNAMIC_RE)) out.push(m[1]);
  return out;
}

function resolveRelative(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  // nodenext: relative imports carry `.js`, the sources are `.ts`.
  const candidates = [base.replace(/\.js$/, '.ts'), `${base}.ts`, path.join(base, 'index.ts')];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
}

function walk(entry) {
  if (!fs.existsSync(entry)) return { visited: new Set(), findings: [], missing: entry };
  const visited = new Set();
  const findings = [];
  const queue = [{ file: entry, from: [] }];
  while (queue.length) {
    const { file, from } = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    for (const spec of specifiersOf(file)) {
      if (spec.startsWith('.')) {
        const next = resolveRelative(file, spec);
        if (next) queue.push({ file: next, from: [...from, file] });
        continue;
      }
      const hit = FORBIDDEN.find((f) => f.test(spec));
      if (hit) findings.push({ file, spec, why: hit.why, chain: [...from, file] });
    }
  }
  return { visited, findings, missing: null };
}

function rel(p) {
  return path.relative(CWD, p);
}

function main() {
  const entry = walk(ENTRY);
  if (entry.missing) {
    console.error(`⚠ arthome-check-core-entry: ${rel(ENTRY)} not found.`);
    console.error('  GATE INACTIVE until @arthome/core has its main entry point.');
    process.exit(0);
  }

  if (!QUIET) {
    console.log(
      `arthome-check-core-entry: ${entry.visited.size} module(s) reachable from the "." entry point`,
    );
  }

  if (entry.findings.length) {
    console.error(
      `\n✗ @arthome/core's "." entry point reaches ${entry.findings.length} forbidden import(s):\n`,
    );
    for (const f of entry.findings) {
      console.error(`  ${rel(f.file)}  →  '${f.spec}'`);
      console.error(`    ${f.why}`);
      if (f.chain.length > 1) {
        console.error(`    path: ${f.chain.map(rel).join('\n          → ')}`);
      }
    }
    console.error('\n  A boundary schema lives in src/schema/, never inside a rule.');
    process.exit(1);
  }

  // The ./schema entry point, on the other hand, MUST depend on zod — otherwise
  // it has no purpose.
  if (fs.existsSync(SCHEMA_ENTRY)) {
    const schema = walk(SCHEMA_ENTRY);
    const usesZod = schema.visited.size
      ? [...schema.visited].some((f) =>
          specifiersOf(f).some((s) => s === 'zod' || s.startsWith('zod/')),
        )
      : false;
    if (!usesZod) {
      console.error('\n✗ the "./schema" entry point does not import zod.');
      console.error('  A schema entry point with no schemas has no purpose: either it carries zod');
      console.error('  schemas, or it must not exist.');
      process.exit(1);
    }
    if (!QUIET)
      console.log(
        `arthome-check-core-entry: "./schema" entry point — ${schema.visited.size} module(s), zod present`,
      );
  } else if (!QUIET) {
    console.log('arthome-check-core-entry: "./schema" entry point not written yet (wave 6)');
  }

  if (!QUIET) {
    // The verdict says what was WALKED, not what is true of the package. A
    // global injected by a tsconfig never appears in an import graph, so this
    // line would read the same with one in scope — see the header.
    console.log('✓ no import path from the "." entry point reaches zod or a Node API');
    console.log(
      '  (scope: the import graph only — ambient types and tsconfig `types` are not walked)',
    );
  }
}

main();
