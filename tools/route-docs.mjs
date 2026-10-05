#!/usr/bin/env node
/**
 * Prints the docs entries of routes still on their old declaration, ready for a module's `docs.ts`:
 * the description, the upstream services and the idempotency exemption, read from the BUILT api
 * so no long description is copied by hand. A stated maturity stays with the api's `docs.ts`
 * until it is moved by hand, with its reason.
 *
 *   pnpm -r run build
 *   node tools/route-docs.mjs studio getDateSheet getDatePublicPane ...
 */

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [surface, ...operationIds] = process.argv.slice(2);
if (surface === undefined || operationIds.length === 0) {
  console.error('usage: route-docs.mjs <storefront|studio> <operationId>...');
  process.exit(2);
}

const dist = resolve('packages/contracts/dist');
const apiModule = await import(pathToFileURL(resolve(dist, `${surface}-api/index.js`)).href);
const api = apiModule[`${surface}Api`];
const { Service, Upstream } = await import(
  pathToFileURL(resolve('packages/core/dist/index.js')).href
);

/** `Service.CATALOG`, or `Upstream.REALTIME` for what is not a service. */
const accessorOf = (upstream) => {
  for (const [accessor, members] of [
    ['Service', Service],
    ['Upstream', Upstream],
  ]) {
    const key = Object.keys(members).find((name) => members[name] === upstream);
    if (key !== undefined) return `${accessor}.${key}`;
  }
  throw new Error(`route-docs: "${upstream}" is no upstream member.`);
};

const entries = operationIds.map((operationId) => {
  const route = api.routes[operationId];
  if (route === undefined) throw new Error(`route-docs: no route "${operationId}" in ${surface}.`);
  const lines = [`  ${operationId}: {`];
  if (route.description !== undefined) {
    lines.push(`    description: ${JSON.stringify(route.description)},`);
  }
  const upstream = route['x-arthome-upstream'];
  if (upstream !== undefined) lines.push(`    upstream: [${upstream.map(accessorOf).join(', ')}],`);
  const exemption = route['x-arthome-idempotency-exemption'];
  if (exemption !== undefined)
    lines.push(`    idempotencyExemption: ${JSON.stringify(exemption)},`);
  lines.push('  },');
  return lines.join('\n');
});
console.log(entries.join('\n'));
