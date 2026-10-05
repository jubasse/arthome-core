import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '..');
const folder = resolve(
  import.meta.dirname,
  '../packages/contracts/src/studio-api/contract-types-fixture',
);
const schemasFile = resolve(folder, 'schemas.ts');

const FIXTURE = `import { z } from 'zod';

import { LOCALES } from '@arthome/core';
import { vocabularyIn } from '@arthome/core/schema';

import { studioConventions } from '../components.js';

export const KeyedSchema = z.object({ Deleted: z.string(), Acknowledged: z.number().optional() });

export const LocaleSchema = vocabularyIn(LOCALES);

export const ConventionItemSchema = studioConventions.item(KeyedSchema);

export const SentenceSchema = z.object({ kind: z.literal('the Deleted item ends') });
`;

describe('contract-types --schemas', () => {
  let written;

  beforeAll(() => {
    mkdirSync(folder, { recursive: true });
    writeFileSync(schemasFile, FIXTURE);
    execFileSync('node', ['tools/contract-types.mjs', '--schemas', schemasFile], {
      cwd: repository,
    });
    written = readFileSync(schemasFile, 'utf8');
  }, 120_000);

  afterAll(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it('does not import a property key as if it named a type', () => {
    expect(written).toContain('Deleted: z.ZodString');
    expect(written).not.toMatch(/import type \{[^}]*\b(Deleted|Acknowledged)\b[^}]*\} from/);
  });

  it('does not import a word found inside a string literal', () => {
    expect(written).toContain("z.ZodLiteral<'the Deleted item ends'>");
    expect(written).not.toMatch(/import type \{[^}]*\bDeleted\b[^}]*\} from/);
  });

  it('names a short tuple type by the constant that holds it', () => {
    expect(written).toContain('LocaleSchema: VocabularyIn<typeof LOCALES>');
  });

  it('prints a usable type for a schema built by a conventions item', () => {
    expect(written).toContain('z.core.$ZodTypeInternals<unknown, unknown>');
    expect(written).not.toContain('$z.');
  });
});
