import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const checkEnums = resolve(import.meta.dirname, '../packages/tooling/bin/check-enums.mjs');

describe('arthome-check-enums', () => {
  let repository;

  beforeAll(() => {
    repository = mkdtempSync(join(tmpdir(), 'check-enums-'));
    mkdirSync(join(repository, 'packages/core/src'), { recursive: true });
    mkdirSync(join(repository, 'src'));
    writeFileSync(
      join(repository, 'packages/core/src/vocabulary.ts'),
      "export const REPLAY_POLICIES = ['replay-policy', 'exports'] as const;\n",
    );
  });

  afterAll(() => {
    rmSync(repository, { recursive: true, force: true });
  });

  const run = (source) => {
    writeFileSync(join(repository, 'src/routes.ts'), source);
    const result = spawnSync('node', [checkEnums, '--quiet'], {
      cwd: repository,
      encoding: 'utf8',
    });
    return { status: result.status, report: result.stderr };
  };

  it('skips the path segments given to the route builder', () => {
    const { status } = run(
      [
        "const a = builder.resource('exports', { id });",
        "const b = a.single('replay-policy');",
        'const c = a.path("exports");',
        "const d = a.action('replay-policy');",
        "const e = a.collectionAction('exports');",
        "const f = a.subresource('replay-policy');",
      ].join('\n'),
    );
    expect(status).toBe(0);
  });

  it('still reports the same value anywhere else', () => {
    const { status, report } = run("const policy = 'replay-policy';\n");
    expect(status).toBe(1);
    expect(report).toContain("'replay-policy'");
  });

  it('does not extend the skip past the call', () => {
    const { status } = run("const a = single('x').find({ policy: 'exports' });\n");
    expect(status).toBe(1);
  });
});
