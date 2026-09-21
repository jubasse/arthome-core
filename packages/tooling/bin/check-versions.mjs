#!/usr/bin/env node
// arthome-check-versions — les sept depots ne divergent pas en silence.
//
// Entre les sept depots il n'existe pas de catalogue pnpm : c'est la limite du
// multi-depots, et elle est assumee. Le substitut est une porte, pas un espoir.
// La table des versions attendues vit dans versions.json — UNE table, pas sept.
//
// Ce qu'elle verifie :
//   1. les versions DECLAREES dans les package.json du depot ;
//   2. les versions RESOLUES dans node_modules, quand il existe ;
//   3. l'absence des paquets proscrits (eslint-plugin-prettier & co.) ;
//   4. la version de Node en cours d'execution.
//
// Voir architecture/code-conventions.md sections 7.1 et 7.4.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const CWD = process.cwd();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TABLE = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'versions.json'), 'utf8'));

const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const repoArg = args.indexOf('--repo');
const REPO =
  repoArg !== -1 && args[repoArg + 1]
    ? args[repoArg + 1]
    : path.basename(CWD);

const problems = [];
const notes = [];

// ------------------------------------------------------------ semver minimal
// Assez pour comparer une version exacte et un plancher. Aucune dependance.
function parse(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v).replace(/^[\^~>=v ]+/, ''));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function cmp(a, b) {
  const x = parse(a);
  const y = parse(b);
  if (!x || !y) return null;
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}
/** Une specification est-elle un epinglage exact de `want` ? */
function isExact(spec, want) {
  return String(spec).trim() === String(want).trim();
}
/** Satisfait-elle une union de fourchettes `^a || ^b || >=c` ? (approximation sure) */
function satisfiesRange(version, range) {
  const v = parse(version);
  if (!v) return false;
  return String(range)
    .split('||')
    .some((part) => {
      const p = part.trim();
      const t = parse(p);
      if (!t) return false;
      if (p.startsWith('^')) return v[0] === t[0] && cmp(version, p) >= 0;
      if (p.startsWith('>=')) return cmp(version, p) >= 0;
      if (p.startsWith('~')) return v[0] === t[0] && v[1] === t[1] && cmp(version, p) >= 0;
      return cmp(version, p) === 0;
    });
}

// ------------------------------------------------ ce que le depot declare
function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function manifests() {
  const out = [];
  const root = readJson(path.join(CWD, 'package.json'));
  if (root) out.push({ file: 'package.json', json: root });
  for (const pattern of ['packages/*/package.json', 'services/*/package.json', 'apps/*/package.json']) {
    let hits = [];
    try {
      hits = fs.globSync(pattern, { cwd: CWD });
    } catch {
      hits = [];
    }
    for (const h of hits) {
      const j = readJson(path.join(CWD, h));
      if (j) out.push({ file: h, json: j });
    }
  }
  return out;
}

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

function declaredSpecs(all, name) {
  const found = [];
  for (const { file, json } of all) {
    for (const field of DEP_FIELDS) {
      const spec = json[field]?.[name];
      if (spec) found.push({ file, field, spec });
    }
  }
  return found;
}

/** Version attendue pour CE depot, exception nommee comprise. */
function expectedFor(entry) {
  if (entry.exceptions && Object.prototype.hasOwnProperty.call(entry.exceptions, REPO)) {
    return { version: entry.exceptions[REPO], exception: true };
  }
  return { version: entry.version, exception: false };
}

