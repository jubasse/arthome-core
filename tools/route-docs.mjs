#!/usr/bin/env node
/**
 * Prints the docs entries of routes still on their old declaration, ready for a module's `docs.ts`:
 * the description, the upstream services and the idempotency exemption, read from the BUILT api
 * so no long description is copied by hand. A maturity the route states and its owning service does
 * not give is printed too, and named on stderr: it needs a `maturityReason`, or it goes. A stated
 * maturity already in the api's `docs.ts` moves from there by hand, with its reason.
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
const { maturityOf } = await import(pathToFileURL(resolve(dist, 'openapi/index.js')).href);
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
  const stated = route['x-arthome-maturity'];
  const derived = maturityOf(upstream ?? []);
  if (stated !== undefined && stated !== derived) {
    lines.push(`    maturity: '${stated}',`);
    console.error(
      `route-docs: ${operationId} states ${stated} where its owning service gives ${derived ?? 'none'}: ` +
        'give it a maturityReason, or drop the maturity if the derived one is right.',
    );
  }
  const exemption = route['x-arthome-idempotency-exemption'];
  if (exemption !== undefined)
    lines.push(`    idempotencyExemption: ${JSON.stringify(exemption)},`);
  lines.push('  },');
  return lines.join('\n');
});
console.log(entries.join('\n'));
