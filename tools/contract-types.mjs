#!/usr/bin/env node
/**
 * Writes the types of an api module, so no author spells them.
 *
 * `isolatedDeclarations` demands an explicit type on every exported schema and route, and the types
 * of a route are long. A module is three files, and this script writes two of them:
 *
 *   <module>.schemas.ts   named schemas and their examples, by hand. `--schemas` adds the explicit
 *                         type of each exported schema and its `X` (z.output) and `XIn` (z.input,
 *                         only where it differs) names.
 *   <module>.ts           the routes and nothing else, by hand: `export const getDate: GetDateRoute = ...`
 *   <module>.types.ts     the annotation of every route, `export type GetDateRoute = Route<{ ... }>`,
 *                         written by `--types` and never edited. `--check` fails when it is stale,
 *                         like the OpenAPI documents.
 *
 *   node tools/contract-types.mjs --schemas packages/contracts/src/studio-api/dates.schemas.ts
 *   node tools/contract-types.mjs --types   packages/contracts/src/studio-api/dates.ts
 *   node tools/contract-types.mjs --check --types ... --schemas ...
 *
 * Types are written as `typeof Name` where a name in scope has exactly that type, and the imports
 * they need are written with them.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, relative, resolve } from 'node:path';

const require = createRequire(`${process.cwd()}/`);
const ts = require('typescript');

const args = process.argv.slice(2);
const check = args.includes('--check');
const jobs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--types' || args[i] === '--schemas') {
    jobs.push({ kind: args[i].slice(2), file: resolve(args[++i]) });
  }
}
if (jobs.length === 0) {
  console.error(
    'usage: contract-types.mjs [--check] (--types routes.ts | --schemas schemas.ts)...',
  );
  process.exit(2);
}

const root = resolve('packages/contracts');
const config = ts.readConfigFile(resolve(root, 'tsconfig.build.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const SKIPPED = /\.(types)\.ts$/;
const sources = parsed.fileNames.filter((name) => !SKIPPED.test(name));
const known = new Set(sources);
for (const job of jobs) known.add(job.file);
const program = ts.createProgram([...known], { ...parsed.options, isolatedDeclarations: false });
const checker = program.getTypeChecker();

const FLAGS =
  ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
const printType = (type, at) => checker.typeToString(type, at, FLAGS);

const pascal = (name) => name.charAt(0).toUpperCase() + name.slice(1);

/** Every exported variable of the api's own modules, longest printed type first: what `typeof Name` can stand for. */
function dictionaryOf(sourceFile) {
  const dir = dirname(sourceFile.fileName);
  const entries = new Map();
  const add = (symbol, origin, at) => {
    if (!(symbol.flags & ts.SymbolFlags.Variable)) return;
    const text = printType(checker.getTypeOfSymbolAtLocation(symbol, at), at);
    if (text.length < 24 || entries.has(text)) return;
    entries.set(text, { name: symbol.name, origin });
  };
  for (const other of program.getSourceFiles()) {
    if (other.isDeclarationFile || dirname(other.fileName) !== dir) continue;
    if (SKIPPED.test(other.fileName)) continue;
    const moduleSymbol = checker.getSymbolAtLocation(other);
    if (moduleSymbol === undefined) continue;
    for (const symbol of checker.getExportsOfModule(moduleSymbol))
      add(symbol, other.fileName, sourceFile);
  }
  return [...entries].sort((a, b) => b[0].length - a[0].length);
}

function shortened(text, dictionary, used) {
  let out = text;
  for (const [printed, entry] of dictionary) {
    if (out.includes(printed)) {
      out = out.split(printed).join(`typeof ${entry.name}`);
      used.add(entry.name);
    }
  }
  return out
    .replace(/(?<![\w.])Zod([A-Z]\w*)/g, 'z.Zod$1')
    .replace(/(?<!core\.)\$(strip|loose|strict)\b/g, 'z.core.$$$1')
    .replace(/\bz\.core\.z\.core\./g, 'z.core.')
    .replace(/\bz\.z\./g, 'z.')
    .replace(/<\{\}(?=[,>])/g, '<Record<never, never>')
    .replace(/\{\}(?=[,;>)\]])/g, 'Record<never, never>');
}

function prettier(text, file) {
  return execFileSync('npx', ['prettier', '--stdin-filepath', file], {
    input: text,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });
}

