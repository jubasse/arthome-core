#!/usr/bin/env node
// arthome-check-prettier-conflict — the ESLint/Prettier overlap is empty.
//
// THE central gate of this setup. It does not check an opinion: it ENUMERATES
// the still-enabled ESLint rules that conflict with Prettier. It must return an
// empty list, in every repository.
//
// Why a wrapper rather than `npx eslint-config-prettier <file>` as the
// specification first said:
//
//   1. eslint-config-prettier is a dependency of @arthome/tooling, not of the
//      repository — by design (section 4.2). So its binary is NOT on the
//      repository's path, and `pnpm exec eslint-config-prettier` fails with
//      "Command not found". Found by running it.
//   2. ESLint 10 looks its configuration up FROM THE LINTED FILE'S DIRECTORY
//      upward. In a workspace, a root file and a package file therefore do not
//      necessarily resolve to the same configuration, so the gate must pass ONE
//      FILE PER CONFIGURATION FAMILY — which the upstream CLI cannot do in a
//      single call. Section 3.5.
//
// The upstream CLI resolves `eslint` from process.cwd(), so the ESLint that
// runs is the repository's own — which is what we want.
//
// See architecture/code-conventions.md section 3.5.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const CWD = process.cwd();
const require0 = createRequire(import.meta.url);

const args = process.argv.slice(2).filter((a) => a !== '--quiet');
const QUIET = process.argv.includes('--quiet');

// Default probes: one per plausible configuration family. Only those that exist
// are used. A repository with an unusual layout passes its own list.
const DEFAULT_PROBES = [
  'eslint.config.js',
  'src/index.ts',
  'src/App.tsx',
  'src/main.ts',
  'src/app/app.ts',
  'packages/core/src/index.ts',
  'packages/contracts/src/index.ts',
  'packages/tooling/eslint/base.js',
  'services/identity/src/main.ts',
  'app/page.tsx',
];

const probes = (args.length ? args : DEFAULT_PROBES).filter((p) =>
  fs.existsSync(path.resolve(CWD, p)),
);

if (!probes.length) {
  // A gate that checks nothing must say so, loudly. Exiting 0 here would make
  // this the most dangerous file in the repository: a green light meaning nothing.
  console.error('FAIL arthome-check-prettier-conflict: no probe file found.');
  console.error(`     Tried: ${(args.length ? args : DEFAULT_PROBES).join(', ')}`);
  console.error('     Pass one file per configuration family as arguments.');
  process.exit(2);
}

// ⚠ Resolve through `package.json`, not through `eslint-config-prettier/bin/cli.js`.
//   That package has an `exports` map listing ".", "./flat", "./prettier" and
//   "./package.json" — and nothing else. A deep path into `bin/` is therefore
//   BLOCKED by the exports map, exactly as our own section 4.4.4 says it should
//   be. `./package.json` is exported, so we resolve that and walk from its
//   directory.
let cli;
try {
  cli = path.join(
    path.dirname(require0.resolve('eslint-config-prettier/package.json')),
    'bin',
    'cli.js',
  );
  if (!fs.existsSync(cli)) throw new Error('cli.js not found');
} catch {
  console.error('FAIL eslint-config-prettier is not resolvable from @arthome/tooling.');
  console.error('     Run `pnpm install`.');
  process.exit(2);
}

const failures = [];
for (const probe of probes) {
  try {
    const out = execFileSync(process.execPath, [cli, probe], {
      cwd: CWD,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (!QUIET) console.log(`  ok  ${probe}`);
    if (/conflict/i.test(out) && !/No rules/i.test(out)) failures.push({ probe, out });
  } catch (e) {
    failures.push({ probe, out: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() || String(e) });
  }
}

if (!QUIET) {
  console.log(`arthome-check-prettier-conflict: ${probes.length} probe file(s)`);
}

if (failures.length) {
  console.error(
    `\nFAIL ESLint rules still conflicting with Prettier, in ${failures.length} file(s):\n`,
  );
  for (const f of failures) {
    console.error(`  ${f.probe}`);
    for (const line of f.out.split('\n')) console.error(`    ${line}`);
  }
  console.error('\n  Prettier owns formatting. ESLint owns code quality only. Zero overlap.');
  console.error('  The fix is a `rules` entry at the END of the array, switching the named rule');
  console.error('  off — NEVER moving eslint-config-prettier/flat, which must stay LAST.');
  console.error('  Placed anywhere else it switches off nothing that follows, and fails silently.');
  process.exit(1);
}

if (!QUIET) console.log('PASS no ESLint rule conflicts with Prettier');
