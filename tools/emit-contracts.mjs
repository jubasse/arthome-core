#!/usr/bin/env node
// arthome-emit-contracts — the NODE half of the empty-diff gate (D-058).
//
// It imports every subpath @arthome/core and @arthome/contracts publish, emits each
// exported zod schema as JSON Schema, and prints the lot on stdout. It compares
// nothing and knows nothing about the documents: the comparison lives in
// tools/check-emit-diff.py, which indexes BY THE DOCUMENT because D-058 makes the
// document authoritative.
//
// ⚠ IT EMITS EVERYTHING AND CLAIMS NOTHING. Most schemas are building blocks that
//   appear INLINED in a document — `SlugSchema`, `DeviceIdSchema` — and no tool can
//   tell a building block from a typo. Treating an unmatched export as an error was
//   the first version, and it failed on its first run.
//
// It reads dist/, not src/: what a consumer gets is the BUILT package, so it needs
// `^build` upstream or it diffs against a stale core.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const CWD = process.cwd();

// `--ids '{"ExportName":"DocumentSchemaName", …}'` switches on REGISTRY MODE. Without
// a registry `z.toJSONSchema` INLINES every nested object, so the document gains a
// second copy of a shape under no name — E2, from the tool meant to remove it. The map
// comes IN because a registry needs each schema's DOCUMENT name, which only the Python
// half can read.
const idsArg = process.argv.indexOf('--ids');
const IDS = idsArg !== -1 ? JSON.parse(process.argv[idsArg + 1]) : null;

const PACKAGES = ['packages/core', 'packages/contracts'].map((p) => path.resolve(CWD, p));

// ⚠ ZOD IS RESOLVED FROM THE PACKAGE, NEVER FROM THIS REPOSITORY'S ROOT, and it is
//   load-bearing rather than tidy: the `instanceof` test below compares CLASS
//   IDENTITY, so a second copy reports every export as "not a zod schema".
const requireFromContracts = createRequire(path.join(CWD, 'packages/contracts/package.json'));
const { z } = await import(pathToFileURL(requireFromContracts.resolve('zod')).href);

const emitted = {};
const problems = [];

for (const pkgDir of PACKAGES) {
  const manifest = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  // Read from `exports`, not the directory listing: this gate must see what a
  // consumer sees, and a directory built but not exported reaches nobody.
  const subpaths = Object.entries(manifest.exports ?? {})
    .filter(([key]) => key !== './package.json')
    .map(([key, value]) => ({
      key: `${manifest.name}${key === '.' ? '' : key.slice(1)}`,
      file: typeof value === 'string' ? value : value.import,
    }))
    .filter((entry) => typeof entry.file === 'string');

  for (const { key, file } of subpaths) {
    const abs = path.resolve(pkgDir, file);
    if (!fs.existsSync(abs)) {
      problems.push(`${key} -> ${path.relative(CWD, abs)} does not exist (build first)`);
      continue;
    }
    const mod = await import(pathToFileURL(abs).href);
    for (const [name, value] of Object.entries(mod)) {
      // ⚠ THE SELECTOR IS THE TYPE, NOT THE NAME. Filtering on a `Schema|In|Out`
      //   suffix caught `isAvailableIn` and `taxIncludedIn` — ordinary predicates
      //   whose names end in `In`. An export named `…Schema` that is not one stays
      //   an error, because that name makes a promise.
      const isSchema = value instanceof z.ZodType;
      if (!isSchema) {
        if (name.endsWith('Schema')) {
          problems.push(`${key} exports ${name}, which is named for a schema and is not one`);
        }
        continue;
      }
      if (emitted[name]) {
        problems.push(
          `${name}: exported by ${emitted[name].from} and by ${key} — ` +
            'two sources for one name is the duplication this gate exists to find',
        );
        continue;
      }
      // `io: 'output'` is the only correct mode for a response shape: it is what
      // a client receives, and it is where `.default()` stops being optional.
      emitted[name] = IDS
        ? { from: key, zod: value }
        : { from: key, schema: z.toJSONSchema(value, { io: 'output' }) };
    }
  }
}

if (IDS) {
  // ⚠ THE ID LIVES ON THE SCHEMA, so a schema nobody registers is SILENTLY INLINED
  //   and the output stays VALID — no throw, no warning, just a second copy of a
  //   shape under no name. Anything unregistered is emitted standalone below and
  //   flagged, rather than hidden.
  const registry = z.registry();
  const registered = [];
  for (const [name, entry] of Object.entries(emitted)) {
    if (!IDS[name]) continue;
    registry.add(entry.zod, { id: IDS[name] });
    registered.push(name);
  }
  const { schemas } = z.toJSONSchema(registry, {
    io: 'output',
    uri: (id) => `#/components/schemas/${id}`,
  });
  for (const [name, entry] of Object.entries(emitted)) {
    emitted[name] = IDS[name]
      ? { from: entry.from, schema: schemas[IDS[name]] }
      : {
          from: entry.from,
          schema: z.toJSONSchema(entry.zod, { io: 'output' }),
          unregistered: true,
        };
  }
  process.stdout.write(
    JSON.stringify({ emitted, problems, registered: registered.length }, null, 2),
  );
} else {
  process.stdout.write(JSON.stringify({ emitted, problems }, null, 2));
}
