#!/usr/bin/env node
// arthome-check-versions — the seven repositories do not drift in silence.
//
// There is no pnpm catalog across the seven repositories: that is the limit of
// the multi-repository layout, and it is accepted. The substitute is a gate, not
// a hope. The table of expected versions lives in versions.json — ONE table, not
// seven. Seven autonomous package.json files would be seven parallel literal
// tables under a common name: fault E2, applied to versions.
//
// What it checks:
//   1. the versions DECLARED in the repository's package.json files;
//   2. the versions RESOLVED in node_modules, when it exists;
//   3. the absence of forbidden packages (eslint-plugin-prettier & co.);
//   4. the Node version actually running.
//
// See architecture/code-conventions.md sections 7.1 and 7.4.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { workspaceGlobs } from '../lib/workspace.mjs';

const CWD = process.cwd();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TABLE = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'versions.json'), 'utf8'));

const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const repoArg = args.indexOf('--repo');
const REPO = repoArg !== -1 && args[repoArg + 1] ? args[repoArg + 1] : path.basename(CWD);

const problems = [];
const notes = [];

// ------------------------------------------------------------ minimal semver
// Enough to compare an exact version and a floor. No dependency.
function parse(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v).replace(/^[\^~>=v ]+/, ''));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function cmp(a, b) {
  const x = parse(a);
  const y = parse(b);
  if (!x || !y) return null;
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}
/** Is this specifier an exact pin of `want`? */
function isExact(spec, want) {
  return String(spec).trim() === String(want).trim();
}
/** Does `version` satisfy a union of ranges `^a || ^b || >=c`? (safe approximation) */
function satisfiesRange(version, range) {
  const v = parse(version);
  if (!v) return false;
  return String(range)
    .split('||')
    .some((part) => {
      const p = part.trim();
      const t = parse(p);
      if (!t) return false;
      if (p.startsWith('^')) return v[0] === t[0] && cmp(version, p) >= 0;
      if (p.startsWith('>=')) return cmp(version, p) >= 0;
      if (p.startsWith('~')) return v[0] === t[0] && v[1] === t[1] && cmp(version, p) >= 0;
      return cmp(version, p) === 0;
    });
}

// ------------------------------------------------------ what the repo declares
function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function manifests() {
  const out = [];
  const root = readJson(path.join(CWD, 'package.json'));
  if (root) out.push({ file: 'package.json', json: root });
  // The layouts used to be guessed here — `packages/*`, `services/*`, `apps/*` —
  // and each gate guessed a DIFFERENT subset, so a repository using `libs/*`
  // was scanned by some and silently skipped by others. The workspace file is
  // the declaration pnpm itself obeys.
  for (const pattern of workspaceGlobs(CWD, 'package.json')) {
    let hits;
    try {
      hits = fs.globSync(pattern, { cwd: CWD });
    } catch {
      hits = [];
    }
    for (const h of hits) {
      const j = readJson(path.join(CWD, h));
      if (j) out.push({ file: h, json: j });
    }
  }
  return out;
}

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

function declaredSpecs(all, name) {
  const found = [];
  for (const { file, json } of all) {
    for (const field of DEP_FIELDS) {
      const spec = json[field]?.[name];
      if (spec) found.push({ file, field, spec });
    }
  }
  return found;
}

/** The version expected for THIS repository, named exceptions included. */
function expectedFor(entry) {
  if (entry.exceptions && Object.prototype.hasOwnProperty.call(entry.exceptions, REPO)) {
    return { version: entry.exceptions[REPO], exception: true };
  }
  return { version: entry.version, exception: false };
}

// ---------------------------------------------------------------------- checks
function checkRegime(regime, label) {
  for (const [name, entry] of Object.entries(TABLE[regime])) {
    if (name.startsWith('_')) continue;
    if (entry.scope && !entry.scope.includes(REPO)) continue;

    const { version: want, exception } = expectedFor(entry);
    const declared = declaredSpecs(ALL, name);
    if (!declared.length) continue; // this repository does not use it: nothing to say

    for (const d of declared) {
      // A peerDependency expresses a range: we do not ask it to be an exact pin,
      // only to cover the expected version.
      if (d.field === 'peerDependencies') {
        if (!satisfiesRange(want, d.spec)) {
          problems.push(
            `${d.file} -> peerDependencies.${name} = "${d.spec}" does not cover ${want} (regime ${label}).`,
          );
        }
        continue;
      }
      if (!isExact(d.spec, want)) {
        problems.push(
          `${d.file} -> ${d.field}.${name} = "${d.spec}", expected "${want}" ` +
            `(regime ${label}${exception ? `, named exception for ${REPO}` : ''}).` +
            (entry.why ? `\n      ${entry.why}` : ''),
        );
      }
    }

    // What is actually installed, if node_modules exists.
    const installed = readJson(path.join(CWD, 'node_modules', name, 'package.json'));
    if (installed && cmp(installed.version, want) !== 0) {
      problems.push(
        `node_modules/${name} resolves to ${installed.version}, expected ${want}. ` +
          `Run \`pnpm install\`, then \`pnpm why ${name}\`.`,
      );
    }
  }
}

