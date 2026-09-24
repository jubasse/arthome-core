#!/usr/bin/env node
// arthome-emit-contracts — the NODE half of the empty-diff gate (D-058).
//
// It does one thing: import every subpath that @arthome/core and
// @arthome/contracts publish, emit each exported `*Schema` as JSON Schema, and
// print the lot as one JSON object on stdout. It compares nothing and knows
// nothing about the documents. The comparison lives in tools/check-emit-diff.py,
// which already has a YAML parser and the normaliser check-openapi.py is built
// on.
//
// THE LOOKUP RUNS FROM THE DOCUMENT TO THE CODE, AND THE FIRST VERSION HAD IT
// BACKWARDS.
//   It began by treating every export named `XSchema` as a claim on the
//   document's schema `X`, and reporting an export that matched nothing as an
//   error. That is wrong, and the run said so immediately: `WireInstantSchema`
//   is `InstantSchema` with `format: date-time` attached, `SlugSchema` and
//   `DeviceIdSchema` are primitives — none of them is a named document schema
//   and none of them is a defect. Most schemas are building blocks that appear
//   INLINED in the document, and a tool cannot tell a building block from a
//   typo.
//
//   So this half emits everything and claims nothing. The Python half indexes
//   BY THE DOCUMENT — D-058 makes the document authoritative — and reports what
//   has no source yet as coverage rather than as a failure.
//
// WHY IT READS dist/ AND NOT src/
//   The same reason check-tsconfig reads `tsc --showConfig`: what a consumer
//   gets is the BUILT package. It needs `^build` upstream, or it diffs against a
//   stale core — see the note in the Python half.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const CWD = process.cwd();
const PACKAGES = ['packages/core', 'packages/contracts'].map((p) => path.resolve(CWD, p));

// ZOD IS RESOLVED FROM THE PACKAGE, NEVER FROM THIS REPOSITORY'S ROOT.
//
// A `zod` in the root devDependencies would resolve here and the tool would
// work — with a SECOND COPY. That is regime A of versions.json, and
// packages/contracts/package.json argues against it at length: two copies means
// two schema registries. Writing that second copy into the gate whose purpose is
// to prove there is one copy of each shape would be the fault in the instrument.
//
// It is also load-bearing rather than tidy. The `instanceof` test below compares
// CLASS IDENTITY, so under two copies every export would be reported as "not a
// zod schema" — the gate detects its own second copy instead of quietly
// measuring the wrong one.
const requireFromContracts = createRequire(path.join(CWD, 'packages/contracts/package.json'));
const { z } = await import(pathToFileURL(requireFromContracts.resolve('zod')).href);

const emitted = {};
const problems = [];

for (const pkgDir of PACKAGES) {
  const manifest = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  // The subpaths the package actually publishes, read from `exports` rather than
  // from the directory listing: a directory built but not exported is
  // unreachable to a consumer, and this gate must see what a consumer sees.
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
      if (!name.endsWith('Schema')) continue;
      if (!(value instanceof z.ZodType)) {
        problems.push(`${key} exports ${name}, which is not a zod schema`);
        continue;
      }
      const schemaName = name.slice(0, -'Schema'.length);
      if (emitted[schemaName]) {
        problems.push(
          `${schemaName}: claimed by ${emitted[schemaName].from} and by ${key} — ` +
            'two sources for one document schema is the duplication this gate exists to find',
        );
        continue;
      }
      // `io: 'output'` is the only correct mode for a response shape: it is what
      // a client receives, and it is where `.default()` stops being optional.
      emitted[schemaName] = {
        from: key,
        export: name,
        schema: z.toJSONSchema(value, { io: 'output' }),
      };
    }
  }
}

process.stdout.write(JSON.stringify({ emitted, problems }, null, 2));
