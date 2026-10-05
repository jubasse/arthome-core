#!/usr/bin/env node
/**
 * Writes the types of an api module, so no author spells them.
 *
 * `isolatedDeclarations` demands an explicit type on every exported schema and route, and the types
 * of a route are long. A module is a folder, `<api>/<module>/`, and this script writes into two of
 * its files and writes a third:
 *
 *   schemas.ts    named schemas, by hand. `--schemas` adds the explicit type of each exported
 *                 schema and, for `XSchema`, its `X` (z.output) and `XIn` (z.input, only where it
 *                 differs) types.
 *   routes.ts     the routes and nothing else, by hand: `export const getDate: GetDateRoute = ...`
 *   types.ts      the annotation of every route, `export type GetDateRoute = Route<{ ... }>`,
 *                 written by `--types` and never edited. `--check` fails when it is stale, like the
 *                 OpenAPI documents.
 *
 *   node tools/contract-types.mjs --all              every module folder of every api
 *   node tools/contract-types.mjs --types   packages/contracts/src/studio-api/dates/routes.ts
 *   node tools/contract-types.mjs --schemas packages/contracts/src/studio-api/dates/schemas.ts
 *   node tools/contract-types.mjs --check --all
 *
 * Types are written as `typeof Name` where a name in scope has exactly that type, and the imports
 * they need are written with them.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, relative, resolve } from 'node:path';

const require = createRequire(`${process.cwd()}/`);
const { ESLint } = require('eslint');
const prettier = require('prettier');
const ts = require('typescript');

const args = process.argv.slice(2);
const check = args.includes('--check');
const jobs = [];
const SOURCES = resolve('packages/contracts/src');
if (args.includes('--all')) {
  for (const api of readdirSync(SOURCES).filter((name) => name.endsWith('-api'))) {
    for (const module of readdirSync(resolve(SOURCES, api), { withFileTypes: true })) {
      const folder = resolve(SOURCES, api, module.name);
      if (!module.isDirectory() || !existsSync(resolve(folder, 'routes.ts'))) continue;
      if (existsSync(resolve(folder, 'schemas.ts'))) {
        jobs.push({ kind: 'schemas', file: resolve(folder, 'schemas.ts') });
      }
      jobs.push({ kind: 'types', file: resolve(folder, 'routes.ts') });
    }
  }
}
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--types' || args[i] === '--schemas') {
    jobs.push({ kind: args[i].slice(2), file: resolve(args[++i]) });
  }
}
if (jobs.length === 0) {
  console.error(
    'usage: contract-types.mjs [--check] (--all | --types routes.ts | --schemas schemas.ts)...',
  );
  process.exit(2);
}

const root = resolve('packages/contracts');
const config = ts.readConfigFile(resolve(root, 'tsconfig.build.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const SKIPPED = /(\.|\/)types\.ts$/;
const sources = parsed.fileNames.filter((name) => !SKIPPED.test(name));
const known = new Set(sources);
for (const job of jobs) known.add(job.file);
const program = ts.createProgram([...known], { ...parsed.options, isolatedDeclarations: false });
const checker = program.getTypeChecker();

const FLAGS =
  ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
const printType = (type, at) => checker.typeToString(type, at, FLAGS);

const pascal = (name) => name.charAt(0).toUpperCase() + name.slice(1);

/**
 * What `typeof Name` can stand for, longest printed type first: the exported schemas of the module's
 * files, and every variable those files import.
 */
