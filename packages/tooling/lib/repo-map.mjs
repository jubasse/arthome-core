// The repository map (D-061) — the generator both bins share.
//
// It reads the INSTALLED declarations of each shared @arthome/* package, reached through the
// package's `exports` map and never by globbing `dist/`, and renders one markdown artefact.
// The freshness gate parses that artefact back and compares STRUCTURE, not text.
//
// WHAT IT READS
//   - for each shared package: `node_modules/@arthome/<name>` of the consuming repository, or,
//     in the repository that publishes it, the workspace package under `packages/<name>`;
//   - the `types` target of each `exports` subpath, and every name TypeScript resolves as
//     exported from that entry (`export *` and re-exports included);
//   - the directory tree (`git ls-files`, ignored paths excluded), against the PURPOSE registry.
//
// WHERE IT STOPS
//   - it reads DECLARATIONS. A name that exists at runtime and not in the `.d.ts` is invisible;
//     a `.d.ts` that lies (hand-edited dist) is trusted. It maps what the package SAYS it exports;
//   - it does not say what a name MEANS beyond the first sentence of its own JSDoc;
//   - a declaration longer than DETAIL_MAX is listed by kind only: read the `.d.ts`;
//   - subpaths without a `types` target (JSON files, wildcard patterns) are LISTED as unmapped,
//     never silently dropped;
//   - the PURPOSE registry is the one hand-written part: the generator can prove a directory is
//     covered and that an entry has a directory, never that the sentence is true.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export const MAP_FILE = 'REPOSITORY_MAP.md';
export const PURPOSE_FILE = 'repo-map.purposes.json';
/** Packages that are configuration for the build, not API a consumer calls. */
export const EXCLUDED_PACKAGES = new Set(['@arthome/tooling']);
const DETAIL_MAX = 160;
const SUMMARY_MAX = 140;

export class NotRun extends Error {}

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const collapse = (s) => s.replace(/\s+/g, ' ').trim();
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ------------------------------------------------------------- finding packages
/** Names of the shared packages this repository consumes or publishes. */
function packageNames(cwd) {
  const names = new Set();
  const root = readJson(path.join(cwd, 'package.json'));
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const n of Object.keys(root[field] ?? {})) if (n.startsWith('@arthome/')) names.add(n);
  }
  for (const pj of fs.globSync('packages/*/package.json', { cwd })) {
    const j = readJson(path.join(cwd, pj));
    if (typeof j.name === 'string' && j.name.startsWith('@arthome/') && j.private !== true)
      names.add(j.name);
  }
  for (const n of EXCLUDED_PACKAGES) names.delete(n);
  return [...names].sort(cmp);
}

function locate(cwd, name) {
  const installed = path.join(cwd, 'node_modules', name);
  if (fs.existsSync(path.join(installed, 'package.json'))) {
    return { dir: fs.realpathSync(installed), origin: `node_modules/${name}` };
  }
  for (const pj of fs.globSync('packages/*/package.json', { cwd })) {
    if (readJson(path.join(cwd, pj)).name === name) {
      return { dir: path.join(cwd, path.dirname(pj)), origin: `workspace ${path.dirname(pj)}` };
    }
  }
  throw new NotRun(`${name} is neither installed under node_modules/ nor a workspace package.`);
}

/** The `types` file of one exports entry, or null. */
function typesTarget(entry) {
  if (typeof entry === 'string') return entry.endsWith('.d.ts') ? entry : null;
  if (entry && typeof entry === 'object') {
    if (typeof entry.types === 'string') return entry.types;
    for (const v of Object.values(entry)) {
      const t = typesTarget(v);
      if (t) return t;
    }
  }
  return null;
}

// ------------------------------------------------------------ reading the .d.ts
function loadTypeScript(cwd) {
  const req = createRequire(path.join(cwd, 'noop.js'));
  try {
    return req(req.resolve('typescript'));
  } catch {
    throw new NotRun('typescript is not installed: the declarations cannot be read.');
  }
}