/** The import statements of the module files, by imported name: where a name in a type comes from. */
function importMap(files) {
  const map = new Map();
  for (const file of files) {
    const sf = program.getSourceFile(file);
    if (sf === undefined) continue;
    for (const statement of sf.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      const spec = statement.moduleSpecifier.text;
      const named = statement.importClause?.namedBindings;
      if (named !== undefined && ts.isNamedImports(named)) {
        for (const element of named.elements) {
          map.set((element.propertyName ?? element.name).text, spec);
        }
      }
    }
  }
  return map;
}

function relativeSpec(from, origin) {
  let spec = relative(dirname(from), origin).replace(/\.ts$/, '.js');
  if (!spec.startsWith('.')) spec = `./${spec}`;
  return spec;
}

const IDENT = /(?<![\w$.'"])([A-Za-z_$][\w$]*)(?![\w$'"])/g;

/** `import type` lines for the names a text uses, from the modules that give them. */
function importsFor(text, { from, contextFiles, dictionary, extra }) {
  const imported = importMap(contextFiles);
  const byOrigin = new Map(dictionary.map(([, entry]) => [entry.name, entry.origin]));
  const httpIndex = program
    .getSourceFiles()
    .find((sf) => sf.fileName.endsWith('/src/http/index.ts'));
  const httpExports = new Set(
    httpIndex === undefined
      ? []
      : checker
          .getExportsOfModule(checker.getSymbolAtLocation(httpIndex))
          .map((symbol) => symbol.name),
  );
  const specs = new Map();
  const want = (spec, name) => specs.set(spec, [...(specs.get(spec) ?? []), name]);
  const names = new Set([...text.matchAll(IDENT)].map((match) => match[1]));
  for (const name of names) {
    if (name === 'z') want('zod', 'z');
    else if (extra.has(name)) continue;
    else if (byOrigin.has(name) && new RegExp(`typeof ${name}\\b`).test(text)) {
      want(relativeSpec(from, byOrigin.get(name)), name);
    } else if (imported.has(name)) want(imported.get(name), name);
    else if (httpExports.has(name)) want(relativeSpec(from, httpIndex.fileName), name);
  }
  return [...specs]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([spec, list]) => `import type { ${[...new Set(list)].sort().join(', ')} } from '${spec}';`,
    )
    .join('\n');
}

const outputsDiffer = (schemaType, at) => {
  const internals = schemaType.getProperty('_zod');
  if (internals === undefined) return false;
  const inner = checker.getTypeOfSymbolAtLocation(internals, at);
  const input = inner.getProperty('input');
  const output = inner.getProperty('output');
  if (input === undefined || output === undefined) return false;
  const a = checker.getTypeOfSymbolAtLocation(input, at);
  const b = checker.getTypeOfSymbolAtLocation(output, at);
  return !(checker.isTypeAssignableTo(a, b) && checker.isTypeAssignableTo(b, a));
};

let stale = 0;
const write = (file, text, label) => {
  const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (current === text) return;
  stale += 1;
  if (check) {
    console.error(`${file}: ${label} is stale`);
    return;
  }
  writeFileSync(file, text);
  console.log(`${file}: ${label} written`);
};

/** The schemas file: an explicit type on each exported schema, and its z.output and z.input names. */
function schemasJob(file) {
  const sf = program.getSourceFile(file);
  const dictionary = dictionaryOf(sf);
  const edits = [];
  const typeLines = [];
  const present = new Set(
    sf.statements.filter((s) => ts.isTypeAliasDeclaration(s)).map((s) => s.name.text),
  );
  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    if (!statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    const declaration = statement.declarationList.declarations[0];
    const name = declaration.name.getText(sf);
    if (declaration.initializer === undefined) continue;
    const type = checker.getTypeAtLocation(declaration.initializer);
    if (!type.getProperty('_zod')) continue;
    const used = new Set();
    const own = dictionary.filter(([, entry]) => entry.name !== name);
    const text = shortened(printType(type, declaration), own, used);
    if (declaration.type === undefined) {
      edits.push({
        start: declaration.name.getEnd(),
        end: declaration.name.getEnd(),
        text: `: ${text}`,
      });
    } else if (declaration.type.getText(sf).replace(/\s+/g, '') !== text.replace(/\s+/g, '')) {
      edits.push({ start: declaration.type.getStart(sf), end: declaration.type.getEnd(), text });
    }
    if (!present.has(name)) typeLines.push(`export type ${name} = z.output<typeof ${name}>;`);
    if (!present.has(`${name}In`) && outputsDiffer(type, declaration)) {
      typeLines.push(`export type ${name}In = z.input<typeof ${name}>;`);
    }
  }
  let text = readFileSync(file, 'utf8');
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  }
  if (typeLines.length > 0) text = `${text.trimEnd()}\n\n${typeLines.join('\n')}\n`;
  const imports = importsFor(edits.map((e) => e.text).join(' '), {
    from: file,
    contextFiles: [file],
    dictionary,
    extra: new Set(),
  });
  if (imports !== '') {
    const missing = imports
      .split('\n')
      .filter(
        (line) => !text.includes(line.replace('import type', 'import')) && !text.includes(line),
      );
    if (missing.length > 0) text = `${missing.join('\n')}\n${text}`;
  }
  write(file, prettier(text, file), 'schemas');
}