// ------------------------------------------------------------------ controles
function checkRegime(regime, label) {
  for (const [name, entry] of Object.entries(TABLE[regime])) {
    if (name.startsWith('_')) continue;
    if (entry.scope && !entry.scope.includes(REPO)) continue;

    const { version: want, exception } = expectedFor(entry);
    const declared = declaredSpecs(ALL, name);
    if (!declared.length) continue; // le depot ne s'en sert pas : rien a dire

    for (const d of declared) {
      // Une peerDependency exprime une fourchette : on ne lui demande pas d'etre
      // un epinglage exact, seulement de couvrir la version attendue.
      if (d.field === 'peerDependencies') {
        if (!satisfiesRange(want, d.spec)) {
          problems.push(
            `${d.file} → peerDependencies.${name} = "${d.spec}" ne couvre pas ${want} (regime ${label}).`,
          );
        }
        continue;
      }
      if (!isExact(d.spec, want)) {
        problems.push(
          `${d.file} → ${d.field}.${name} = "${d.spec}", attendu "${want}" ` +
            `(regime ${label}${exception ? `, exception nommee pour ${REPO}` : ''}).` +
            (entry.why ? `\n      ${entry.why}` : ''),
        );
      }
    }

    // Ce qui est reellement installe, si node_modules existe.
    const installed = readJson(path.join(CWD, 'node_modules', name, 'package.json'));
    if (installed && cmp(installed.version, want) !== 0) {
      problems.push(
        `node_modules/${name} resout ${installed.version}, attendu ${want}. ` +
          'Relancer `pnpm install`, puis `pnpm why ' + name + '`.',
      );
    }
  }
}

function checkForbidden() {
  for (const [name, why] of Object.entries(TABLE.forbidden)) {
    if (name.startsWith('_')) continue;
    const declared = declaredSpecs(ALL, name);
    for (const d of declared) {
      problems.push(`${d.file} → ${d.field}.${name} est PROSCRIT.\n      ${why}`);
    }
    if (fs.existsSync(path.join(CWD, 'node_modules', name, 'package.json'))) {
      notes.push(
        `${name} est present dans node_modules sans etre declare : dependance transitive d'un prereglage. ` +
          'Tolere, mais a verifier avec `pnpm why ' + name + '`.',
      );
    }
  }
}

function checkNode() {
  const { range, preferred, why } = TABLE.runtime.node;
  const current = process.versions.node;
  if (!satisfiesRange(current, range)) {
    problems.push(`Node ${current} hors de la fourchette requise ${range}.\n      ${why}`);
  } else if (cmp(current, preferred) !== 0) {
    notes.push(`Node ${current} satisfait ${range} (preferee : ${preferred}).`);
  }
  const nvmrc = path.join(CWD, '.nvmrc');
  if (fs.existsSync(nvmrc)) {
    const pinned = fs.readFileSync(nvmrc, 'utf8').trim();
    if (parse(pinned) && !satisfiesRange(pinned, range)) {
      problems.push(`.nvmrc epingle ${pinned}, hors de ${range}.`);
    }
  }
}

function checkPackageManager() {
  const root = ALL.find((m) => m.file === 'package.json');
  const pm = root?.json?.packageManager;
  if (!pm) {
    notes.push(
      'package.json sans champ "packageManager" : Corepack ne garantit plus la version de pnpm.',
    );
    return;
  }
  const m = /^pnpm@(.+)$/.exec(pm);
  if (!m) {
    problems.push(`packageManager = "${pm}" : le gestionnaire de paquets est pnpm.`);
    return;
  }
  if (!satisfiesRange(m[1], TABLE.runtime.pnpm.range)) {
    problems.push(`packageManager = "${pm}", attendu pnpm ${TABLE.runtime.pnpm.range}.`);
  }
}

// ---------------------------------------------------------------------- main
const ALL = manifests();
if (!ALL.length) {
  console.error('✗ arthome-check-versions : aucun package.json trouve depuis ' + CWD);
  process.exit(2);
}

checkRegime('A', 'A — contrat');
checkRegime('B', 'B — outillage');
checkForbidden();
checkNode();
checkPackageManager();

if (!QUIET) {
  console.log(
    `arthome-check-versions : depot ${REPO}, ${ALL.length} manifeste(s), ` +
      `table verifiee le ${TABLE.verifiedOn}`,
  );
}
for (const n of notes) console.log(`  · ${n}`);

if (problems.length) {
  console.error(`\n✗ ${problems.length} ecart(s) de version :\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    '\n  La table de reference est @arthome/tooling/versions.json — une seule, pour les sept depots.',
  );
  console.error('  Si la table a vieilli, la corriger LA (code-conventions.md section 7.5),');
  console.error("  jamais le package.json d'un depot en particulier.");
  process.exit(1);
}
if (!QUIET) console.log('✓ versions alignees');