function checkForbidden() {
  for (const [name, why] of Object.entries(TABLE.forbidden)) {
    if (name.startsWith('_')) continue;
    for (const d of declaredSpecs(ALL, name)) {
      problems.push(`${d.file} -> ${d.field}.${name} is FORBIDDEN.\n      ${why}`);
    }
    if (fs.existsSync(path.join(CWD, 'node_modules', name, 'package.json'))) {
      notes.push(
        `${name} is present in node_modules without being declared: transitive dependency of a ` +
          `preset. Tolerated, but check it with \`pnpm why ${name}\`.`,
      );
    }
  }
}

function checkNode() {
  const { range, preferred, why } = TABLE.runtime.node;
  const current = process.versions.node;
  if (!satisfiesRange(current, range)) {
    problems.push(`Node ${current} is outside the required range ${range}.\n      ${why}`);
  } else if (cmp(current, preferred) !== 0) {
    notes.push(`Node ${current} satisfies ${range} (preferred: ${preferred}).`);
  }
  const nvmrc = path.join(CWD, '.nvmrc');
  if (fs.existsSync(nvmrc)) {
    const pinned = fs.readFileSync(nvmrc, 'utf8').trim();
    if (parse(pinned) && !satisfiesRange(pinned, range)) {
      problems.push(`.nvmrc pins ${pinned}, outside ${range}.`);
    }
  }
}

function checkPackageManager() {
  const root = ALL.find((m) => m.file === 'package.json');
  const pm = root?.json?.packageManager;
  if (!pm) {
    notes.push(
      'package.json has no "packageManager" field: Corepack no longer guarantees the pnpm version.',
    );
    return;
  }
  const m = /^pnpm@(.+)$/.exec(pm);
  if (!m) {
    problems.push(`packageManager = "${pm}": the package manager is pnpm.`);
    return;
  }
  if (!satisfiesRange(m[1], TABLE.runtime.pnpm.range)) {
    problems.push(`packageManager = "${pm}", expected pnpm ${TABLE.runtime.pnpm.range}.`);
  }
}

/**
 * One copy, one version.
 *
 * This check exists because the design failed here once, on the day of the first
 * install: `@arthome/tooling` declared `eslint` as a peer without pinning it in
 * its own devDependencies, so pnpm auto-installed a peer for the workspace
 * package and picked the LOWEST member of the range — 9.39.5, while the root had
 * 10.11.0. Two ESLint copies, both working, differently. Nothing was red.
 *
 * That is precisely the failure mode the dependencies/peerDependencies split
 * exists to prevent, and no gate saw it. This one does: it reads the pnpm store
 * directly, because the store is where duplication is visible and package.json
 * is where it is invisible.
 */
/**
 * The second copies this repository has declared harmless, with their reason.
 *
 * ⚠ SCOPED TO ONE REPOSITORY ON PURPOSE. The same duplicate may be benign where
 *   a generator runs and a genuine fault where it does not, so an entry names
 *   the repository it applies to. `versions.json` holds the reasons.
 */
function allowedDuplicates(name) {
  const declared = TABLE.duplicatesAllowed?.[name];
  if (!Array.isArray(declared)) return [];
  return declared.filter((d) => d.repo === REPO);
}

const granted = [];

function checkSingleCopy() {
  const store = path.join(CWD, 'node_modules', '.pnpm');
  if (!fs.existsSync(store)) return;

  // Only the packages that must exist once: the binaries the repository runs.
  const singletons = ['eslint', 'prettier', 'typescript', 'zod', 'vitest'];
  let dirs;
  try {
    dirs = fs.readdirSync(store);
  } catch {
    return;
  }

  for (const name of singletons) {
    // Store directory names are `<name>@<version>[_peersuffix]`, with `/` in a
    // scoped name written as `+`.
    const prefix = `${name.replace('/', '+')}@`;
    const versions = new Set();
    for (const d of dirs) {
      if (!d.startsWith(prefix)) continue;
      const rest = d.slice(prefix.length);
      const v = /^(\d+\.\d+\.\d+[^_]*)/.exec(rest)?.[1];
      if (v) versions.add(v);
    }
    // A declared exception is removed from the count and printed, never hidden.
    for (const allowed of allowedDuplicates(name)) {
      if (versions.delete(allowed.version)) {
        granted.push(`${name}@${allowed.version} via ${allowed.broughtBy}`);
      }
    }

    if (versions.size > 1) {
      problems.push(
        `${name} is installed in ${versions.size} versions: ${[...versions].sort().join(', ')}.\n` +
          `      Run \`pnpm why ${name}\` to find who pulls the second one.\n` +
          '      Two copies of a tool means the plugin loaded by one is not the one the other\n' +
          '      sees: both work, differently, and the diagnosis is long. A package that\n' +
          '      declares a peer must also pin it in its own devDependencies, or pnpm\n' +
          '      auto-installs the LOWEST member of the range.',
      );
    }
  }
}

