// Where a repository keeps its packages, read from `pnpm-workspace.yaml` — the
// EXISTING source of truth, the file pnpm itself obeys.
//
// ⚠ A GATE THAT SCANS NOTHING IS INDISTINGUISHABLE FROM A GATE THAT PASSES. Four
//   gates globbed `packages/*` by hand; arthome-platform keeps services in `apps/*`
//   and libraries in `libs/*`, so all four were one repository away from globbing an
//   empty set and exiting 0.
//
// The parser is hand-written because one top-level list of strings does not justify
// a fifth runtime dependency in every repository's install. It refuses what it does
// not understand rather than guessing.

import fs from 'node:fs';
import path from 'node:path';

/**
 * The package globs a repository declares to pnpm, in declaration order. Throws
 * rather than defaulting: a wrong answer here produces no error, only silence, in
 * every gate at once.
 */
export function workspacePackageGlobs(root) {
  const file = path.join(root, 'pnpm-workspace.yaml');

  // ⚠ ABSENT IS LEGITIMATE, EMPTY IS NOT. The two single-package repositories have
  //   no workspace file because they have no workspace; a file that exists and
  //   declares nothing means somebody meant to have packages.
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

/** The workspace globs with `suffix` appended to each. */
export function workspaceGlobs(root, suffix) {
  return workspacePackageGlobs(root).map((g) => `${g}/${suffix}`);
}

/**
 * The absolute workspace package directories that exist on disk. Only the trailing
 * `/*` form is expanded, the only form this project's workspaces use.
 */
export function workspacePackageDirs(root) {
  const out = [];
  for (const glob of workspacePackageGlobs(root)) {
    if (!glob.endsWith('/*')) {
      const fixed = path.join(root, glob);
      if (fs.existsSync(path.join(fixed, 'package.json'))) out.push(fixed);
      continue;
    }
    const parent = path.join(root, glob.slice(0, -2));
    if (!fs.existsSync(parent)) continue;
    for (const entry of fs.readdirSync(parent)) {
      const dir = path.join(parent, entry);
      if (fs.existsSync(path.join(dir, 'package.json'))) out.push(dir);
    }
  }
  return out;
}
