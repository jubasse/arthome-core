// Where a repository keeps its packages — read from the one file that already
// says so, instead of each gate carrying its own copy of the answer.
//
// WHY THIS EXISTS
//   The gates globbed `packages/*` in four places. That is correct in
//   arthome-core and wrong everywhere else: arthome-platform keeps services in
//   `apps/*` and shared code in `libs/*`, so every one of those gates would have
//   globbed an empty set, found nothing to complain about, and exited 0.
//
//   ⚠ A GATE THAT SCANS NOTHING IS INDISTINGUISHABLE FROM A GATE THAT PASSES.
//     This repository's own pnpm-workspace.yaml already names that as the worse
//     of the two failure modes, in the note approving unrs-resolver: "a green
//     gate that checks nothing". Four gates were one repository away from being
//     exactly that.
//
//   `pnpm-workspace.yaml` is not a new source of truth — it is the EXISTING one,
//   the file pnpm itself obeys. Reading it means a repository cannot declare its
//   layout to pnpm and to the gates separately and have them disagree, which is
//   this project's dominant fault class.
//
// WHY A HAND-WRITTEN PARSER RATHER THAN A YAML DEPENDENCY
//   @arthome/tooling has four runtime dependencies and every one of them earns
//   its place in an install of every repository. One top-level list of strings
//   does not justify a fifth. The parser below reads exactly that list and
//   refuses anything it does not understand, rather than guessing.

import fs from 'node:fs';
import path from 'node:path';

/**
 * The package globs a repository declares to pnpm.
 *
 * Throws rather than returning a default. A wrong answer here does not produce
 * an error anywhere — it produces silence, in every gate at once.
 *
 * @param {string} root - repository root, the directory holding pnpm-workspace.yaml
 * @returns {string[]} the globs, in declaration order
 */
export function workspacePackageGlobs(root) {
  const file = path.join(root, 'pnpm-workspace.yaml');

  // ABSENT IS LEGITIMATE, EMPTY IS NOT, and the two must not be confused.
  // arthome-storefront-web and arthome-studio-web are single-package
  // repositories: they have no workspace file because they have no workspace,
  // and their sources sit at the root where every gate's root-level patterns
  // already find them. Returning [] is the correct answer there, not a failure.
  // A file that EXISTS and declares nothing is the opposite — somebody meant to
  // have packages and the gates would silently scan none of them.
  if (!fs.existsSync(file)) return [];

  const globs = [];
  let inside = false;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.replace(/#.*$/, '').trimEnd();
    if (/^packages:\s*$/.test(line)) {
      inside = true;
      continue;
    }
    if (!inside) continue;
    // Any line that is not an indented list item ends the block — including
    // another top-level key, which is how `minimumReleaseAge` terminates it.
    const item = /^\s+-\s+(.+)$/.exec(line);
    if (!item) {
      if (line.trim() === '') continue;
      break;
    }
    globs.push(item[1].trim().replace(/^["']|["']$/g, ''));
  }

  if (globs.length === 0) {
    throw new Error(
      `pnpm-workspace.yaml in ${root} declares no \`packages:\` globs.\n` +
        `  Every gate that scans source would scan an empty set and exit 0.`,
    );
  }
  return globs;
}

/**
 * Expand the workspace globs into the shape a gate actually wants.
 *
 * `suffix` is appended to each glob: `package.json`, `src/**\/*.ts`, and so on.
 *
 * @param {string} root
 * @param {string} suffix
 * @returns {string[]}
 */
export function workspaceGlobs(root, suffix) {
  return workspacePackageGlobs(root).map((g) => `${g}/${suffix}`);
}
