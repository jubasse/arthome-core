#!/usr/bin/env node
// pack-release <tag> <out-dir> — pack the three @arthome/* packages into <out-dir>
// as the assets of a GitHub release. The release workflow runs it, and so can anyone
// locally to see exactly what a release would carry.
//
// The tag must be v<version> and every package must already be at that version: a
// release whose tarballs say 0.1.0 under a v0.2.0 tag would install fine and lie about
// what it is. core is packed first because contracts' prepack compiles against it.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = ['core', 'contracts', 'tooling'];

function fail(message) {
  console.error(`pack-release: ${message}`);
  process.exit(1);
}

const [tag, outArgument] = process.argv.slice(2);
if (!tag || !outArgument) fail('usage: pack-release <tag> <out-dir>');

const version = /^v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(tag)?.[1];
if (!version) fail(`"${tag}" is not a v<major>.<minor>.<patch> tag`);

const out = path.resolve(outArgument);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const name of PACKAGES) {
  const dir = path.join(REPO, 'packages', name);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));

  if (manifest.version !== version) {
    fail(`@arthome/${name} is at ${manifest.version}, the tag says ${version}`);
  }
  if (!manifest.scripts?.prepack) {
    fail(`@arthome/${name} has no prepack script, so its tarball would ship stale build output`);
  }

  execFileSync('pnpm', ['pack', '--pack-destination', out], { cwd: dir, stdio: 'inherit' });

  const produced = path.join(out, `arthome-${name}-${version}.tgz`);
  if (!fs.existsSync(produced)) fail(`pnpm pack did not produce ${path.basename(produced)}`);
  console.log(`  ${path.basename(produced)}  ${Math.round(fs.statSync(produced).size / 1024)} KB`);
}