function dictionaryOf(sourceFile, contextFiles) {
  const entries = new Map();
  const add = (name, symbol, origin) => {
    if (!(symbol.flags & ts.SymbolFlags.Variable)) return;
    const text = printType(checker.getTypeOfSymbolAtLocation(symbol, sourceFile), sourceFile);
    if ((text.length < 24 && !text.startsWith('readonly [')) || entries.has(text)) return;
    entries.set(text, { name, origin });
  };
  for (const file of contextFiles) {
    const sf = program.getSourceFile(file);
    if (sf === undefined) continue;
    if (basename(file) !== 'routes.ts') {
      for (const symbol of checker.getExportsOfModule(checker.getSymbolAtLocation(sf))) {
        add(symbol.name, symbol, file);
      }
    }
    if (file === sourceFile.fileName) {
      for (const statement of sf.statements.filter(ts.isVariableStatement)) {
        for (const declaration of statement.declarationList.declarations) {
          const symbol = checker.getSymbolAtLocation(declaration.name);
          if (symbol !== undefined) add(declaration.name.getText(sf), symbol, file);
        }
      }
    }
    for (const statement of sf.statements) {
      const named = ts.isImportDeclaration(statement) && statement.importClause?.namedBindings;
      if (!named || !ts.isNamedImports(named) || statement.importClause.isTypeOnly) continue;
      for (const element of named.elements) {
        if (element.isTypeOnly) continue;
        const local = checker.getSymbolAtLocation(element.name);
        if (local !== undefined) add(element.name.text, checker.getAliasedSymbol(local), null);
      }
    }
  }
  return [...entries].sort((a, b) => b[0].length - a[0].length);
}

/** Each core vocabulary type by its members, `"a" | "b"` to `Name`, where no other one has the same members. */
const VOCABULARY_TYPES = (() => {
  const core = program
    .getSourceFiles()
    .find((sf) => /\/core\/(src|dist)\/index\.(d\.)?ts$/.test(sf.fileName));
  const byMembers = new Map();
  for (const symbol of core ? checker.getExportsOfModule(checker.getSymbolAtLocation(core)) : []) {
    const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    if (!(target.flags & ts.SymbolFlags.TypeAlias)) continue;
    const type = checker.getDeclaredTypeOfSymbol(target);
    if (!type.isUnion() || !type.types.every((member) => member.isStringLiteral())) continue;
    const key = type.types
      .map((member) => member.value)
      .sort()
      .join('|');
    byMembers.set(key, byMembers.has(key) ? null : symbol.name);
  }
  return byMembers;
})();

