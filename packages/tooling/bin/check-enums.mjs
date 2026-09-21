#!/usr/bin/env node
// arthome-check-enums — la porte contre E2, la faute dominante du projet.
//
// E2 : la TABLE LITTERALE PARALLELE. Commise sur huit champs par cinq maquettes,
// malgre un principe explicite qui l'interdisait. La lecon est que le principe ne
// suffit pas — il faut une porte. Celle-ci.
//
// CE QU'ELLE FAIT
//   1. decouvre, dans les SOURCES du paquet declarant, toutes les constantes
//      exportees de la forme `export const NAME = ['a', 'b'] as const` ;
//   2. parcourt les sources du depot ;
//   3. signale toute chaine litterale appartenant a l'une de ces enumerations,
//      hors du module qui la declare.
//
// ⚠ ELLE NE PORTE AUCUNE LISTE D'ENUMERATIONS, ET NE DOIT JAMAIS EN PORTER.
//   Une premiere redaction de la specification donnait la liste en dur
//   (CHAT_MODES, PUBLICATION_STATES, ...) : c'etait une table parallele de plus,
//   la liste des enumerations recopiee a cote des enumerations. Une enumeration
//   nouvelle est couverte le jour ou elle est declaree, sans que personne ait a
//   l'inscrire quelque part.
//
// ⚠ ELLE LIT LES SOURCES, PAS LE PAQUET CONSTRUIT. Importer @arthome/core
//   exigerait qu'il soit compile et installe ; lire `src/**/*.ts` fonctionne des
//   le premier jour, sans build, sans runtime, sans resolution de module.
//   (La specification disait << importe depuis @arthome/core >> ; c'est le seul
//   ecart d'implementation, et il est dans le sens de la robustesse.)
//
// Voir architecture/code-conventions.md section 5.3.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CWD = process.cwd();

// ---------------------------------------------------------------- arguments
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const QUIET = args.includes('--quiet');

// ------------------------------------------------- ou vivent les enumerations
// Ordre de recherche, du plus explicite au plus devinable.
function findEnumSources() {
  const explicit = opt('source', process.env.ARTHOME_ENUM_SOURCE);
  const candidates = explicit
    ? [explicit]
    : [
        'packages/core/src',
        '../core/src',
        'node_modules/@arthome/core/src',
        'node_modules/@arthome/core/dist',
      ];
  for (const c of candidates) {
    const abs = path.resolve(CWD, c);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) return abs;
  }
  return null;
}

// --------------------------------------------------------- lecture des sources
function listFiles(root, patterns) {
  const out = new Set();
  for (const p of patterns) {
    let hits = [];
    try {
      hits = fs.globSync(p, { cwd: root });
    } catch {
      hits = [];
    }
    for (const h of hits) out.add(path.resolve(root, h));
  }
  return [...out].filter((f) => {
    try {
      return fs.statSync(f).isFile();
    } catch {
      return false;
    }
  });
}

// Retire commentaires de ligne et de bloc, pour ne pas signaler une valeur citee
// dans une explication. Naif mais suffisant : on ne cherche pas a parser.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(Math.max(0, m.length - p1.length)));
}

// ------------------------------------------------------- 1. decouvrir les enums
// `export const NAME = [ ... ] as const`  —  NAME en SCREAMING_SNAKE_CASE.
const DECL = /export\s+const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+?)?=\s*\[([\s\S]*?)\]\s*as\s+const/g;
const STRING_IN_ARRAY = /'([^'\\\r\n]*)'|"([^"\\\r\n]*)"/g;

function discoverEnums(sourceRoot) {
  const files = listFiles(sourceRoot, ['**/*.ts', '**/*.mts']).filter(
    (f) => !f.endsWith('.d.ts') && !/\.spec\.|\.test\./.test(f),
  );
  /** @type {Map<string, {constant: string, file: string}>} */
  const byValue = new Map();
  const constants = [];
  for (const file of files) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    for (const m of src.matchAll(DECL)) {
      const [, name, body] = m;
      const values = [];
      for (const v of body.matchAll(STRING_IN_ARRAY)) {
        const value = v[1] ?? v[2];
        if (value) values.push(value);
      }
      if (!values.length) continue;
      constants.push({ name, file, values });
      for (const value of values) {
        if (!byValue.has(value)) byValue.set(value, { constant: name, file });
      }
    }
  }
  return { byValue, constants, declaringFiles: new Set(constants.map((c) => c.file)) };
}

