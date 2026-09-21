// Arthome — compilation des dictionnaires d'interface.
//
// La copie vit dans i18n/. Les surfaces, elles, ont besoin d'un dictionnaire
// littéral dans leur source : une maquette doit peindre dès le premier
// caractère, et un fetch laisserait l'écran vide.
//
// Ce fichier est le pont entre les deux. À RELANCER APRÈS TOUTE MODIFICATION
// DE i18n/ — sans quoi la correction reste invisible à l'écran.
//
//   import { compileAll } from './i18n-compile.js';
//   await compileAll({ readFile, saveFile, log });
//
// Chaque surface a son plan de correspondance (nom court dans le composant ↔
// clé i18n, plus un indicateur « rendu en capitales » quand la casse relève du
// style et non d'une seconde traduction).

export const TARGETS = [
  ['Storefront Web.dc.html', 'i18n/storefront-keymap.json'],
  ['Storefront Mobile.dc.html', 'i18n/storefront-keymap.json'],
  ['Storefront TV.dc.html', 'i18n/tv-keymap.json']
];

export async function loadDictionary(readFile) {
  const index = JSON.parse(await readFile('i18n/index.json'));
  const dict = {};
  for (const row of index.files) {
    Object.assign(dict, JSON.parse(await readFile('i18n/' + row.file)).keys);
  }
  return { dict, locales: index.locales || ['fr', 'en'] };
}

export async function compileSurface(file, keymapFile, io) {
  const { readFile, saveFile } = io;
  const { dict } = await loadDictionary(readFile);
  const map = JSON.parse(await readFile(keymapFile)).map;
  let source = await readFile(file);

  // Toute clé lue par la surface doit exister dans le plan, et toute entrée du
  // plan dans i18n : une copie manquante est une erreur, pas un trou silencieux.
  const used = new Set((source.match(/\bt\.([A-Za-z]\w*)/g) || []).map(x => x.slice(2)));
  const orphans = [...used].filter(k => !map[k]);
  if (orphans.length) throw new Error(file + ' — clés sans entrée dans le plan : ' + orphans.join(', '));
  const absent = Object.entries(map).filter(([, row]) => !dict[row.key]).map(([short, row]) => short + ' → ' + row.key);
  if (absent.length) throw new Error(file + ' — clés absentes de i18n/ : ' + absent.join(', '));

  const block = (name, locale) => {
    const rows = Object.keys(map).sort().map(short => {
      const row = map[short];
      let value = dict[row.key][locale];
      if (row.upper) value = value.toLocaleUpperCase(locale === 'fr' ? 'fr-FR' : 'en-US');
      return '  ' + short + ': ' + JSON.stringify(value);
    });
    return '// Généré depuis i18n/ via ' + keymapFile + ' — ne pas éditer ici :\n'
      + '// la copie vit dans i18n/, et ce bloc se régénère avec i18n-compile.js.\n'
      + 'const ' + name + ' = { // ' + locale + '\n' + rows.join(',\n') + '\n};';
  };

  /* Les bornes remontent au commentaire d'en-tête : sans cela il s'empile à
     chaque compilation. */
  const bounds = (name) => {
    const decl = source.indexOf('const ' + name + ' = {');
    if (decl < 0) throw new Error(file + ' — bloc ' + name + ' introuvable');
    let start = decl;
    for (;;) {
      const prev = source.lastIndexOf('\n', start - 2);
      const line = source.slice(prev + 1, start);
      if (!/^\s*\/\//.test(line)) break;
      start = prev + 1;
    }
    return [start, source.indexOf('\n};', decl) + 3];
  };
  const [frStart, frEnd] = bounds('FR');
  const [enStart, enEnd] = bounds('EN');
  if (!(frStart < frEnd && frEnd <= enStart && enStart < enEnd)) {
    throw new Error(file + ' — les blocs FR et EN ne se suivent pas comme attendu');
  }
  source = source.slice(0, frStart) + block('FR', 'fr') + '\n\n' + block('EN', 'en') + source.slice(enEnd);
  await saveFile(file, source);
  return { file, compiled: Object.keys(map).length, used: used.size };
}

export async function compileAll(io) {
  const out = [];
  for (const [file, keymap] of TARGETS) out.push(await compileSurface(file, keymap, io));
  if (io.log) out.forEach(r => io.log(r.file + ' · ' + r.compiled + ' clés · ' + r.used + ' utilisées'));
  return out;
}

export default compileAll;