function kindOf(ts, sym) {
  const f = sym.flags;
  const kinds = [];
  if (f & ts.SymbolFlags.Function) kinds.push('function');
  if (f & ts.SymbolFlags.Class) kinds.push('class');
  if (f & ts.SymbolFlags.Enum) kinds.push('enum');
  if (f & ts.SymbolFlags.Interface) kinds.push('interface');
  if (f & ts.SymbolFlags.TypeAlias) kinds.push('type');
  if (f & ts.SymbolFlags.Variable) kinds.push('const');
  if (f & ts.SymbolFlags.NamespaceModule && !kinds.length) kinds.push('namespace');
  return kinds.length ? kinds.join('+') : 'value';
}

function summaryOf(ts, sym) {
  const text = ts.displayPartsToString(sym.getDocumentationComment(undefined)).trim();
  if (!text) return '';
  const para = collapse(text.split(/\n\s*\n/)[0]);
  const sentence = para.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? para;
  const s = sentence.replaceAll('`', "'").replaceAll('|', '/');
  return s.length > SUMMARY_MAX ? `${s.slice(0, SUMMARY_MAX - 1)}…` : s;
}

function detailOf(ts, sym, pkgDir) {
  const decls = (sym.declarations ?? []).filter(
    (d) => !path.relative(pkgDir, d.getSourceFile().fileName).startsWith('..'),
  );
  if (!decls.length) return '';
  const wanted = decls.filter((d) => !ts.isInterfaceDeclaration(d) && !ts.isClassDeclaration(d));
  const text = wanted
    .map((d) => collapse(d.getText()).replace(/^(export )?(declare )?/, ''))
    .join(' ');
  return text.length > DETAIL_MAX ? '' : text;
}

/** { specifier -> [{name, kind, detail, summary}] } for one package's subpaths. */
function readPackage(ts, cwd, name) {
  const { dir, origin } = locate(cwd, name);
  const pkg = readJson(path.join(dir, 'package.json'));
  if (!pkg.exports || typeof pkg.exports !== 'object')
    throw new NotRun(`${name} has no \`exports\` map: nothing is reachable to map.`);
  const subpaths = [];
  const unmapped = [];
  for (const [key, entry] of Object.entries(pkg.exports)) {
    if (key === './package.json') continue;
    const target = typesTarget(entry);
    if (key.includes('*')) unmapped.push(`${key} (wildcard pattern: not enumerated)`);
    else if (!target) unmapped.push(`${key} (no \`types\` target: not a TypeScript entry)`);
    else subpaths.push({ key, file: path.resolve(dir, target) });
  }
  for (const s of subpaths) {
    if (!fs.existsSync(s.file))
      throw new NotRun(
        `${name} subpath ${s.key} points at ${path.relative(cwd, s.file)}, which does not exist. ` +
          'Build the package (or install it) before mapping.',
      );
  }
  const program = ts.createProgram(
    subpaths.map((s) => s.file),
    {
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: [],
    },
  );
  const checker = program.getTypeChecker();
  const out = [];
  for (const s of subpaths) {
    const sf = program.getSourceFile(s.file);
    const modSym = sf && checker.getSymbolAtLocation(sf);
    const entries = [];
    for (const sym of modSym ? checker.getExportsOfModule(modSym) : []) {
      const real = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
      entries.push({
        name: sym.name,
        kind: kindOf(ts, real),
        detail: detailOf(ts, real, dir),
        summary: summaryOf(ts, real),
      });
    }
    // AN EMPTY SUBPATH IS NOT AN EMPTY MAP. An uninstalled dependency yields an
    //   empty map that compares equal and passes, which is worth refusing; a `.d.ts`
    //   that parses cleanly and exports nothing is a FACT about the package, and this
    //   repository grew eight of those in one commit. So the test is whether the
    //   DECLARATION FILE was found: no file is "did not run", no exports is zero.
    if (!entries.length && !modSym)
      throw new NotRun(
        `${name}${s.key.slice(1)} has no readable declarations. Refusing an empty map.`,
      );
    entries.sort((a, b) => cmp(a.name, b.name));
    const specifier = s.key === '.' ? name : `${name}${s.key.slice(1)}`;
    out.push({ specifier, subpath: s.key, target: path.relative(dir, s.file), entries });
  }
  out.sort((a, b) => cmp(a.specifier, b.specifier));
  return {
    name,
    version: pkg.version,
    origin,
    hasRoot: '.' in pkg.exports,
    subpaths: out,
    unmapped,
  };
}

