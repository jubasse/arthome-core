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
// IT CARRIES NO LIST OF ENUMERATIONS, AND MUST NEVER CARRY ONE.
//   An early draft of the specification hardcoded the list (CHAT_MODES,
//   PUBLICATION_STATES, ...): that was one more parallel table — the list of
//   enumerations, copied next to the enumerations. A new enumeration is covered
//   the day it is declared, with nobody having to register it anywhere.
//
// IT READS SOURCES, NOT THE BUILT PACKAGE. Importing @arthome/core would
//   require it to be compiled and installed; reading `src/**/*.ts` works from
//   day one — no build, no runtime, no module resolution. (The specification
//   said "imports from @arthome/core"; this is the one implementation
//   divergence, and it is in the direction of robustness.)
//
// See architecture/code-conventions.md section 5.3.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { workspaceGlobs, workspacePackageDirs } from '../lib/workspace.mjs';

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
        // A WORKSPACE PUTS IT SOMEWHERE ELSE, and this gate matters most in exactly
        //   those repositories. pnpm installs a dependency under the node_modules of
        //   the PACKAGE that declares it, so in arthome-platform @arthome/core sits in
        //   `libs/config/node_modules/…`. Without these candidates the gate printed
        //   "GATE INACTIVE" in the one repository where seven services reach for the
        //   same domain words — caught the same hour only because it says so out loud
        //   rather than passing quietly (D-071).
        ...workspacePackageDirs(CWD).flatMap((dir) => [
          path.join(dir, 'node_modules/@arthome/core/src'),
          path.join(dir, 'node_modules/@arthome/core/dist'),
        ]),
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
// ESCAPES BELONG INSIDE A LITERAL, and excluding them inverted this gate. The old
//   pattern refused any string containing a backslash, so a description carrying `\n`
//   matched nothing as a whole and the scan fell through to the words INSIDE it —
//   reporting a `"cancelled"` that was plain English. An author silenced it by
//   interpolating `DateOutcome.CANCELLED` into the prose, making a description depend
//   on a constant it does not describe: the gate manufactured the very coupling it
//   exists to prevent. Matching the escape makes the description one literal, which is
//   what it is, and `byValue` never holds a sentence.
const STRING_LITERAL = /'((?:[^'\\\r\n]|\\.)*)'|"((?:[^"\\\r\n]|\\.)*)"/g;

// EVERY PUBLISHED PACKAGE DECLARES, not only @arthome/core. Looking in one
//   directory cost the moment @arthome/contracts declared vocabularies of its own:
//   the payment provider spells `paid` and `refunded` and so does core's
//   PAYOUT_STATES, but they are NOT the same vocabulary — the contract says so,
//   `source: none`, "theirs to change, ours to reflect". Blind to the contracts'
//   declaration, the gate read every member as a copy of core's, and the remedy
//   proposed from inside that state was fifteen allow-list entries — past the allow
//   file's own twenty-line warning, which says that means the RULE is wrong.
//   `check-vocabulary` had the same fault and the same answer.
//
// Published = has a `src/` and is not `private`.
function publishedPackageSourceDirs(root) {
  const out = [];
  const packages = path.resolve(root, 'packages');
  if (!fs.existsSync(packages)) return out;
  for (const name of fs.readdirSync(packages)) {
    const manifest = path.join(packages, name, 'package.json');
    const src = path.join(packages, name, 'src');
    if (!fs.existsSync(manifest) || !fs.existsSync(src)) continue;
    try {
      if (JSON.parse(fs.readFileSync(manifest, 'utf8')).private === true) continue;
    } catch {
      continue;
    }
    out.push(src);
  }
  return out;
}