/** A union of string literals written as the core vocabulary type with exactly those members. */
function withVocabularyTypes(text) {
  return text.replace(/(?:(["'])[a-z_]+\1(?: \| (["'])[a-z_]+\2)+)/g, (union) => {
    const members = union.split(' | ').map((member) => member.slice(1, -1));
    return VOCABULARY_TYPES.get([...members].sort().join('|')) ?? union;
  });
}

function shortened(text, dictionary, used) {
  let out = withVocabularyTypes(text);
  for (const [printed, entry] of dictionary) {
    if (out.includes(printed)) {
      out = out.split(printed).join(`typeof ${entry.name}`);
      used.add(entry.name);
    }
  }
  return out
    .replace(/(?<![\w.])Zod([A-Z]\w*)/g, 'z.Zod$1')
    .replace(/(?<!core\.)\$(strip|loose|strict|catchall)\b/g, 'z.core.$$$1')
    .replace(/\bz\.core\.z\.core\./g, 'z.core.')
    .replace(/\bz\.z\./g, 'z.')
    .replace(/<\{\}(?=[,>])/g, '<Record<never, never>')
    .replace(/\{\}(?=[,;>)\]])/g, 'Record<never, never>');
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

/** The names a module of the program exports, its file found by `pattern`. */
function exportsOf(pattern) {
  const sf = program.getSourceFiles().find((file) => pattern.test(file.fileName));
  return new Set(
    sf === undefined
      ? []
      : checker.getExportsOfModule(checker.getSymbolAtLocation(sf)).map((x) => x.name),
  );
}

const IDENT = /(?<![\w$.'"])([A-Za-z_$][\w$]*)(?![\w$'"])/g;

/** `import type` lines for the names a text uses, from the modules that give them. */
function importsFor(text, { from, contextFiles, dictionary, extra }) {
  const imported = importMap(contextFiles);
  const byOrigin = new Map(
    dictionary
      .filter(([, entry]) => entry.origin !== null)
      .map(([, entry]) => [entry.name, entry.origin]),
  );
  const core = exportsOf(/\/core\/(src|dist)\/index\.(d\.)?ts$/);
  const coreSchema = exportsOf(/\/core\/(src|dist)\/schema\/index\.(d\.)?ts$/);
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
    if (extra.has(name)) continue;
    else if (name === 'z') want('zod', 'z');
    else if (byOrigin.has(name) && new RegExp(`typeof ${name}\\b`).test(text)) {
      want(relativeSpec(from, byOrigin.get(name)), name);
    } else if (imported.has(name)) want(imported.get(name), name);
    else if (httpExports.has(name)) want(relativeSpec(from, httpIndex.fileName), name);
    else if (core.has(name)) want('@arthome/core', name);
    else if (coreSchema.has(name)) want('@arthome/core/schema', name);
  }
  return [...specs]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([spec, list]) => `import type { ${[...new Set(list)].sort().join(', ')} } from '${spec}';`,
    )
    .join('\n');
}

/** Each error code's accessor, `'order.sold_out'` to `OrderErrorCode.SOLD_OUT`, read from `ErrorStatusMap`. */
const ERROR_CODE_NAMES = (() => {
  const names = new Map();
  const registry = program
    .getSourceFiles()
    .find((sf) => sf.fileName.endsWith('/contracts/src/http/error-registry.ts'));
  const map = registry?.statements.find(
    (st) => ts.isInterfaceDeclaration(st) && st.name.text === 'ErrorStatusMap',
  );
  for (const member of map?.members ?? []) {
    if (member.name === undefined || !ts.isComputedPropertyName(member.name)) continue;
    const type = checker.getTypeAtLocation(member.name.expression);
    if (type.isStringLiteral()) names.set(type.value, member.name.expression.getText(registry));
  }
  return names;
})();

/**
 * `errorCodes` written out status by status, each code through its accessor as `check-enums` asks:
 * the checker would print the alias that computes it.
 */
function errorCodesText(type, at) {
  const statuses = type.getProperties().map((status) => {
    const list = checker.getTypeOfSymbolAtLocation(status, at);
    const element = checker.getIndexTypeOfType(list, ts.IndexKind.Number);
    const codes = (element.isUnion() ? element.types : [element]).map((code) => code.value).sort();
    const named = codes.map((code) => `typeof ${ERROR_CODE_NAMES.get(code)}`);
    return `    ${status.getName()}: readonly (${named.join(' | ')})[];`;
  });
  return `{\n${statuses.join('\n')}\n  }`;
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

const written = [];
const write = (file, text, label) => written.push({ file, text, label });

/** `text` with each `import type` line of `imports` merged into the file's own from that module. */
function withTypeImports(text, imports) {
  let out = text;
  for (const [, names, spec] of imports.matchAll(/import type \{ ([^}]*) \} from '([^']+)';/g)) {
    const pattern = new RegExp(
      `import type \\{([^}]*)\\} from '${spec.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}';`,
    );
    const held = pattern.exec(out);
    const merged = new Set([
      ...names.split(', '),
      ...(held?.[1].split(',').map((n) => n.trim()) ?? []),
    ]);
    const line = `import type { ${[...merged].filter(Boolean).sort().join(', ')} } from '${spec}';`;
    out = held === null ? `${line}\n${out}` : out.replace(held[0], line);
  }
  return out;
}

/** The schemas file: an explicit type on each exported schema, and its z.output and z.input names. */
function schemasJob(file) {
  const sf = program.getSourceFile(file);
  const dictionary = dictionaryOf(sf, [file]);
  const edits = [];
  const annotations = [];
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
    annotations.push(text);
    if (declaration.type === undefined) {
      edits.push({
        start: declaration.name.getEnd(),
        end: declaration.name.getEnd(),
        text: `: ${text}`,
      });
    } else if (declaration.type.getText(sf).replace(/\s+/g, '') !== text.replace(/\s+/g, '')) {
      edits.push({ start: declaration.type.getStart(sf), end: declaration.type.getEnd(), text });
    }
    const named = name.endsWith('Schema') ? name.slice(0, -'Schema'.length) : undefined;
    if (named === undefined) continue;
    if (!present.has(named)) typeLines.push(`export type ${named} = z.output<typeof ${name}>;`);
    if (!present.has(`${named}In`) && outputsDiffer(type, declaration)) {
      typeLines.push(`export type ${named}In = z.input<typeof ${name}>;`);
    }
  }
  let text = readFileSync(file, 'utf8');
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  }
  if (typeLines.length > 0) text = `${text.trimEnd()}\n\n${typeLines.join('\n')}\n`;
  const imports = importsFor(annotations.join(' '), {
    from: file,
    contextFiles: [file],
    dictionary,
    extra: new Set([
      ...importMap([file]).keys(),
      ...sf.statements
        .filter(ts.isVariableStatement)
        .flatMap((statement) =>
          statement.declarationList.declarations.map((declaration) => declaration.name.getText(sf)),
        ),
    ]),
  });
  write(file, withTypeImports(text, imports), 'schemas');
}