// ----------------------------------------------------------------- local tree
/** Directories that must carry a purpose: top level, packages/*, packages/*\/*, packages/*\/src/*. */
export function trackedDirectories(cwd) {
  let files;
  try {
    files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
      cwd,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
  } catch {
    throw new NotRun('`git ls-files` failed: the local tree cannot be listed.');
  }
  const dirs = new Set();
  for (const f of files) {
    const p = f.split('/').slice(0, -1);
    if (p.length >= 1) dirs.add(p[0]);
    if (p[0] === 'packages') {
      if (p.length >= 2) dirs.add(p.slice(0, 2).join('/'));
      if (p.length >= 3 && p[2] !== 'dist') dirs.add(p.slice(0, 3).join('/'));
      if (p.length >= 4 && p[2] === 'src') dirs.add(p.slice(0, 4).join('/'));
    }
  }
  return [...dirs].sort(cmp);
}

function readPurposes(cwd, dirs, problems) {
  const file = path.join(cwd, PURPOSE_FILE);
  if (!fs.existsSync(file)) {
    problems.push(`${PURPOSE_FILE} is missing: the local tree has no purposes.`);
    return {};
  }
  const reg = readJson(file);
  const purposes = {};
  for (const [k, v] of Object.entries(reg)) {
    if (k.startsWith('_')) continue;
    const key = k.replace(/\/$/, '');
    purposes[key] = v;
    if (typeof v !== 'string' || !v.trim())
      problems.push(`${PURPOSE_FILE}: "${k}" has an empty purpose.`);
    if (!dirs.includes(key))
      problems.push(
        `${PURPOSE_FILE}: "${k}" names a directory that is not in the tracked tree (renamed? removed?).`,
      );
  }
  for (const d of dirs)
    if (!(d in purposes)) problems.push(`${d}/ has no entry in ${PURPOSE_FILE}.`);
  return purposes;
}

