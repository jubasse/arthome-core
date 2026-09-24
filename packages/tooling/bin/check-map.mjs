#!/usr/bin/env node
// arthome-check-map — the committed REPOSITORY_MAP.md matches what regenerating would produce.
//
// Same shape as arthome-check-tsconfig: it reads the RESOLVED result — the installed declarations,
// reached through `exports` — never the file that claims to describe them.
//
// HOW IT DECIDES
//   Regenerate in memory, parse both the committed file and the fresh render into STRUCTURE
//   (heading path -> bullets keyed by name), compare structures. Not text: heading order, blank
//   lines and bullet order are not differences, and a normaliser added to hide them would hide a
//   real one. A name, a kind, a signature, a summary, a version or a purpose always is.
//
// EXIT CODES
//   0 the map is current · 1 it is stale, or the purpose registry is inconsistent
//   3 the gate DID NOT RUN (a package is not installed, its declarations are missing, TypeScript is
//     absent, a subpath resolved to zero names). Never 0: an empty map compares equal to an empty
//     committed file, and that would be a fact stated zero times wearing a green tick.
//
// WHERE THE MECHANISM STOPS — stated, because the name implies more than it delivers
//   - it proves the map matches the DECLARATIONS. It does not prove the declarations match the
//     runtime: a hand-edited or stale dist passes, and the map inherits the lie;
//   - it does not prove a summary or a purpose sentence is TRUE. Summaries are the first sentence
//     of the package's own JSDoc (so they are as right as that comment); purposes are hand-written,
//     and the gate only proves every tracked directory has one and every entry has a directory;
//   - only exported names are mapped. Behaviour, invariants and the reason a rule exists are in the
//     JSDoc, DECISIONS.md and the .d.ts; a name in this map is not an endorsement of using it;
//   - directories below packages/*/src/* and files are not covered; `@arthome/tooling` is excluded
//     as build configuration;
//   - it says nothing about which repositories CONSUME the map: each consumer runs its own copy.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { MAP_FILE, NotRun, diffMaps, generate, parseMap } from '../lib/repo-map.mjs';

const CWD = process.cwd();
let result;
try {
  result = generate(CWD);
} catch (e) {
  if (!(e instanceof NotRun)) throw e;
  console.error(`NOT RUN ${e.message}\n  The gate did not compare anything. This is not a pass.`);
  process.exit(3);
}
const { markdown, coverage, registryProblems } = result;

console.log(
  `arthome-check-map: ${coverage.packages} package(s), ${coverage.subpaths} subpath(s), ` +
    `${coverage.names} exported name(s), ${coverage.directories} directories`,
);
console.log(`  ${coverage.specifiers.join(', ')}`);
if (coverage.unmapped)
  console.log(`  ${coverage.unmapped} subpath(s) listed as not mapped (no TypeScript entry).`);

const problems = [...registryProblems];
const file = path.join(CWD, MAP_FILE);
if (!fs.existsSync(file)) {
  problems.push(`${MAP_FILE} is not committed. Run \`arthome-generate-map\`.`);
} else {
  problems.push(...diffMaps(parseMap(fs.readFileSync(file, 'utf8')), parseMap(markdown)));
}

if (problems.length) {
  console.error(
    `\nFAIL ${problems.length} difference(s) between ${MAP_FILE} and what regenerating produces:\n`,
  );
  for (const p of problems.slice(0, 40)) console.error(`  ${p}`);
  if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`);
  console.error(
    '\n  Regenerate with `pnpm exec arthome-generate-map`. Never edit the map by hand: it is a projection.',
  );
  process.exit(1);
}
console.log(
  `PASS ${MAP_FILE} matches the installed declarations (${coverage.names} names compared)`,
);
