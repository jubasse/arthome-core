#!/usr/bin/env node
// arthome-check-tsconfig — les verrous tsconfig n'ont pas ete desserres.
//
// Lire les tsconfig.json des sept depots ne prouve rien : c'est la configuration
// RESOLUE qui s'execute, et un `extends` se contourne d'une ligne locale. Le
// controle porte donc sur le resultat de la resolution.
//
// Deux modes :
//   · si `tsc` est resolvable, on lui demande `--showConfig` — c'est la reference ;
//   · sinon, on resout la chaine d'`extends` soi-meme (JSON avec commentaires,
//     resolution par nom de paquet comprise). Le repli existe pour que la porte
//     tourne AVANT que typescript soit installe : une porte qui attend une
//     installation pour exister n'est pas une porte.
//
// Elle verifie aussi ce que `--showConfig` ne dira jamais : que les trois
// fichiers de base de @arthome/tooling ne portent AUCUNE option de chemin. Les
// chemins relatifs d'un tsconfig etendu se resolvent depuis le fichier ou ils
// sont ecrits, donc depuis node_modules/@arthome/tooling/tsconfig/ — un
// include: ["src"] dans la base compilerait les sources de @arthome/tooling.
//
// Voir architecture/code-conventions.md sections 4.4.4, 4.5 et 4.5.1.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const CWD = process.cwd();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOCKS = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'tsconfig-locks.json'), 'utf8'));

const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const only = args.indexOf('--project');
const PROJECTS = only !== -1 && args[only + 1] ? [args[only + 1]] : null;

const problems = [];
const notes = [];

// ------------------------------------------------------------- JSON commente
// tsconfig accepte // et /* */ et les virgules trainantes. On ne peut donc pas
// se contenter de JSON.parse.
function parseJsonc(text) {
  let out = '';
  let i = 0;
  let inStr = false;
  let esc = false;
  while (i < text.length) {
    const c = text[i];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      i += 1;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}

const readJsonc = (p) => parseJsonc(fs.readFileSync(p, 'utf8'));

// --------------------------------------------- resolution de la chaine extends
function resolveExtends(spec, fromFile) {
  const fromDir = path.dirname(fromFile);
  if (spec.startsWith('.') || path.isAbsolute(spec)) {
    const direct = path.resolve(fromDir, spec);
    for (const cand of [direct, `${direct}.json`, path.join(direct, 'tsconfig.json')]) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
    }
    return null;
  }
  // Par nom de paquet. `extends` respecte le champ `exports` depuis la PR #50955
  // (TypeScript 5.0) ; createRequire fait la meme resolution.
  const require = createRequire(path.join(fromDir, 'noop.js'));
  try {
    return require.resolve(spec);
  } catch {
    // exports absent ou sous-chemin non expose : repli sur la racine du paquet,
    // qui est ce que TypeScript faisait AVANT la PR #50955.
    try {
      const parts = spec.split('/');
      const pkg = spec.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
      const rest = spec.slice(pkg.length + 1);
      const pkgJson = require.resolve(`${pkg}/package.json`);
      const cand = path.join(path.dirname(pkgJson), rest || 'tsconfig.json');
      if (fs.existsSync(cand)) {
        notes.push(
          `${path.relative(CWD, fromFile)} : "${spec}" resolu par repli sur la racine du paquet. ` +
            "Verifier que le sous-chemin est bien liste dans `exports` (extension .json comprise).",
        );
        return cand;
      }
    } catch {
      /* vraiment introuvable */
    }
    return null;
  }
}

