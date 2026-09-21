#!/usr/bin/env node
// arthome-check-enums — the gate against E2, this project's dominant fault.
//
// E2: the PARALLEL LITERAL TABLE. Committed on eight fields by five mockups,
// despite an explicit written principle forbidding it. The lesson is that the
// principle is not enough — you need a gate. This is it.
//
// WHAT IT DOES
//   1. discovers, in the SOURCES of the declaring package, every exported
//      constant of the form `export const NAME = ['a', 'b'] as const`;
//   2. walks the repository's own sources;
//   3. reports every string literal belonging to one of those enumerations,
//      outside the module that declares it.
//
// ⚠ IT CARRIES NO LIST OF ENUMERATIONS, AND MUST NEVER CARRY ONE.
//   An early draft of the specification hardcoded the list (CHAT_MODES,
//   PUBLICATION_STATES, ...): that was one more parallel table — the list of
//   enumerations, copied next to the enumerations. A new enumeration is covered
//   the day it is declared, with nobody having to register it anywhere.
//
// ⚠ IT READS SOURCES, NOT THE BUILT PACKAGE. Importing @arthome/core would
//   require it to be compiled and installed; reading `src/**/*.ts` works from
//   day one — no build, no runtime, no module resolution. (The specification
//   said "imports from @arthome/core"; this is the one implementation
//   divergence, and it is in the direction of robustness.)
//
// See architecture/code-conventions.md section 5.3.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CWD = process.cwd();

// ---------------------------------------------------------------- arguments
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const QUIET = args.includes('--quiet');

// ------------------------------------------------- where the enumerations live
// Search order, most explicit first.
function findEnumSources() {
  const explicit = opt('source', process.env.ARTHOME_ENUM_SOURCE);
  const candidates = explicit
    ? [explicit]
    : [
        'packages/core/src',
        '../core/src',
        'node_modules/@arthome/core/src',
        'node_modules/@arthome/core/dist',
      ];
  for (const c of candidates) {
    const abs = path.resolve(CWD, c);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) return abs;
  }
  return null;
}

// --------------------------------------------------------------- reading files
function listFiles(root, patterns) {
  const out = new Set();
  for (const p of patterns) {
    let hits;
    try {
      hits = fs.globSync(p, { cwd: root });
    } catch {
      hits = [];
    }
    for (const h of hits) out.add(path.resolve(root, h));
  }
  return [...out].filter((f) => {
    try {
      return fs.statSync(f).isFile();
    } catch {
      return false;
    }
  });
}

// Blanks out line and block comments so a value quoted inside an explanation is
// not reported. Naive but sufficient: we are not trying to parse TypeScript.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(Math.max(0, m.length - p1.length)));
}

// ------------------------------------------------------ 1. discover the enums
// `export const NAME = [ ... ] as const`  —  NAME in SCREAMING_SNAKE_CASE.
const DECL = /export\s+const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+?)?=\s*\[([\s\S]*?)\]\s*as\s+const/g;
const STRING_LITERAL = /'([^'\\\r\n]*)'|"([^"\\\r\n]*)"/g;

function discoverEnums(sourceRoot) {
  const files = listFiles(sourceRoot, ['**/*.ts', '**/*.mts']).filter(
    (f) => !f.endsWith('.d.ts') && !/\.spec\.|\.test\./.test(f),
  );
  /** @type {Map<string, {constant: string, file: string}>} */
  const byValue = new Map();
  const constants = [];
  for (const file of files) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    for (const m of src.matchAll(DECL)) {
      const [, name, body] = m;
      const values = [];
      for (const v of body.matchAll(STRING_LITERAL)) {
        const value = v[1] ?? v[2];
        if (value) values.push(value);
      }
      if (!values.length) continue;
      constants.push({ name, file, values });
      for (const value of values) {
        if (!byValue.has(value)) byValue.set(value, { constant: name, file });
      }
    }
  }
  return { byValue, constants, declaringFiles: new Set(constants.map((c) => c.file)) };
}

