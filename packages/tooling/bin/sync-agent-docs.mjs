#!/usr/bin/env node
// arthome-sync-agent-docs — puts the project's rules INSIDE the repository that
// has to follow them, at the version it actually installed.
//
// WHY A COPY RATHER THAN A LINK OR A GENERATED MAP
//   Every repository but arthome-core needs the same two documents, and the
//   first answer was a per-repository generator with a freshness gate behind
//   it — four instruments to build and keep working.
//
//   The project owner's answer is better and it is why this file is short: copy
//   on `postinstall`, overwriting. Freshness then costs nothing, because the
//   copy is COMMITTED: if an install rewrites it, `git status` says so, and a
//   stale copy cannot survive a pull followed by an install. The check is the
//   diff, and the diff already exists.
//
// WHAT IT DOES NOT DO, said here because the name suggests more
//   It copies. It does not merge, it does not warn about local edits, and it
//   will overwrite anything written by hand at the destination. That is the
//   point — the destination is a projection, and the header it writes says so —
//   but it means a local edit is lost at the next install rather than
//   reported.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, '..');
const SOURCE = path.join(PACKAGE_ROOT, 'docs');

// `INIT_CWD` is where the install was started, which is the consuming
// repository. `process.cwd()` during a postinstall is the package's own
// directory, so using it would copy the documents onto themselves.
const DESTINATION_ROOT = process.env.INIT_CWD ?? process.cwd();
const DESTINATION = path.join(DESTINATION_ROOT, 'docs', 'arthome');

const HEADER = (name) =>
  `<!-- COPIED BY \`arthome-sync-agent-docs\` ON INSTALL. DO NOT EDIT.\n` +
  `     The original is \`architecture/${name}\` in arthome-core; edit it there.\n` +
  `     This copy is committed on purpose: a \`postinstall\` that rewrites it makes\n` +
  `     \`git status\` the freshness check, so no gate is needed to notice a stale one. -->\n\n`;

function main() {
  if (!fs.existsSync(SOURCE)) {
    // Not an error: the package was installed from a tree that had not been
    // built. Say so and exit 0 — a postinstall that fails blocks an install,
    // and a missing document is not worth blocking one.
    console.warn('arthome-sync-agent-docs: no docs/ in @arthome/tooling — nothing to copy.');
    console.warn('  (run `pnpm --filter @arthome/tooling run build` in arthome-core first)');
    return 0;
  }
  if (path.resolve(DESTINATION_ROOT) === path.resolve(PACKAGE_ROOT)) {
    console.warn('arthome-sync-agent-docs: refusing to copy a package onto itself.');
    return 0;
  }

  fs.mkdirSync(DESTINATION, { recursive: true });
  const names = fs.readdirSync(SOURCE).filter((n) => n.endsWith('.md'));
  for (const name of names) {
    const body = fs.readFileSync(path.join(SOURCE, name), 'utf8');
    fs.writeFileSync(path.join(DESTINATION, name), HEADER(name) + body);
  }
  console.log(
    `arthome-sync-agent-docs: ${names.length} document(s) -> ` +
      `${path.relative(DESTINATION_ROOT, DESTINATION)}/  (${names.join(', ')})`,
  );
  return 0;
}

process.exit(main());
