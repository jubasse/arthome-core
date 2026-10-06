#!/usr/bin/env node
// pack-release <tag> <out-dir> — pack the three @arthome/* packages into <out-dir>
// as the assets of a GitHub release. The release workflow runs it, and so can anyone
// locally to see exactly what a release would carry.
//
// The tag is v<version> or v<version>-rc.<n>, and every package must already be at
// <version>: a release whose tarballs say 0.1.0 under a v0.2.0 tag would install fine and
// lie about what it is. A candidate is stamped <version>-rc.<n> in the tarball only, so
// develop stays at <version> and one commit can be tagged rc.1, rc.2 and so on.
// core is packed first because contracts' prepack compiles against it.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { releaseOf } from './release-tag.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = ['core', 'contracts', 'tooling'];

function stampVersion(tarball, name, version) {
  const unpacked = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-release-'));
  try {
    execFileSync('tar', ['-xzf', tarball, '-C', unpacked]);
    const manifestPath = path.join(unpacked, 'package', 'package.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = version;
    if (manifest.peerDependencies?.['@arthome/core'])
      manifest.peerDependencies['@arthome/core'] = version;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const stamped = path.join(path.dirname(tarball), `arthome-${name}-${version}.tgz`);
    execFileSync('tar', ['-czf', stamped, '-C', unpacked, 'package']);
    fs.rmSync(tarball);
    return stamped;
  } finally {
    fs.rmSync(unpacked, { recursive: true, force: true });
  }
}

function fail(message) {
  console.error(`pack-release: ${message}`);
  process.exit(1);
}

const [tag, outArgument] = process.argv.slice(2);
if (!tag || !outArgument) fail('usage: pack-release <tag> <out-dir>');

const out = path.resolve(outArgument);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const name of PACKAGES) {
  const dir = path.join(REPO, 'packages', name);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));

  let release;
  try {
    release = releaseOf(tag, manifest.version);
  } catch (error) {
    fail(`@arthome/${name}: ${error.message}`);
  }
  if (!manifest.scripts?.prepack) {
    fail(`@arthome/${name} has no prepack script, so its tarball would ship stale build output`);
  }

  execFileSync('pnpm', ['pack', '--pack-destination', out], { cwd: dir, stdio: 'inherit' });

  let produced = path.join(out, `arthome-${name}-${manifest.version}.tgz`);
  if (!fs.existsSync(produced)) fail(`pnpm pack did not produce ${path.basename(produced)}`);
  if (release.isCandidate) produced = stampVersion(produced, name, release.version);
  console.log(`  ${path.basename(produced)}  ${Math.round(fs.statSync(produced).size / 1024)} KB`);
}