// ------------------------------------------------------------ 2. l'allow-list
function loadAllow() {
  const file = path.resolve(CWD, opt('allow', 'tools/enum-literals.allow.json'));
  if (!fs.existsSync(file)) return { entries: [], file };
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const entries = Array.isArray(raw) ? raw : (raw.allow ?? []);
  for (const e of entries) {
    if (!e.reason) {
      console.error(`✗ ${path.relative(CWD, file)} : une entree sans "reason" (${JSON.stringify(e)}).`);
      process.exit(2);
    }
  }
  return { entries, file };
}

function isAllowed(entries, relFile, value) {
  return entries.some((e) => {
    const fileOk = !e.file || relFile === e.file || relFile.startsWith(e.file.replace(/\*+$/, ''));
    const valueOk = !e.value || e.value === value;
    return fileOk && valueOk;
  });
}

// --------------------------------------------------------------- 3. le balayage
const SCAN = [
  'src/**/*.ts',
  'src/**/*.tsx',
  'src/**/*.js',
  'src/**/*.jsx',
  'app/**/*.ts',
  'app/**/*.tsx',
  'packages/*/src/**/*.ts',
  'services/*/src/**/*.ts',
];
const SKIP = /(^|\/)(node_modules|dist|build|coverage|generated)(\/|$)|\.spec\.|\.test\.|\.d\.ts$/;

function main() {
  const sourceRoot = findEnumSources();
  if (!sourceRoot) {
    // @arthome/core n'existe pas encore. On le DIT, bruyamment, plutot que de
    // rendre 0 en silence : une porte qui passe toujours n'est pas une porte.
    console.error('⚠ arthome-check-enums : aucune source d\'enumerations trouvee.');
    console.error('  Cherche dans : packages/core/src, ../core/src, node_modules/@arthome/core/{src,dist}');
    console.error('  Preciser avec --source <dossier> ou ARTHOME_ENUM_SOURCE.');
    console.error('  PORTE INACTIVE tant que @arthome/core n\'existe pas.');
    process.exit(0);
  }

  const { byValue, constants, declaringFiles } = discoverEnums(sourceRoot);
  if (!constants.length) {
    console.error(`⚠ arthome-check-enums : aucune constante \`as const\` dans ${path.relative(CWD, sourceRoot)}.`);
    console.error('  PORTE INACTIVE. Forme attendue : export const NOM = [\'a\', \'b\'] as const;');
    process.exit(0);
  }

  const { entries: allow, file: allowFile } = loadAllow();
  const files = listFiles(CWD, SCAN).filter((f) => !SKIP.test(f) && !declaringFiles.has(f));

  const findings = [];
  for (const file of files) {
    const rel = path.relative(CWD, file);
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(STRING_IN_ARRAY)) {
        const value = m[1] ?? m[2];
        if (!value || !byValue.has(value)) continue;
        if (isAllowed(allow, rel, value)) continue;
        const owner = byValue.get(value);
        findings.push({
          file: rel,
          line: i + 1,
          value,
          constant: owner.constant,
          from: path.relative(CWD, owner.file),
        });
      }
    });
  }

  if (!QUIET) {
    console.log(
      `arthome-check-enums : ${constants.length} enumeration(s), ${byValue.size} valeur(s), ` +
        `${files.length} fichier(s) balaye(s) — source ${path.relative(CWD, sourceRoot) || '.'}`,
    );
  }

  if (findings.length) {
    console.error(`\n✗ ${findings.length} table(s) litterale(s) parallele(s) — E2 :\n`);
    for (const f of findings) {
      console.error(`  ${f.file}:${f.line}  '${f.value}'`);
      console.error(`    → appartient a ${f.constant} (${f.from}). Importer la constante, ne pas recopier la valeur.`);
    }
    console.error(
      `\n  Exception legitime ? L'inscrire dans ${path.relative(CWD, allowFile)} AVEC SA RAISON.`,
    );
    console.error('  Ce fichier reste court ou la regle est mauvaise : au-dela de vingt lignes,');
    console.error('  c\'est le signe qu\'une valeur manque dans @arthome/core.');
    process.exit(1);
  }

  if (!QUIET) console.log('✓ aucune valeur d\'enumeration recopiee');
}

main();