/** The types file: one alias per exported route, and the routes' annotations pointing at them. */
function typesJob(file) {
  const sf = program.getSourceFile(file);
  const dictionary = dictionaryOf(sf);
  const base = basename(file, '.ts');
  const typesFile = resolve(dirname(file), `${base}.types.ts`);
  const aliases = [];
  const annotations = [];
  const used = new Set();
  const MEMBERS = [
    'method',
    'version',
    'path',
    'parameters',
    'requestBody',
    'access',
    'degradable',
    'responses',
  ];
  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    if (!statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    const declaration = statement.declarationList.declarations[0];
    if (declaration.initializer === undefined) continue;
    const built = checker.getTypeAtLocation(declaration.initializer);
    if (!built.getProperty('operationId') || !built.getProperty('responses')) continue;
    const name = declaration.name.getText(sf);
    const alias = `${pascal(name)}Route`;
    const members = [];
    for (const member of MEMBERS) {
      const property = built.getProperty(member);
      if (property === undefined || property.flags & ts.SymbolFlags.Optional) continue;
      const type = checker.getTypeOfSymbolAtLocation(property, declaration);
      if (member === 'responses') {
        const own = type
          .getProperties()
          .map((status) => {
            const text = shortened(
              printType(checker.getTypeOfSymbolAtLocation(status, declaration), declaration),
              dictionary,
              used,
            );
            return { name: status.getName(), text };
          })
          .filter(
            ({ name: status, text }) =>
              !(Number(status) >= 400 && /ErrorBody<|ErrorResponse</.test(text)),
          )
          .map(({ name: status, text }) => `    ${status}: ${text};`);
        members.push(`  responses: {\n${own.join('\n')}\n  };`);
      } else if (type.isStringLiteral()) {
        members.push(`  ${member}: '${type.value}';`);
      } else if (type.isNumberLiteral()) {
        members.push(`  ${member}: ${type.value};`);
      } else {
        members.push(`  ${member}: ${shortened(printType(type, declaration), dictionary, used)};`);
      }
    }
    aliases.push(`export type ${alias} = Route<{\n${members.join('\n')}\n}>;`);
    annotations.push({ declaration, alias });
  }
  const body = aliases.join('\n\n');
  const header = `/** Written by tools/contract-types.mjs from ./${base}.ts. Never edited. */\n\n`;
  const imports = importsFor(body, {
    from: typesFile,
    contextFiles: [file, ...sibling(file)],
    dictionary,
    extra: new Set(aliases.map((a) => a.match(/type (\w+)/)[1])),
  });
  write(typesFile, prettier(`${header}${imports}\n\n${body}\n`, typesFile), 'types');

  // The routes file: each route annotated with its alias, and the aliases imported.
  let text = readFileSync(file, 'utf8');
  const edits = [];
  for (const { declaration, alias } of annotations) {
    if (declaration.type === undefined) {
      edits.push({
        start: declaration.name.getEnd(),
        end: declaration.name.getEnd(),
        text: `: ${alias}`,
      });
    } else if (declaration.type.getText(sf) !== alias) {
      edits.push({
        start: declaration.type.getStart(sf),
        end: declaration.type.getEnd(),
        text: alias,
      });
    }
  }
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  }
  const importLine = `import type { ${annotations
    .map((a) => a.alias)
    .sort()
    .join(', ')} } from './${base}.types.js';`;
  const existing = text.match(/import type \{[^}]*\} from '\.\/[\w.-]+\.types\.js';\n/);
  text = existing ? text.replace(existing[0], `${importLine}\n`) : `${importLine}\n${text}`;
  write(file, prettier(text, file), 'routes');
}

const sibling = (file) => {
  const dir = dirname(file);
  const stem = basename(file, '.ts');
  return [resolve(dir, `${stem}.schemas.ts`)].filter((f) => existsSync(f));
};

for (const job of jobs) {
  if (job.kind === 'schemas') schemasJob(job.file);
  else typesJob(job.file);
}
if (check && stale > 0) process.exit(1);
