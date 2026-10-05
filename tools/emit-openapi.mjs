#!/usr/bin/env node
// arthome-emit-openapi — prints, as JSON, the OpenAPI document an api module emits.
//
//   node tools/emit-openapi.mjs <built module exporting an api> [--docs <built docs module>]
//
// It reads BUILT modules (`dist/`) and takes the emitter from
// packages/contracts/dist so the emitter and the api share one zod: a second copy would register
// the components in a registry the api's schemas never reach.

import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const docsAt = args.indexOf('--docs');
const docsArg = docsAt === -1 ? undefined : args[docsAt + 1];
const moduleArg = args.find((arg, index) => !arg.startsWith('--') && index !== docsAt + 1);
if (!moduleArg || (docsAt !== -1 && !docsArg)) {
  process.stderr.write('usage: emit-openapi.mjs <module> [--docs <docs module>]\n');
  process.exit(2);
}

const { openApiDocumentOf } = await import(
  pathToFileURL(path.resolve('packages/contracts/dist/openapi/index.js')).href
);

async function theOne(file, kind, matches) {
  const mod = await import(pathToFileURL(path.resolve(file)).href);
  const candidates = Object.values(mod).filter(
    (value) => typeof value === 'object' && value !== null && matches(value),
  );
  if (candidates.length !== 1) {
    process.stderr.write(
      `emit-openapi: expected one ${kind} in ${file}, found ${candidates.length}\n`,
    );
    process.exit(1);
  }
  return candidates[0];
}

const api = await theOne(moduleArg, 'api', (value) => 'routes' in value && 'components' in value);
const docs =
  docsArg === undefined
    ? undefined
    : await theOne(docsArg, 'docs', (value) => 'operations' in value && 'examples' in value);
process.stdout.write(JSON.stringify(openApiDocumentOf(api, docs), null, 2));