function discoverEnums(sourceRoot) {
  const roots = [sourceRoot];
  for (const extra of publishedPackageSourceDirs(CWD)) {
    if (!roots.some((r) => path.resolve(extra) === path.resolve(r))) roots.push(extra);
  }
  const files = roots
    .flatMap((r) => listFiles(r, ['**/*.ts', '**/*.mts']))
    .filter((f) => !f.endsWith('.d.ts') && !/\.spec\.|\.test\./.test(f));
  // ALL declarers, not the first. 25 of 179 values are declared by more than one
  //   vocabulary and `'none'` by FIVE, so naming whichever parsed first stated a guess
  //   as fact: it told an author that `'full'` in `scope: 'full' | 'preview' | 'none'`
  //   belonged to PRICE_TIERS, and obeying that would have imported a price tier into a
  //   playback verdict. A wrong reason on a correct verdict is worse than no reason —
  //   it teaches people to obey and skip the reasoning. Where the gate cannot know it
  //   now says so and lists the candidates.
  /** @type {Map<string, {constant: string, file: string}[]>} */
  const byValue = new Map();
  /** Per file, the values THAT file declares — not the files to skip. @type {Map<string, Set<string>>} */
  const declaredByFile = new Map();
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
      const own = declaredByFile.get(file) ?? new Set();
      for (const value of values) own.add(value);
      declaredByFile.set(file, own);
      for (const value of values) {
        const declarers = byValue.get(value) ?? [];
        if (!declarers.some((d) => d.constant === name)) declarers.push({ constant: name, file });
        byValue.set(value, declarers);
      }
    }
  }
  return { byValue, constants, declaredByFile };
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
  ...workspaceGlobs(CWD, 'src/**/*.ts'),
  ...workspaceGlobs(CWD, 'src/**/*.tsx'),
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

  const { byValue, constants, declaredByFile } = discoverEnums(sourceRoot);
  if (!constants.length) {
    console.error(
      `WARN arthome-check-enums: no \`as const\` constant in ${path.relative(CWD, sourceRoot)}.`,
    );
    console.error("     GATE INACTIVE. Expected shape: export const NAME = ['a', 'b'] as const;");
    process.exit(0);
  }

  const { entries: allow, file: allowFile } = loadAllow();

  // SCAN EVERY FILE. IGNORE ONLY THE VALUES A FILE DECLARES. The previous version
  //   excluded a declaring file from the sweep ENTIRELY, so `entitlement/index.ts` had
  //   never been scanned since it was written; moving its vocabularies out for an
  //   unrelated reason exposed three inline literals that had been there all along.
  //   The skip had a real reason — a file may use the members it declares — but it was
  //   scoped by the FILE when the thing excused is a VALUE.
  //
  //   That is D-045 applied here: scope by a property of the thing you are looking for,
  //   never by where it sits. It is the fault this gate taught everyone to look for,
  //   committed inside it.
  const declined = listFiles(CWD, SCAN).filter((f) => SKIP.test(f));
  const files = listFiles(CWD, SCAN).filter((f) => !SKIP.test(f));

  const findings = [];
  for (const file of files) {
    const rel = path.relative(CWD, file);
    // EXPORTED OR NOT: `export` is VISIBILITY, not authorship. @arthome/contracts
    //   declares local vocabularies unexported, and reading them as copies cost an
    //   afternoon of false findings. The authority list above stays EXPORTS ONLY —
    //   a published vocabulary is what another package can be wrong about.
    const declaredHere = new Set(declaredByFile.get(file) ?? []);
    for (const m of stripComments(fs.readFileSync(file, 'utf8')).matchAll(
      /(?:^|\n)\s*(?:export\s+)?const\s+[A-Z][A-Z0-9_]*\s*(?::[^=]+?)?=\s*\[([\s\S]*?)\]\s*as\s+const/g,
    )) {
      for (const v of m[1].matchAll(/'([^'\\\r\n]*)'|"([^"\\\r\n]*)"/g))
        declaredHere.add(v[1] ?? v[2]);
    }
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    src.split('\n').forEach((line, i) => {
      // SKIP THE TYPE ANNOTATION, KEEP THE INITIALISER. `isolatedDeclarations`
      //   (§2.3 c) forces an annotation that necessarily restates a zod enum's members,
      //   so one rule manufactures the literal another reports and the author cannot
      //   remove it. The compiler checks an annotation against its own initialiser, so
      //   it cannot drift silently — it is a derived restatement, not a parallel table.
      //   Limit, stated: only the part after the first `=` is scanned, so this
      //   UNDER-reports in type positions, the class the compiler already guards.
      const eq = line.indexOf('=');
      const scanned = eq === -1 ? line : line.slice(eq);
      for (const m of scanned.matchAll(STRING_LITERAL)) {
        const value = m[1] ?? m[2];
        if (!value || !byValue.has(value)) continue;
        // A JSON SCHEMA KEYWORD'S VALUE IS NOT A DOMAIN VOCABULARY MEMBER:
        //   `format: 'email'` names a string format, not a notification channel. Found
        //   the expensive way — refused `'journal'`, so an author wrote
        //   `NavigationEntry.JOURNAL` for an EXPORT FORMAT and obeyed the gate into
        //   something worse than what it refused. Narrow by construction: only keywords
        //   whose value space is JSON Schema's own, immediately before the literal.
        if (
          /\b(?:format|pattern|contentEncoding|contentMediaType|\$ref|\$schema)\s*:\s*$/.test(
            scanned.slice(0, m.index),
          )
        ) {
          continue;
        }
        if (declaredHere.has(value)) continue;
        if (isAllowed(allow, rel, value)) continue;
        const declarers = byValue.get(value);
        findings.push({
          file: rel,
          line: i + 1,
          value,
          declarers: declarers.map((d) => ({
            constant: d.constant,
            from: path.relative(CWD, d.file),
          })),
        });
      }
    });
  }

  if (!QUIET) {
    console.log(
      `arthome-check-enums: ${constants.length} enumeration(s), ${byValue.size} value(s), ` +
        `${files.length} file(s) swept, ${declined.length} declined by pattern ` +
        `— source ${path.relative(CWD, sourceRoot) || '.'}`,
    );
  }

  if (findings.length) {
    console.error(`\nFAIL ${findings.length} parallel literal table(s) — E2:\n`);
    for (const f of findings) {
      console.error(`  ${f.file}:${f.line}  '${f.value}'`);
      if (f.declarers.length === 1) {
        const [d] = f.declarers;
        console.error(
          `    -> declared by ${d.constant} (${d.from}). Import the constant; do not copy the value.`,
        );
      } else {
        // The gate knows the value is declared; it does NOT know which vocabulary was
        // meant here, and saying so is the whole point.
        console.error(
          `    -> declared by ${f.declarers.length} vocabularies: ` +
            f.declarers.map((d) => `${d.constant} (${d.from})`).join(', '),
        );
        console.error(
          '       This gate cannot tell which one you meant. Import the one you did mean —',
        );
        console.error(
          '       or, if the value belongs to neither, declare the vocabulary that owns it.',
        );
      }
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