/** Fusionne la chaine d'extends comme TypeScript le fait : base d'abord, enfant ensuite. */
function resolveConfig(file, seen = new Set()) {
  const abs = path.resolve(file);
  if (seen.has(abs)) {
    problems.push(`Cycle d'extends sur ${path.relative(CWD, abs)}.`);
    return { compilerOptions: {}, chain: [] };
  }
  seen.add(abs);
  const json = readJsonc(abs);
  let merged = { compilerOptions: {} };
  let chain = [];
  let broken = false;
  const parents = json.extends
    ? Array.isArray(json.extends)
      ? json.extends
      : [json.extends]
    : [];
  for (const spec of parents) {
    const target = resolveExtends(spec, abs);
    if (!target) {
      broken = true;
      const installed = fs.existsSync(path.join(CWD, 'node_modules'));
      problems.push(
        `${path.relative(CWD, abs)} : extends "${spec}" introuvable.` +
          (installed
            ? '\n      Dans un espace de travail pnpm, le paquet doit etre une dependance DIRECTE du depot :' +
              '\n      pnpm isole et ne remonte pas les dependances transitives.'
            : "\n      node_modules/ est absent : lancer `pnpm install` d'abord.") +
          '\n      ⚠ NE PAS recopier les options de la base dans ce fichier pour faire taire la porte :' +
          "\n        ce serait une table litterale parallele de plus (E2), et la base cesserait d'etre la source.",
      );
      continue;
    }
    const parent = resolveConfig(target, new Set(seen));
    if (parent.broken) broken = true;
    merged = { compilerOptions: { ...merged.compilerOptions, ...parent.compilerOptions } };
    chain = [...chain, ...parent.chain, path.relative(CWD, target)];
  }
  return {
    compilerOptions: { ...merged.compilerOptions, ...(json.compilerOptions ?? {}) },
    chain,
    broken,
    own: json,
  };
}

// ----------------------------------------------------- `tsc --showConfig`
const require0 = createRequire(path.join(CWD, 'noop.js'));

