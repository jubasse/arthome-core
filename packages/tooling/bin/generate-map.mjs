#!/usr/bin/env node
// arthome-generate-map — writes REPOSITORY_MAP.md (D-061).
//
// Reads the INSTALLED declarations of the shared @arthome/* packages through their `exports`
// maps, and the tracked directory tree against repo-map.purposes.json. See lib/repo-map.mjs for
// what it reads and, more to the point, where it stops.
//
// Exit 0 written; 1 the purpose registry is inconsistent; 3 it did not run (nothing was written).

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { MAP_FILE, NotRun, generate } from '../lib/repo-map.mjs';

const CWD = process.cwd();
try {
  const { markdown, coverage, registryProblems } = generate(CWD);
  if (registryProblems.length) {
    console.error(
      `FAIL ${registryProblems.length} problem(s) in the purpose registry; nothing written:\n`,
    );
    for (const p of registryProblems) console.error(`  ${p}`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(CWD, MAP_FILE), `${markdown}\n`);
  console.log(
    `arthome-generate-map: wrote ${MAP_FILE} — ${coverage.packages} package(s), ` +
      `${coverage.subpaths} subpath(s), ${coverage.names} exported name(s), ${coverage.directories} directories.`,
  );
} catch (e) {
  if (!(e instanceof NotRun)) throw e;
  console.error(`NOT RUN ${e.message}\n  Nothing was written.`);
  process.exit(3);
}
