import { describe, expect, it } from 'vitest';

import type { Api, Route } from './http/index.js';
import { storefrontApi } from './storefront-api/index.js';
import { studioApi } from './studio-api/index.js';

type Module = Readonly<Record<string, unknown>>;

function isRoute(value: unknown): value is Route {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { operationId?: unknown }).operationId === 'string' &&
    typeof (value as { method?: unknown }).method === 'string' &&
    typeof (value as { path?: unknown }).path === 'string'
  );
}

function exportedRoutes(modules: readonly Module[]): Map<string, Route> {
  const found = new Map<string, Route>();
  for (const loaded of modules) {
    for (const value of Object.values(loaded)) {
      if (isRoute(value)) found.set(value.operationId, value);
    }
  }
  return found;
}

type Glob = Record<string, Module>;

declare global {
  interface ImportMeta {
    glob<T>(
      pattern: string | readonly string[],
      options: { readonly eager: true },
    ): Record<string, T>;
  }
}

// tools/contract-types.spec.mjs writes a transient module folder, contract-types-fixture, into each api.
function modulesOf(routesFiles: Glob, anyFiles: Glob): readonly Module[] {
  const folderOf = (file: string): string => file.slice(0, file.lastIndexOf('/'));
  const withRoutes = new Set(Object.keys(routesFiles).map(folderOf));
  const folders = new Set(Object.keys(anyFiles).map(folderOf));
  expect([...folders].filter((folder) => !withRoutes.has(folder))).toEqual([]);
  return Object.values(routesFiles);
}

const APIS: readonly (readonly [string, Api, readonly Module[]])[] = [
  [
    'storefront-api',
    storefrontApi,
    modulesOf(
      import.meta.glob<Module>(
        ['./storefront-api/*/routes.ts', '!./storefront-api/contract-types-fixture/**'],
        { eager: true },
      ),
      import.meta.glob<Module>(
        ['./storefront-api/*/*.ts', '!./storefront-api/contract-types-fixture/**'],
        { eager: true },
      ),
    ),
  ],
  [
    'studio-api',
    studioApi,
    modulesOf(
      import.meta.glob<Module>(
        ['./studio-api/*/routes.ts', '!./studio-api/contract-types-fixture/**'],
        { eager: true },
      ),
      import.meta.glob<Module>(['./studio-api/*/*.ts', '!./studio-api/contract-types-fixture/**'], {
        eager: true,
      }),
    ),
  ],
];

describe.each(APIS)('%s', (_name, api, modules) => {
  it('lists every route its modules export, and exports every route it lists', () => {
    const exported = exportedRoutes(modules);
    const listed = new Map(Object.entries(api.routes));

    const unlisted = [...exported.keys()].filter((id) => listed.get(id) !== exported.get(id));
    const unexported = [...listed.keys()].filter((id) => exported.get(id) !== listed.get(id));

    expect(unlisted).toEqual([]);
    expect(unexported).toEqual([]);
  });
});