function viaTsc(project) {
  try {
    require0.resolve('typescript/package.json');
  } catch {
    return null; // typescript pas installe : on prendra le repli
  }
  try {
    const out = execFileSync(
      process.execPath,
      [
        require0.resolve('typescript/bin/tsc'),
        '-p',
        project,
        '--showConfig',
      ],
      { cwd: CWD, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return parseJsonc(out);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ controles
function checkOptions(label, opts) {
  for (const [name, spec] of Object.entries(LOCKS.locked)) {
    if (opts[name] !== spec.value) {
      problems.push(
        `${label} : ${name} = ${JSON.stringify(opts[name])}, verrouille a ${JSON.stringify(spec.value)}.` +
          `\n      ${spec.why}`,
      );
    }
  }
  for (const [name, why] of Object.entries(LOCKS.forbidden)) {
    if (name.startsWith('_')) continue;
    if (name in opts) {
      problems.push(`${label} : ${name} est interdit.\n      ${why}`);
    }
  }
  for (const [name, rule] of Object.entries(LOCKS.forbiddenValues)) {
    if (!(name in opts)) continue;
    const v = opts[name];
    if (rule.not.some((bad) => String(bad).toLowerCase() === String(v).toLowerCase())) {
      problems.push(`${label} : ${name} = ${JSON.stringify(v)} est interdit.\n      ${rule.why}`);
    }
  }
}

function checkScoped() {
  for (const [pattern, expected] of Object.entries(LOCKS.scoped)) {
    if (pattern.startsWith('_')) continue;
    let hits = [];
    try {
      hits = fs.globSync(pattern, { cwd: CWD });
    } catch {
      hits = [];
    }
    for (const h of hits) {
      const abs = path.join(CWD, h);
      const resolved = resolveConfig(abs);
      if (resolved.broken) continue;
      const { compilerOptions } = resolved;
      for (const [name, want] of Object.entries(expected)) {
        if (compilerOptions[name] !== want) {
          problems.push(
            `${h} : ${name} = ${JSON.stringify(compilerOptions[name])}, attendu ${JSON.stringify(want)}.`,
          );
        }
      }
    }
  }
}

/** Les trois fichiers de base ne portent aucun chemin. */
function checkBasesCarryNoPaths() {
  const spec = LOCKS.mustNotCarryPaths;
  let toolingDir = null;
  for (const cand of ['packages/tooling', 'node_modules/@arthome/tooling']) {
    if (fs.existsSync(path.join(CWD, cand, 'package.json'))) {
      toolingDir = path.join(CWD, cand);
      break;
    }
  }
  if (!toolingDir) {
    notes.push('@arthome/tooling introuvable : controle des fichiers de base saute.');
    return;
  }
  for (const rel of spec.files) {
    const abs = path.join(toolingDir, rel);
    if (!fs.existsSync(abs)) {
      problems.push(`@arthome/tooling/${rel} manquant.`);
      continue;
    }
    const json = readJsonc(abs);
    for (const key of spec.keys) {
      if (key in json) {
        problems.push(
          `@arthome/tooling/${rel} porte "${key}".\n      ${spec._why}`,
        );
      }
    }
    for (const key of spec.compilerOptions) {
      if (json.compilerOptions && key in json.compilerOptions) {
        problems.push(
          `@arthome/tooling/${rel} porte compilerOptions.${key}.\n      ${spec._why}`,
        );
      }
    }
    // stableTypeOrdering : uniquement dans lib.json, que seul TypeScript 6 lit.
    const hasSTO = json.compilerOptions && 'stableTypeOrdering' in json.compilerOptions;
    if (hasSTO && !rel.endsWith('lib.json')) {
      problems.push(
        `@arthome/tooling/${rel} porte stableTypeOrdering. Sous TypeScript 7 le tri ` +
          'deterministe est toujours actif et ne peut pas etre desactive : cette option ne ' +
          'doit vivre que dans lib.json, le seul fichier que TypeScript 7 ne lit jamais.',
      );
    }
  }
}

function findProjects() {
  if (PROJECTS) return PROJECTS;
  const out = [];
  for (const pattern of [
    'tsconfig.json',
    'packages/*/tsconfig.json',
    'packages/*/tsconfig.build.json',
    'services/*/tsconfig.json',
    'tools/*/tsconfig.json',
  ]) {
    try {
      out.push(...fs.globSync(pattern, { cwd: CWD }));
    } catch {
      /* rien */
    }
  }
  return [...new Set(out)];
}

// ---------------------------------------------------------------------- main
const projects = findProjects();
let mode = 'repli (resolution interne)';

for (const p of projects) {
  const abs = path.join(CWD, p);
  const fromTsc = viaTsc(p);
  if (fromTsc) mode = 'tsc --showConfig';
  if (fromTsc) {
    checkOptions(p, fromTsc.compilerOptions ?? {});
    continue;
  }
  const resolved = resolveConfig(abs);
  // ⚠ Chaine d'extends rompue : on N'ENCHAINE PAS sur les verrous. Signaler dix
  //   options manquantes quand la cause unique est un lien absent inviterait a
  //   les recopier dans le depot — c'est-a-dire a commettre exactement la faute
  //   que la base existe pour eviter. Une cause, un message.
  if (resolved.broken) {
    notes.push(`${p} : verrous non verifies — chaine d'extends rompue (voir ci-dessous).`);
    continue;
  }
  checkOptions(p, resolved.compilerOptions);
}

checkScoped();
checkBasesCarryNoPaths();

if (!QUIET) {
  console.log(
    `arthome-check-tsconfig : ${projects.length} projet(s) — mode ${mode}`,
  );
  if (projects.length) console.log(`  ${projects.join(', ')}`);
}
for (const n of notes) console.log(`  · ${n}`);

if (!projects.length) {
  console.error('⚠ aucun tsconfig.json trouve. PORTE INACTIVE.');
  process.exit(0);
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} verrou(s) desserre(s) :\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    '\n  La table des verrous est @arthome/tooling/tsconfig-locks.json — une seule, pour les sept depots.',
  );
  process.exit(1);
}
if (!QUIET) console.log('✓ verrous tsconfig intacts');