/**
 * Supply-chain policy: a version bump pins a version that is ALREADY MATURE,
 * never the day's. The first `pnpm install` proved the point — five packages
 * were pinned at their publication-day version and refused by minimumReleaseAge.
 * Every temporary exception must carry a removal date, or it is a lowered
 * threshold that does not say its name.
 */
function checkReleaseAgeExceptions() {
  const ws = path.join(CWD, 'pnpm-workspace.yaml');
  if (!fs.existsSync(ws)) return;
  const text = fs.readFileSync(ws, 'utf8');
  const block = /minimumReleaseAgeExclude:\s*\n([\s\S]*?)(?=\n[a-zA-Z]|\n*$)/.exec(text);
  if (!block) return;

  const today = new Date().toISOString().slice(0, 10);
  // ⚠ Both quote styles. Prettier normalises YAML strings to double quotes here
  //   (our own `singleQuote: false` override for *.yml), so a regex that only
  //   knew single quotes captured `"@arthome/*"` WITH its quote and stopped
  //   recognising it as ours. Found by the count going from 4 to 5 after a
  //   `prettier --write`.
  const entries = [...block[1].matchAll(/^\s*-\s*["']?([^"'#\s]+)["']?/gm)].map((m) => m[1]);
  const temporary = entries.filter((e) => !e.startsWith('@arthome/'));
  if (!temporary.length) return;

  // The removal date is read from an explicit marker, never from prose: a date
  // mentioned in an explanation is not a commitment, and picking "the last date
  // in the block" would silently key the check off a publication date.
  //   remove-after: YYYY-MM-DD
  const marks = [...block[1].matchAll(/remove-after:\s*(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);

  if (!marks.length) {
    problems.push(
      `pnpm-workspace.yaml: ${temporary.length} minimumReleaseAge exception(s) with no ` +
        '`remove-after: YYYY-MM-DD` marker.\n' +
        '      Every temporary exception carries a removal date, or it is a lowered threshold\n' +
        '      that does not say its name.',
    );
    return;
  }

  const overdue = marks.filter((d) => d < today).sort();
  if (overdue.length) {
    problems.push(
      'pnpm-workspace.yaml: minimumReleaseAge exception(s) past their removal date ' +
        `(${overdue.join(', ')}; today is ${today}).\n` +
        `      Remove ${temporary.join(', ')} from minimumReleaseAgeExclude and re-run \`pnpm install\`.\n` +
        '      The durable remedy is not to add exceptions: a version bump pins a version that is\n' +
        "      ALREADY MATURE, never the day's (code-conventions.md 7.6).",
    );
    return;
  }

  notes.push(
    `${temporary.length} temporary minimumReleaseAge exception(s), to be removed after ` +
      `${marks.sort().at(-1)}.`,
  );
}

// ------------------------------------------------------------------------ main
const ALL = manifests();
if (!ALL.length) {
  console.error(`FAIL arthome-check-versions: no package.json found from ${CWD}`);
  process.exit(2);
}

checkRegime('A', 'A — contract');
checkRegime('B', 'B — tooling');
checkForbidden();
checkNode();
checkPackageManager();
checkSingleCopy();
checkReleaseAgeExceptions();

if (!QUIET) {
  console.log(
    `arthome-check-versions: repository ${REPO}, ${ALL.length} manifest(s), ` +
      `table verified on ${TABLE.verifiedOn}`,
  );
}
for (const n of notes) console.log(`  - ${n}`);
// Printed on EVERY run, pass or fail. An exception nobody sees is a lowered
// threshold that does not say its name — the same reason the emit gate lists
// its nine granted equivalences each time it runs.
for (const g of granted) console.log(`  - second copy allowed: ${g} (versions.json)`);

if (problems.length) {
  console.error(`\nFAIL ${problems.length} version discrepancy(ies):\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    '\n  The reference table is @arthome/tooling/versions.json — one table, for all seven repositories.',
  );
  console.error('  If the table has aged, fix it THERE (code-conventions.md 7.5), never in one');
  console.error("  repository's package.json.");
  process.exit(1);
}
if (!QUIET) console.log('PASS versions aligned');
