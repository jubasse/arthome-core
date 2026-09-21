#!/usr/bin/env node
// arthome-check-core-entry — la porte des DEUX ENTREES de @arthome/core.
//
// CE QU'ELLE GARANTIT
//   L'entree `.` de @arthome/core n'importe zod A AUCUNE PROFONDEUR.
//
// POURQUOI C'EST UNE PORTE ET PAS UNE CONVENTION
//   Le cout de zod est FIXE et lie a l'import, pas marginal et lie au nombre de
//   schemas : deux agents l'ont mesure independamment et convergent a 1 Ko pres
//   — 93 Ko compresses pour un seul `z.string()` en entree classique, 7,5 Ko en
//   `zod/mini` elague (D-012). Un seul `import { z }` ajoute au fond d'un
//   module de regles suffit donc a faire payer la facture entiere a la TV et au
//   mobile, SANS QUE RIEN NE LE SIGNALE : le code compile, les tests passent,
//   et le bundle grossit de 93 Ko.
//
//   C'est exactement le profil d'une faute qu'un principe n'attrape pas.
//
// COMMENT
//   Parcours du graphe d'imports depuis src/index.ts, sur les SOURCES. Pas de
//   build, pas de node_modules, pas de resolution de module : le meme choix que
//   arthome-check-enums, et pour la meme raison — la porte doit fonctionner des
//   le premier jour.
//
// Voir architecture/core-port-plan.md section 2.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CWD = process.cwd();
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const QUIET = args.includes('--quiet');

const CORE_SRC = path.resolve(CWD, opt('core', 'packages/core/src'));
const ENTRY = path.join(CORE_SRC, 'index.ts');
const SCHEMA_ENTRY = path.join(CORE_SRC, 'schema', 'index.ts');

// Ce qui ne doit jamais etre joignable depuis l'entree `.`.
const FORBIDDEN = [
  { test: (s) => s === 'zod' || s.startsWith('zod/'), why: 'zod — cout fixe de 93 Ko compresses (D-012)' },
  { test: (s) => s.startsWith('node:'), why: 'API Node — le paquet doit tourner sous Metro et dans un navigateur' },
];

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function specifiersOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const m of src.matchAll(IMPORT_RE)) out.push(m[1]);
  for (const m of src.matchAll(DYNAMIC_RE)) out.push(m[1]);
  return out;
}

function resolveRelative(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  // nodenext : les imports relatifs portent `.js`, les sources sont en `.ts`.
  const candidates = [base.replace(/\.js$/, '.ts'), `${base}.ts`, path.join(base, 'index.ts')];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
}

function walk(entry) {
  if (!fs.existsSync(entry)) return { visited: new Set(), findings: [], missing: entry };
  const visited = new Set();
  const findings = [];
  const queue = [{ file: entry, from: [] }];
  while (queue.length) {
    const { file, from } = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    for (const spec of specifiersOf(file)) {
      if (spec.startsWith('.')) {
        const next = resolveRelative(file, spec);
        if (next) queue.push({ file: next, from: [...from, file] });
        continue;
      }
      const hit = FORBIDDEN.find((f) => f.test(spec));
      if (hit) findings.push({ file, spec, why: hit.why, chain: [...from, file] });
    }
  }
  return { visited, findings, missing: null };
}

function rel(p) {
  return path.relative(CWD, p);
}

function main() {
  const entry = walk(ENTRY);
  if (entry.missing) {
    console.error(`⚠ arthome-check-core-entry : ${rel(ENTRY)} introuvable.`);
    console.error('  PORTE INACTIVE tant que @arthome/core n\'a pas son entree principale.');
    process.exit(0);
  }

  if (!QUIET) {
    console.log(
      `arthome-check-core-entry : ${entry.visited.size} module(s) joignable(s) depuis l'entree « . »`,
    );
  }

  if (entry.findings.length) {
    console.error(`\n✗ l'entree « . » de @arthome/core atteint ${entry.findings.length} import(s) interdit(s) :\n`);
    for (const f of entry.findings) {
      console.error(`  ${rel(f.file)}  →  '${f.spec}'`);
      console.error(`    ${f.why}`);
      if (f.chain.length > 1) {
        console.error(`    chemin : ${f.chain.map(rel).join('\n             → ')}`);
      }
    }
    console.error('\n  Un schema de frontiere vit dans src/schema/, jamais dans une regle.');
    process.exit(1);
  }

  // L'entree ./schema, elle, DOIT dependre de zod — sinon elle n'a pas d'objet.
  if (fs.existsSync(SCHEMA_ENTRY)) {
    const schema = walk(SCHEMA_ENTRY);
    const usesZod = schema.visited.size
      ? [...schema.visited].some((f) => specifiersOf(f).some((s) => s === 'zod' || s.startsWith('zod/')))
      : false;
    if (!usesZod) {
      console.error('\n✗ l\'entree « ./schema » n\'importe pas zod.');
      console.error('  Une entree de schemas sans schemas n\'a pas d\'objet : soit elle porte des');
      console.error('  schemas zod, soit elle ne doit pas exister.');
      process.exit(1);
    }
    if (!QUIET) console.log(`arthome-check-core-entry : entree « ./schema » — ${schema.visited.size} module(s), zod present`);
  } else if (!QUIET) {
    console.log('arthome-check-core-entry : entree « ./schema » pas encore ecrite (vague 6)');
  }

  if (!QUIET) console.log('✓ l\'entree « . » n\'atteint ni zod ni une API Node');
}

main();
