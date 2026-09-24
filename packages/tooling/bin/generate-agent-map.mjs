#!/usr/bin/env node
// arthome-generate-agent-map — the SHORT map, the one an agent reads before
// writing anything.
//
// WHY A SECOND MAP RATHER THAN A SHORTER FIRST ONE
//   `REPOSITORY_MAP.md` is 704 lines and it answers "what exists": every
//   exported name, its kind, its signature when short. That is the right
//   artefact for a freshness gate and the wrong one to hand somebody who is
//   about to write a schema — most of its entries carry no description at all,
//   because a declaration without a doc comment has nothing to say.
//
//   The question this one answers is the one that cost real time: WHAT IS
//   ALREADY THERE, AND WHEN DO I REACH FOR IT. On the day the contracts were
//   written, ten modules independently wrote the same `instant()` helper and
//   four wrote the same local-vocabulary helper — not because anybody was
//   careless, but because nothing told them the export existed.
//
// IT IS DERIVED FROM THE LONG MAP, NOT FROM TYPESCRIPT
//   One source of truth, and one freshness check: `check:map` already fails
//   when the long map is stale, so a short map generated from it cannot be
//   fresher or staler than the thing already guarded.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CWD = process.cwd();
const LONG = path.join(CWD, 'REPOSITORY_MAP.md');
const OUT = path.join(CWD, 'packages', 'tooling', 'docs', 'available-surface.md');

// ⚠ HAND-WRITTEN, AND IT NAMES A SUBPATH RATHER THAN A SYMBOL ON PURPOSE.
//   A preamble listing individual helpers would be a parallel table: rename one
//   and this goes quietly wrong. Pointing at the subpath keeps the names in the
//   generated list below, where they are true by construction.
const PREAMBLE = [
  '## Before you write a helper, look here',
  '',
  'Nearly everything a boundary needs is already exported, and the day these contracts were',
  'written **ten modules independently wrote the same `instant()` and four wrote the same',
  'local-vocabulary helper**. None of them was careless; nothing told them the export existed.',
  '',
  '- **`@arthome/core/schema`** — the wire primitives and the vocabulary helpers. An instant, a',
  '  uuid, a 64-bit integer, a tolerant vocabulary, a contract-local one. If you are about to',
  '  write `z.string().meta({ format: ... })`, it is already there.',
  '- **`@arthome/core`** — the domain: the vocabularies, the named members, the rules. Never copy',
  "  a vocabulary's value into a schema; import the member.",
  '- **`@arthome/contracts/*`** — one subpath per bounded context. A shape that crosses a boundary',
  '  exists here already or belongs here.',
  '',
  '⚠ **A name ending in `In` or `Out` says which direction it is for**, and the two are not',
  'interchangeable: `In` is strict because a request can be wrong, `Out` is tolerant because a',
  'client a year old must not reject a payload over a value it has never seen.',
  '',
];

function main() {
  if (!fs.existsSync(LONG)) {
    console.error('arthome-generate-agent-map: REPOSITORY_MAP.md not found. Generate it first.');
    return 1;
  }
  const lines = fs.readFileSync(LONG, 'utf8').split('\n');

  const sections = [];
  const skipped = [];
  let current = null;
  for (const line of lines) {
    const head = /^#### (.+)$/.exec(line);
    if (head) {
      current = { specifier: head[1].trim(), names: [] };
      sections.push(current);
      continue;
    }
    if (/^### /.test(line) || /^## /.test(line)) current = null;
    // ⚠ `[\w+]`, NOT `\w`. The kind can be `type+const`, and that is not an edge
    //   case: `type+const` IS the vocabulary pattern -- ChatMode, CrewRole,
    //   ApiErrorCode. A `\w+` here dropped 55 names, every one of them an
    //   enumeration, from the document whose whole purpose is stopping people
    //   from writing a second one. Caught by comparing this count against
    //   check-map's: 488 against 543.
    const entry = /^- `([A-Za-z_$][\w$]*)` \(([\w+]+)\)/.exec(line);
    if (entry && current) current.names.push(entry[1]);
    else if (current && line.startsWith('- `')) skipped.push(line.trim().slice(0, 80));
  }

  // A DROPPED NAME IS THIS DOCUMENT'S ONLY REAL FAILURE. It cannot be wrong in
  // an interesting way -- it can only be incomplete, and an incomplete list of
  // what exists reads exactly like a complete one. So every entry line under a
  // subpath heading must parse, and anything that does not stops the build
  // rather than quietly shortening the map.
  if (skipped.length) {
    console.error(
      `arthome-generate-agent-map: ${skipped.length} entry line(s) did not parse. ` +
        `REPOSITORY_MAP.md's format changed and this parser did not follow:`,
    );
    for (const line of skipped.slice(0, 10)) console.error(`  ${line}`);
    return 1;
  }

  // The purpose of each subpath, from the one hand-written file that already
  // holds them. `@arthome/contracts/catalog` is `packages/contracts/src/catalog`
  // — the same directory the long map already asks for a purpose for, so there
  // is no second place to keep in step.
  const purposes = (() => {
    const file = path.join(CWD, 'repo-map.purposes.json');
    if (!fs.existsSync(file)) return {};
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const flat = Object.values(raw).every((v) => typeof v === 'string')
      ? raw
      : (Object.values(raw).find((v) => v && typeof v === 'object') ?? {});
    const out = {};
    for (const [dir, text] of Object.entries(flat)) {
      const m = /^packages\/(core|contracts)\/src(?:\/(.+))?$/.exec(dir);
      if (!m) continue;
      out[`@arthome/${m[1]}${m[2] ? `/${m[2]}` : ''}`] = text;
    }
    return out;
  })();

  const out = [
    '# What `@arthome/*` gives you',
    '',
    '> GENERATED by `arthome-generate-agent-map` from `REPOSITORY_MAP.md`. DO NOT EDIT.',
    '> The long map lists every declaration; this one answers "what is already there, and when do',
    '> I reach for it". `pnpm run check:map` guards the long one, so this is exactly as fresh.',
    '',
    ...PREAMBLE,
    '## The surface, by import specifier',
    '',
  ];
  for (const s of sections) {
    if (!s.names.length) continue;
    const purpose = purposes[s.specifier];
    out.push(`### \`${s.specifier}\``, '');
    if (purpose) out.push(purpose, '');
    out.push(s.names.map((n) => `\`${n}\``).join(' · '), '');
  }
  const total = sections.reduce((n, s) => n + s.names.length, 0);
  out.push(
    '---',
    '',
    `${total} exported names across ${sections.filter((s) => s.names.length).length} subpaths.`,
    'A name is listed here only if it is reachable through a package’s `exports` map — if it is',
    'not in this file, a consumer cannot import it, whatever the source says.',
    '',
  );

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out.join('\n'));
  console.log(
    `arthome-generate-agent-map: ${total} name(s), ` +
      `${sections.filter((s) => s.names.length).length} subpath(s) -> ` +
      `${path.relative(CWD, OUT)} (${out.length} lines, from ${lines.length})`,
  );
  return 0;
}

process.exit(main());
