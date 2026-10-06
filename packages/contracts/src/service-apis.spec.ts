import { describe, expect, it } from 'vitest';

import { API_ERROR_CODES, InternalTokenIssuer } from '@arthome/core';

import type { Api, ErrorModel, Route } from './http/index.js';
import { errorCodesOf, service, serviceErrors, versionedPath } from './http/index.js';
import { storefrontErrors } from './storefront-api/components.js';
import { storefrontApi } from './storefront-api/index.js';
import { studioErrors } from './studio-api/components.js';
import { studioApi } from './studio-api/index.js';

declare global {
  interface ImportMeta {
    glob<T>(
      pattern: string | readonly string[],
      options: { readonly eager: true },
    ): Record<string, T>;
  }
}

function isApi(value: unknown): value is Api {
  return typeof value === 'object' && value !== null && 'routes' in value && 'components' in value;
}

/** Every service api, found by its folder's name, so the next one is held to the model with no copy. */
const SERVICE_APIS: readonly (readonly [string, Api])[] = Object.entries(
  import.meta.glob<Readonly<Record<string, unknown>>>('./*-service-api/index.ts', { eager: true }),
).flatMap(([file, loaded]) =>
  Object.values(loaded)
    .filter(isApi)
    .map((api) => [file, api] as const),
);

/** Where each public operation is declared, the error model of its BFF, and that BFF. */
const SURFACE_APIS: readonly (readonly [Api, ErrorModel<string>, InternalTokenIssuer])[] = [
  [storefrontApi, storefrontErrors, InternalTokenIssuer.STOREFRONT_BFF],
  [studioApi, studioErrors, InternalTokenIssuer.STUDIO_BFF],
];

interface PublicOperation {
  readonly route: Route;
  readonly model: ErrorModel<string>;
  readonly issuer: InternalTokenIssuer;
}

function publicOperationOf(route: Route): PublicOperation | undefined {
  for (const [api, model, issuer] of SURFACE_APIS) {
    const operation = api.routes[route.operationId];
    if (operation !== undefined) return { route: operation, model, issuer };
  }
  return undefined;
}

function issuersOf(route: Route): readonly unknown[] | undefined {
  const rule = route.requires?.find((requirement) => requirement.name === 'callerService');
  return (rule?.params as { readonly issuers?: readonly unknown[] } | undefined)?.issuers;
}

const successesOf = (route: Route): readonly string[] =>
  Object.keys(route.responses).filter((status) => status.startsWith('2'));

const isTransportCode = (code: string): boolean =>
  (API_ERROR_CODES as readonly string[]).includes(code);

/**
 * The codes a BFF answers of its own, which its service never sends it: its identity's, its rules',
 * and the transport codes its shared responses stand for where the service model's do not (the
 * upstream 502, 503 and 504, a list's 410, the rate limit's 429).
 */
function ownedByTheBff({
  route,
  model,
}: PublicOperation): (status: string, code: string) => boolean {
  const own = new Set<string>();
  const access = route.access;
  if (access?.kind === 'identified') {
    for (const codes of [
      ...Object.values(access.identity.errors),
      ...Object.values(access.identity.writeErrors),
    ]) {
      for (const code of codes ?? []) own.add(code);
    }
  }
  for (const rule of route.requires ?? []) {
    for (const codes of Object.values(rule.errors)) for (const code of codes ?? []) own.add(code);
  }
  return (status, code) => {
    if (own.has(code)) return true;
    const shared = model.standard[Number(status) as keyof typeof model.standard]?.codes ?? [];
    const served =
      serviceErrors.standard[Number(status) as keyof typeof serviceErrors.standard]?.codes ?? [];
    return isTransportCode(code) && shared.includes(code) && !served.includes(code);
  };
}

it('finds every service api', () => {
  expect(SERVICE_APIS.length).toBeGreaterThan(0);
});

describe.each(SERVICE_APIS)('%s', (_file, api) => {
  const routes: readonly Route[] = Object.values(api.routes);
  const relaying = routes.filter((route) => publicOperationOf(route) !== undefined);

  it('has every route internal, on the service identity, with a caller rule', () => {
    const astray = routes.filter(
      (route) =>
        route.internal !== true ||
        route.access?.kind !== 'identified' ||
        route.access.identity !== service ||
        issuersOf(route) === undefined,
    );

    expect(astray.map((route) => route.operationId)).toEqual([]);
  });

  it('has no route public or optional', () => {
    const open = routes.filter(
      (route) => route.access?.kind !== 'identified' || route.access.optional,
    );

    expect(open.map((route) => route.operationId)).toEqual([]);
  });

  it('serves each public operation to the BFF that serves it', () => {
    const astray = relaying.filter(
      (route) => !(issuersOf(route) ?? []).includes(publicOperationOf(route)?.issuer),
    );

    expect(astray.map((route) => route.operationId)).toEqual([]);
  });

  it.each(relaying)(
    '$operationId keeps its public operation’s id, path, body, paging, answer and codes',
    (route) => {
      const operation = publicOperationOf(route);
      if (operation === undefined) throw new Error('no public operation');
      const { route: relayed } = operation;

      expect(route.method).toBe(relayed.method);
      expect(versionedPath(route)).toBe(versionedPath(relayed));
      expect(route.requestBody?.content['application/json']?.schema).toBe(
        relayed.requestBody?.content['application/json']?.schema,
      );
      expect(route.paging?.kind).toBe(relayed.paging?.kind);
      expect(successesOf(route)).toEqual(successesOf(relayed));
      for (const status of successesOf(relayed)) {
        expect(route.responses[status]?.content?.['application/json']?.exampleFrom?.of).toBe(
          relayed.responses[status]?.content?.['application/json']?.exampleFrom?.of,
        );
      }

      const isTheBffs = ownedByTheBff(operation);
      const missing: string[] = [];
      for (const [status, codes] of Object.entries(relayed.errorCodes ?? {})) {
        const held = errorCodesOf(route, status) ?? [];
        for (const code of codes) {
          if (!isTheBffs(status, code) && !held.includes(code)) missing.push(`${status} ${code}`);
        }
      }
      expect(missing).toEqual([]);
    },
  );
});