// ---------------------------------------------------------------------- render
export function generate(cwd) {
  const ts = loadTypeScript(cwd);
  const names = packageNames(cwd);
  if (!names.length) throw new NotRun('no shared @arthome/* package found: nothing to map.');
  const packages = names.map((n) => readPackage(ts, cwd, n));
  const dirs = trackedDirectories(cwd);
  const registryProblems = [];
  const purposes = readPurposes(cwd, dirs, registryProblems);

  const L = [];
  L.push('# Repository map', '');
  L.push(
    '> GENERATED by `arthome-generate-map` — DO NOT EDIT. `pnpm run check:map` fails when this file',
    '> differs from what regenerating would produce. To change a purpose, edit `' +
      PURPOSE_FILE +
      '`.',
    '',
  );
  L.push('## Generated against', '');
  for (const p of packages) L.push(`- \`${p.name}\` ${p.version} — read from ${p.origin}`);
  L.push('', 'This map is true for exactly these versions.', '');
  L.push('## Shared packages', '');
  L.push(
    "Only what is reachable through each package's `exports` map, organised by import specifier. With no",
    'barrel, a name without its subpath is unusable: import from the specifier under which it is listed.',
    'A declaration longer than 160 characters is listed by kind only — read the `.d.ts`.',
    '',
  );
  for (const p of packages) {
    L.push(`### ${p.name}`, '');
    if (!p.hasRoot)
      L.push(
        `\`${p.name}\` has NO root entry: \`import ... from '${p.name}'\` does not resolve.`,
        '',
      );
    for (const s of p.subpaths) {
      L.push(`#### ${s.specifier}`, '');
      L.push(`Declarations: \`${s.target}\` — ${s.entries.length} exported names.`, '');
      for (const e of s.entries) {
        let line = `- \`${e.name}\` (${e.kind})`;
        if (e.detail) line += ` — \`${e.detail.replaceAll('`', "'")}\``;
        if (e.summary) line += ` — ${e.summary}`;
        L.push(line);
      }
      L.push('');
    }
    if (p.unmapped.length) {
      L.push(`##### Not mapped (${p.name})`, '');
      for (const u of p.unmapped)
        L.push(`- \`${u.split(' ')[0]}\` — ${u.slice(u.indexOf(' ') + 1)}`);
      L.push('');
    }
  }
  L.push('## Local tree', '');
  L.push(
    'Tracked or not-yet-ignored directories only. Purposes are hand-written in `' +
      PURPOSE_FILE +
      '`; the generator proves',
    'each directory is covered and each entry has a directory, not that the sentence is true.',
    '',
  );
  for (const d of dirs) if (purposes[d]) L.push(`- \`${d}/\` — ${purposes[d]}`);
  L.push('');

  const coverage = {
    packages: packages.length,
    subpaths: packages.reduce((n, p) => n + p.subpaths.length, 0),
    names: packages.reduce((n, p) => n + p.subpaths.reduce((m, s) => m + s.entries.length, 0), 0),
    directories: dirs.length,
    unmapped: packages.reduce((n, p) => n + p.unmapped.length, 0),
    specifiers: packages.flatMap((p) => p.subpaths.map((s) => s.specifier)),
  };
  return { markdown: L.join('\n'), coverage, registryProblems };
}

// ---------------------------------------------------------------------- parsing
/**
 * Parses the artefact into structure: heading path -> { bullets: Map(key -> rest), prose: Set }.
 * Comparing this, not the text, means heading order, blank lines and bullet order are not
 * differences — and a real one (a name, a kind, a signature, a purpose, a version) always is.
 */
export function parseMap(md) {
  const sections = new Map();
  const stack = [];
  let cur = null;
  const open = (key) => {
    if (!sections.has(key)) sections.set(key, { bullets: new Map(), prose: new Set() });
    cur = sections.get(key);
  };
  open('');
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const h = line.match(/^(#{1,6}) (.*)$/);
    if (h) {
      stack.length = h[1].length - 1;
      stack[h[1].length - 1] = h[2];
      open(stack.join(' / '));
      continue;
    }
    const b = line.match(/^- `([^`]+)`(.*)$/);
    if (b) cur.bullets.set(b[1], collapse(b[2]));
    else cur.prose.add(collapse(line));
  }
  return sections;
}

export function diffMaps(committed, fresh) {
  const out = [];
  for (const [k, f] of fresh) {
    const c = committed.get(k);
    const at = k || '(preamble)';
    if (!c) {
      out.push(`section missing from the committed map: ${at}`);
      continue;
    }
    for (const [name, rest] of f.bullets) {
      if (!c.bullets.has(name))
        out.push(`${at}: \`${name}\` is exported now and absent from the map`);
      else if (c.bullets.get(name) !== rest)
        out.push(
          `${at}: \`${name}\` changed\n        committed:${c.bullets.get(name)}\n        current:  ${rest}`,
        );
    }
    for (const name of c.bullets.keys())
      if (!f.bullets.has(name)) out.push(`${at}: \`${name}\` is in the map and no longer exists`);
    for (const p of f.prose) if (!c.prose.has(p)) out.push(`${at}: line differs — "${p}"`);
    for (const p of c.prose)
      if (!f.prose.has(p)) out.push(`${at}: committed line not generated — "${p}"`);
  }
  for (const k of committed.keys())
    if (!fresh.has(k))
      out.push(
        `section in the committed map that regenerating no longer produces: ${k || '(preamble)'}`,
      );
  return out;
}