// ------------------------------------------------------------ 2. the allow-list
function loadAllow() {
  const file = path.resolve(CWD, opt('allow', 'tools/enum-literals.allow.json'));
  if (!fs.existsSync(file)) return { entries: [], file };
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const entries = Array.isArray(raw) ? raw : (raw.allow ?? []);
  for (const e of entries) {
    if (!e.reason) {
      console.error(
        `FAIL ${path.relative(CWD, file)}: an entry has no "reason" (${JSON.stringify(e)}).`,
      );
      console.error('     Every exception states why, or it is not an exception — it is a hole.');
      process.exit(2);
    }
  }
  return { entries, file };
}

function isAllowed(entries, relFile, value) {
  return entries.some((e) => {
    const fileOk = !e.file || relFile === e.file || relFile.startsWith(e.file.replace(/\*+$/, ''));
    const valueOk = !e.value || e.value === value;
    return fileOk && valueOk;
  });
}

// --------------------------------------------------------------- 3. the sweep
const SCAN = [
  'src/**/*.ts',
  'src/**/*.tsx',
  'src/**/*.js',
  'src/**/*.jsx',
  'app/**/*.ts',
  'app/**/*.tsx',
  'packages/*/src/**/*.ts',
  'services/*/src/**/*.ts',
];
const SKIP = /(^|\/)(node_modules|dist|build|coverage|generated)(\/|$)|\.spec\.|\.test\.|\.d\.ts$/;

function main() {
  const sourceRoot = findEnumSources();
  if (!sourceRoot) {
    // @arthome/core does not exist yet. Say so LOUDLY rather than exiting 0 in
    // silence: a gate that always passes is not a gate.
    console.error('WARN arthome-check-enums: no enumeration source found.');
    console.error(
      '     Looked in: packages/core/src, ../core/src, node_modules/@arthome/core/{src,dist}',
    );
    console.error('     Point at one with --source <dir> or ARTHOME_ENUM_SOURCE.');
    console.error('     GATE INACTIVE until @arthome/core exists.');
    process.exit(0);
  }

  const { byValue, constants, declaringFiles } = discoverEnums(sourceRoot);
  if (!constants.length) {
    console.error(
      `WARN arthome-check-enums: no \`as const\` constant in ${path.relative(CWD, sourceRoot)}.`,
    );
    console.error("     GATE INACTIVE. Expected shape: export const NAME = ['a', 'b'] as const;");
    process.exit(0);
  }

  const { entries: allow, file: allowFile } = loadAllow();
  const files = listFiles(CWD, SCAN).filter((f) => !SKIP.test(f) && !declaringFiles.has(f));

  const findings = [];
  for (const file of files) {
    const rel = path.relative(CWD, file);
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    src.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(STRING_LITERAL)) {
        const value = m[1] ?? m[2];
        if (!value || !byValue.has(value)) continue;
        if (isAllowed(allow, rel, value)) continue;
        const owner = byValue.get(value);
        findings.push({
          file: rel,
          line: i + 1,
          value,
          constant: owner.constant,
          from: path.relative(CWD, owner.file),
        });
      }
    });
  }

  if (!QUIET) {
    console.log(
      `arthome-check-enums: ${constants.length} enumeration(s), ${byValue.size} value(s), ` +
        `${files.length} file(s) swept — source ${path.relative(CWD, sourceRoot) || '.'}`,
    );
  }

  if (findings.length) {
    console.error(`\nFAIL ${findings.length} parallel literal table(s) — E2:\n`);
    for (const f of findings) {
      console.error(`  ${f.file}:${f.line}  '${f.value}'`);
      console.error(
        `    -> belongs to ${f.constant} (${f.from}). Import the constant; do not copy the value.`,
      );
    }
    console.error(
      `\n  A legitimate exception? Register it in ${path.relative(CWD, allowFile)} WITH ITS REASON.`,
    );
    console.error('  That file stays short, or the rule is wrong: past twenty lines it is the');
    console.error('  sign that a value is missing from @arthome/core.');
    process.exit(1);
  }

  if (!QUIET) console.log('PASS no enumeration value copied');
}

main();
