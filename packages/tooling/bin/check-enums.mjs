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
// ⚠ ESCAPES BELONG INSIDE A LITERAL, and excluding them inverted this gate.
//
//   The old pattern refused any string containing a backslash. A description
//   carrying `\n` therefore matched NOTHING as a whole — so the scan fell
//   through to the quoted words INSIDE it, and reported a `"cancelled"` that is
//   plain English in a sentence about a state being absent.
//
//   An author then interpolated `DateOutcome.CANCELLED` into the prose to
//   silence it, making a description depend on a constant it is not describing,
//   for an emitted string that was identical either way. The gate manufactured
//   the very coupling it exists to prevent.
//
//   Matching the escape makes the whole description one literal, which is what
//   it is, and `byValue` never holds a sentence.
const STRING_LITERAL = /'((?:[^'\\\r\n]|\\.)*)'|"((?:[^"\\\r\n]|\\.)*)"/g;

// EVERY PUBLISHED PACKAGE DECLARES, not only @arthome/core.
//
//   This gate looked in one directory, and the narrowness had a cost the moment
//   @arthome/contracts started declaring vocabularies of its own: the payment
//   provider's state machine spells `paid` and `refunded`, so does core's
//   PAYOUT_STATES, and they are NOT the same vocabulary — the contract says so
//   itself, `source: none`, "theirs to change, ours to reflect". Unable to see
//   the contracts' declaration, the gate read every one of those members as a
//   copy of core's.
//
//   The remedy proposed from inside that state was fifteen allow-list entries,
//   which is past the allow file's own twenty-line warning — and that file says
//   plainly that passing it means the RULE is wrong, not the code.
//
//   `check-vocabulary` had exactly this fault and it was fixed there this
//   afternoon: its universe is now every published package. The same answer
//   belongs here. A package is published when it has a `src/` and is not
//   `private`.
function publishedSources(root) {
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
  for (const extra of publishedSources(CWD)) {
    if (!roots.some((r) => path.resolve(extra) === path.resolve(r))) roots.push(extra);
  }
  const files = roots
    .flatMap((r) => listFiles(r, ['**/*.ts', '**/*.mts']))
    .filter((f) => !f.endsWith('.d.ts') && !/\.spec\.|\.test\./.test(f));
  // ⚠ ALL declarers, not the first. Keeping only the first was a real defect: after
  //   the debranding collapsed twenty values onto existing ones, 25 of 179 values are
  //   declared by more than one vocabulary and `'none'` by FIVE. The gate then named
  //   whichever happened to be parsed first and stated it as fact — it told an author
  //   that `'full'` on the line `scope: 'full' | 'preview' | 'none'` belonged to
  //   PRICE_TIERS, and obeying that would have imported a price tier into a playback
  //   verdict.
  //
  //   A wrong reason attached to a correct verdict is worse than no reason: it teaches
  //   people to obey the verdict and skip the reasoning, which is how a gate stops
  //   being read. Where the gate cannot know, it now says it cannot know and lists the
  //   candidates — the author knows which they meant.
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

  const { byValue, constants, declaredByFile } = discoverEnums(sourceRoot);
  if (!constants.length) {
    console.error(
      `WARN arthome-check-enums: no \`as const\` constant in ${path.relative(CWD, sourceRoot)}.`,
    );
    console.error("     GATE INACTIVE. Expected shape: export const NAME = ['a', 'b'] as const;");
    process.exit(0);
  }

  const { entries: allow, file: allowFile } = loadAllow();

  // ⚠ SCAN EVERY FILE. IGNORE ONLY THE VALUES A FILE DECLARES.
  //
  //   The previous version excluded any file that declared a vocabulary from the
  //   sweep ENTIRELY — `!declaringFiles.has(f)`. So `entitlement/index.ts` had never
  //   been scanned since it was written, because it declared two vocabularies of its
  //   own. Moving those out for an unrelated reason made it visible for the first
  //   time, and three inline literals that had been there since the module existed
  //   appeared immediately.
  //
  //   The skip existed for a real reason — a file legitimately uses the members of
  //   the vocabulary it declares — but it was scoped by the FILE when the thing being
  //   excused is a VALUE. So it excused the legitimate use and hid everything else in
  //   the same file, which is precisely what this gate exists to catch.
  //
  //   That is D-045 applied to this gate: scope by a property of the thing you are
  //   looking for — a copied value — never by a property of where it sits. And it is
  //   the fault this gate taught everyone else to look for, committed inside it.
  const declined = listFiles(CWD, SCAN).filter((f) => SKIP.test(f));
  const files = listFiles(CWD, SCAN).filter((f) => !SKIP.test(f));

  const findings = [];
  for (const file of files) {
    const rel = path.relative(CWD, file);
    // The values this file declares itself. A declaring file may use its own members
    // freely; it may not copy anyone else's.
    //
    // ⚠ EXPORTED OR NOT. `export` is about VISIBILITY, not about authorship, and
    //   conflating them cost a whole afternoon's worth of false findings: the
    //   contract-local vocabularies in @arthome/contracts are declared
    //   `const TICKET_STATES = [...] as const` without `export`, because the
    //   documents name their source `none` and there is no identifier for a
    //   consumer to reach for. The gate saw no declaration and read every member
    //   as a copy of core's — `held`, `paid`, `refunded` against PAYOUT_STATES,
    //   which the contract itself says are the payment provider's words and not
    //   ours.
    //
    //   The authority list above stays EXPORTS ONLY: a published vocabulary is
    //   what another package can be wrong about. This exemption is narrower and
    //   local — what THIS file wrote down for itself, on the line above where it
    //   uses it.
    const own = new Set(declaredByFile.get(file) ?? []);
    for (const m of stripComments(fs.readFileSync(file, 'utf8')).matchAll(
      /(?:^|\n)\s*(?:export\s+)?const\s+[A-Z][A-Z0-9_]*\s*(?::[^=]+?)?=\s*\[([\s\S]*?)\]\s*as\s+const/g,
    )) {
      for (const v of m[1].matchAll(/'([^'\\\r\n]*)'|"([^"\\\r\n]*)"/g)) own.add(v[1] ?? v[2]);
    }
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    src.split('\n').forEach((line, i) => {
      // ⚠ SKIP THE TYPE ANNOTATION, KEEP THE INITIALISER.
      //
      //   `isolatedDeclarations` (this project's own rule, section 2.3 c) FORCES an
      //   explicit annotation on every exported schema, and an annotation of a zod
      //   enum necessarily restates its members:
      //
      //     export const LocaleIn: z.ZodEnum<{ fr: 'fr'; en: 'en' }> = z.enum(['fr', 'en']);
      //
      //   So one of this document's rules manufactures a literal that another of its
      //   gates then reports — and the author cannot remove it. Left alone it would
      //   need an allow-list entry per exported schema, and an allow file that grows
      //   with the codebase is the rule being wrong (section 5.3).
      //
      //   The distinction that resolves it: E2 is about copies that drift SILENTLY. A
      //   type annotation is checked against its own initialiser by the compiler, so
      //   it cannot drift without `tsc` failing — it is a derived restatement, not a
      //   parallel table. The initialiser is the real copy, and it stays reported:
      //   `z.enum(LOCALES)` is the fix, and the gate should still ask for it.
      //
      //   Heuristic, and its limit stated: a declaration's annotation precedes its
      //   first `=`, so only the part after it is scanned. `===` is unaffected (the
      //   remainder still holds the literal). This UNDER-reports in type positions
      //   only, which is the class the compiler already guards.
      const eq = line.indexOf('=');
      const scanned = eq === -1 ? line : line.slice(eq);
      for (const m of scanned.matchAll(STRING_LITERAL)) {
        const value = m[1] ?? m[2];
        if (!value || !byValue.has(value)) continue;
        // ⚠ A JSON SCHEMA KEYWORD'S VALUE IS NOT A DOMAIN VOCABULARY MEMBER, and
        //   it cannot be one: `format: 'email'` names a string format, not a
        //   notification channel, however exactly the two spellings match.
        //
        //   This was found the expensive way. A worker wrote
        //   `NavigationEntry.JOURNAL` for an EXPORT FORMAT because the gate
        //   refused the literal `'journal'`, and said so in its own report: "the
        //   same string but the wrong concept". A gate whose false positives
        //   make an author write something WORSE than the literal it refused has
        //   stopped paying for itself — and the author obeyed it, which is the
        //   part that should worry anyone.
        //
        //   Narrow by construction: only the keywords whose value space is JSON
        //   Schema's own, on the same line, immediately before the literal.
        if (
          /\b(?:format|pattern|contentEncoding|contentMediaType|\$ref|\$schema)\s*:\s*$/.test(
            scanned.slice(0, m.index),
          )
        ) {
          continue;
        }
        if (own.has(value)) continue; // declared here: its own to use
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
