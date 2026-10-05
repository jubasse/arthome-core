import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Api } from './http/index.js';
import { restrictedFieldsOf, sensitivePathsOf } from './http/index.js';
import { storefrontApi } from './storefront-api/index.js';
import { studioApi } from './studio-api/index.js';

interface Field {
  readonly operationId: string;
  readonly path: string;
  readonly key: string;
  readonly schema: z.ZodType;
}

const WRAPPERS = ['optional', 'nullable', 'default', 'readonly', 'catch', 'nonoptional'];

function unwrapped(schema: z.ZodType): readonly z.ZodType[] {
  const chain: z.ZodType[] = [schema];
  let current = schema;
  for (;;) {
    const def = current.def as unknown as { type: string; innerType?: z.ZodType };
    if (!WRAPPERS.includes(def.type) || def.innerType === undefined) return chain;
    current = def.innerType;
    chain.push(current);
  }
}

function fieldsOf(operationId: string, root: z.ZodType): readonly Field[] {
  const out: Field[] = [];
  const seen = new Set<z.ZodType>();
  const visit = (schema: z.ZodType, path: string): void => {
    if (seen.has(schema)) return;
    seen.add(schema);
    const inner = unwrapped(schema).at(-1)!;
    if (inner instanceof z.ZodObject) {
      const shape: Readonly<Record<string, z.ZodType>> = inner.shape;
      for (const [key, field] of Object.entries(shape)) {
        const fieldPath = path === '' ? key : `${path}.${key}`;
        out.push({ operationId, path: fieldPath, key, schema: field });
        visit(field, fieldPath);
      }
    } else if (inner instanceof z.ZodArray) {
      visit(inner.element as z.ZodType, `${path}[]`);
    } else if (inner instanceof z.ZodRecord) {
      visit(inner.valueType as z.ZodType, `${path}.*`);
    } else if (inner instanceof z.ZodUnion) {
      for (const option of inner.options as readonly z.ZodType[]) visit(option, path);
    } else if (inner instanceof z.ZodIntersection) {
      visit(inner.def.left as z.ZodType, path);
      visit(inner.def.right as z.ZodType, path);
    }
  };
  visit(root, '');
  return out;
}

function fieldsOfApi(api: Api): readonly Field[] {
  const out: Field[] = [];
  for (const route of Object.values(api.routes)) {
    const { operationId } = route;
    for (const parameter of route.parameters ?? []) {
      out.push({
        operationId,
        path: parameter.name,
        key: parameter.name,
        schema: parameter.schema,
      });
    }
    const body = route.requestBody?.content['application/json']?.schema;
    if (body !== undefined) out.push(...fieldsOf(operationId, body));
    for (const response of Object.values(route.responses)) {
      const schema = response.content?.['application/json']?.schema;
      if (schema !== undefined) out.push(...fieldsOf(operationId, schema));
    }
  }
  return out;
}

const isMarkedSensitive = (field: Field): boolean => sensitivePathsOf(field.schema).includes('');

const CREDENTIAL_KEY = /password|passphrase|secret|token|apikey|privatekey|otp/i;
const isCredentialKey = (key: string): boolean => CREDENTIAL_KEY.test(key) || key === 'code';

const NOT_A_CREDENTIAL: readonly { readonly path: string; readonly reason: string }[] = [
  {
    path: 'error.code',
    reason: 'The error envelope code, a public machine code that every client reads and logs.',
  },
  {
    path: 'items[].code',
    reason: 'The code of a journal entry: an event code from a closed vocabulary, never a secret.',
  },
  {
    path: 'data.security.hasPassword',
    reason: 'A boolean saying whether the account has a password; it carries no password.',
  },
];

describe.each([
  ['storefront', storefrontApi],
  ['studio', studioApi],
] as const)('credential fields are sensitive, %s', (_name, api: Api) => {
  it('marks every field named like a credential, unless the allow-list says why not', () => {
    const allowed = new Set(NOT_A_CREDENTIAL.map((entry) => entry.path));
    const unmarked = fieldsOfApi(api)
      .filter((field) => isCredentialKey(field.key))
      .filter((field) => !isMarkedSensitive(field) && !allowed.has(field.path))
      .map((field) => `${field.operationId}: ${field.path}`);

    expect([...new Set(unmarked)].sort()).toEqual([]);
  });
});

describe('the allow-list of credential-like names', () => {
  it('gives a reason to every entry and holds no entry that no field uses', () => {
    const everyField = [...fieldsOfApi(storefrontApi), ...fieldsOfApi(studioApi)];
    for (const entry of NOT_A_CREDENTIAL) {
      expect(entry.reason.length).toBeGreaterThan(20);
      expect(
        everyField.some((field) => field.path === entry.path && !isMarkedSensitive(field)),
      ).toBe(true);
    }
  });
});

const ABSENT_WITHOUT_RIGHT = /\babsent\b[^`.]*?\b(?:lacks?|without|unless)\b[^`.]*`(can\w+)`/i;

const NOT_A_RESTRICTED_FIELD: readonly { readonly path: string; readonly reason: string }[] = [
  {
    path: 'items[].nature',
    reason:
      'The journal hides the rows of the money kind from a role without canRevenue; the field itself is always served.',
  },
];

function descriptionOf(schema: z.ZodType): string {
  return unwrapped(schema)
    .map((layer) => layer.description ?? '')
    .join(' ');
}

describe.each([
  ['storefront', storefrontApi],
  ['studio', studioApi],
] as const)(
  'a field described as absent without a right is restricted by it, %s',
  (_name, api: Api) => {
    it('declares the right the description names', () => {
      const wrong = fieldsOfApi(api).flatMap((field) => {
        const right = ABSENT_WITHOUT_RIGHT.exec(descriptionOf(field.schema))?.[1];
        if (right === undefined || NOT_A_RESTRICTED_FIELD.some((e) => e.path === field.path))
          return [];
        const declared = restrictedFieldsOf(field.schema).find((entry) => entry.path === '');
        return declared?.right === right
          ? []
          : [`${field.operationId}: ${field.path} should be restricted by ${right}`];
      });

      expect([...new Set(wrong)].sort()).toEqual([]);
    });
  },
);

describe('the allow-list of fields described as absent', () => {
  it('gives a reason to every entry and holds no entry that no field uses', () => {
    const everyField = [...fieldsOfApi(storefrontApi), ...fieldsOfApi(studioApi)];
    for (const entry of NOT_A_RESTRICTED_FIELD) {
      expect(entry.reason.length).toBeGreaterThan(20);
      expect(
        everyField.some(
          (field) =>
            field.path === entry.path &&
            ABSENT_WITHOUT_RIGHT.test(descriptionOf(field.schema)) &&
            restrictedFieldsOf(field.schema).length === 0,
        ),
      ).toBe(true);
    }
  });
});
