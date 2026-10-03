#!/usr/bin/env node
// arthome-emit-openapi — prints, as JSON, the OpenAPI document an api module emits.
//
//   node tools/emit-openapi.mjs <built module exporting an api> [<export name>]
//
// It reads BUILT modules (`dist/`), like emit-contracts.mjs, and takes the emitter from
// packages/contracts/dist so the emitter and the api share one zod: a second copy would register
// the components in a registry the api's schemas never reach.

import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const [moduleArg, exportName] = process.argv.slice(2);
if (!moduleArg) {
  process.stderr.write('usage: emit-openapi.mjs <module> [<export>]\n');
  process.exit(2);
}

const { openApiDocumentOf } = await import(
  pathToFileURL(path.resolve('packages/contracts/dist/openapi/index.js')).href
);

const mod = await import(pathToFileURL(path.resolve(moduleArg)).href);
const candidates = Object.entries(mod).filter(
  ([name, value]) =>
    (exportName === undefined || name === exportName) &&
    typeof value === 'object' &&
    value !== null &&
    'routes' in value &&
    'components' in value,
);
if (candidates.length !== 1) {
  process.stderr.write(
    `emit-openapi: expected one api in ${moduleArg}, found ${candidates.length}\n`,
  );
  process.exit(1);
}
process.stdout.write(JSON.stringify(openApiDocumentOf(candidates[0][1]), null, 2));