/** The types file: one alias per exported route, and the routes' annotations pointing at them. */
function typesJob(file) {
  const sf = program.getSourceFile(file);
  const dictionary = dictionaryOf(sf, [file, ...sibling(file), ...apiComponents(file)]);
  const base = basename(file, '.ts');
  const typesBase = base === 'routes' ? 'types' : `${base}.types`;
  const typesFile = resolve(dirname(file), `${typesBase}.ts`);
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
    'errorCodes',
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
    const coded = new Set(
      (built.getProperty('errorCodes') === undefined
        ? []
        : checker
            .getTypeOfSymbolAtLocation(built.getProperty('errorCodes'), declaration)
            .getProperties()
      ).map((status) => status.getName()),
    );
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
              !(
                Number(status) >= 400 &&
                (coded.has(status) || /ErrorBody<|ErrorResponse</.test(text))
              ),
          )
          .map(({ name: status, text }) => `    ${status}: ${text};`);
        members.push(`  responses: {\n${own.join('\n')}\n  };`);
      } else if (member === 'errorCodes') {
        if (type.getProperties().length > 0) {
          members.push(`  errorCodes: ${errorCodesText(type, declaration)};`);
        }
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
  write(typesFile, `${header}${imports}\n\n${body}\n`, 'types');

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
    .join(', ')} } from './${typesBase}.js';`;
  const existing = text.match(/import type \{[^}]*\} from '\.\/([\w.-]+\.)?types\.js';\n/);
  text = existing ? text.replace(existing[0], `${importLine}\n`) : `${importLine}\n${text}`;
  write(file, text, 'routes');
}

/** The api's shared parameters, responses and conventions, one folder up from a module's. */
const apiComponents = (file) =>
  [resolve(dirname(dirname(file)), 'components.ts')].filter(
    (f) => basename(file) === 'routes.ts' && existsSync(f),
  );

const sibling = (file) => {
  const dir = dirname(file);
  const stem = basename(file, '.ts');
  const schemas = stem === 'routes' ? 'schemas.ts' : `${stem}.schemas.ts`;
  return [resolve(dir, schemas)].filter((f) => existsSync(f));
};

for (const job of jobs) {
  if (job.kind === 'schemas') schemasJob(job.file);
  else typesJob(job.file);
}

const importOrder = new ESLint({
  fix: true,
  ruleFilter: ({ ruleId }) => ruleId === 'import-x/order',
  overrideConfig: { languageOptions: { parserOptions: { projectService: false, project: null } } },
});

/** The text as `pnpm run fix` leaves it: Prettier, the import order ESLint fixes, Prettier again. */
async function formatted(text, file) {
  const options = { ...(await prettier.resolveConfig(file)), filepath: file };
  const once = await prettier.format(text, options);
  const [result] = await importOrder.lintText(once, { filePath: file });
  return result?.output === undefined ? once : prettier.format(result.output, options);
}

let stale = 0;
for (const { file, text, label } of written) {
  const next = await formatted(text, file);
  const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (current === next) continue;
  stale += 1;
  if (check) {
    console.error(`${file}: ${label} is stale`);
    continue;
  }
  writeFileSync(file, next);
  console.log(`${file}: ${label} written`);
}
if (check && stale > 0) process.exit(1);
