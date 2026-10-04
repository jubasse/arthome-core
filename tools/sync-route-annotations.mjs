#!/usr/bin/env node
/**
 * Brings the explicit annotation of each exported route in line with what its declaration builds.
 *
 * `isolatedDeclarations` demands `export const getDate: Route<{ ... }> = scope.defineRoute({ ... })`,
 * and a route moved under a scope, an identity or a resource changes four members of that type: its
 * `method`, its `path`, its `parameters` (scope parameters first, then its own, the builder's
 * headers, the identity's) and its `access`. The compiler knows the four; this script writes them,
 * and leaves `responses`, `requestBody` and every schema type as they are.
 *
 *   node tools/sync-route-annotations.mjs packages/contracts/src/studio-api/publication.ts ...
 *
 * `--check` changes nothing and exits 1 when an annotation is out of line. Parameter types are
 * written as `typeof Name` where a name in the module has exactly that type.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(`${process.cwd()}/`);
const ts = require('typescript');

const args = process.argv.slice(2);
const check = args.includes('--check');
const files = args.filter((arg) => !arg.startsWith('--')).map((file) => resolve(file));
if (files.length === 0) {
  console.error('usage: sync-route-annotations.mjs [--check] <file.ts>...');
  process.exit(2);
}

const projectPath = resolve('packages/contracts/tsconfig.build.json');
const configFile = ts.readConfigFile(projectPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  resolve('packages/contracts'),
);
const program = ts.createProgram(parsed.fileNames, {
  ...parsed.options,
  isolatedDeclarations: false,
});
const checker = program.getTypeChecker();

const FLAGS =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
  (ts.TypeFormatFlags.WriteArrayAsGenericType * 0);

const printType = (type, at) => checker.typeToString(type, at, FLAGS);

/** What a name in the module is worth as `typeof Name`: its printed type, longest first. */
function dictionaryOf(sourceFile) {
  const entries = new Map();
  const symbols = checker.getSymbolsInScope(
    sourceFile,
    ts.SymbolFlags.Variable | ts.SymbolFlags.Alias,
  );
  for (const symbol of symbols) {
    const declaration = symbol.declarations?.[0];
    if (declaration === undefined) continue;
    const origin = declaration.getSourceFile();
    if (origin.isDeclarationFile && origin.fileName.includes('/node_modules/typescript/')) continue;
    if (/\/(lib\.[^/]*\.d\.ts)$/.test(origin.fileName)) continue;
    const resolved =
      symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    if (!(resolved.flags & ts.SymbolFlags.Variable)) continue;
    const type = checker.getTypeOfSymbolAtLocation(resolved, sourceFile);
    const text = printType(type, sourceFile);
    if (text.length < 24) continue;
    if (!entries.has(text)) entries.set(text, symbol.name);
  }
  return [...entries].sort((a, b) => b[0].length - a[0].length);
}

function shortened(text, dictionary) {
  let out = text;
  for (const [printed, name] of dictionary) out = out.split(printed).join(`typeof ${name}`);
  return out
    .replace(/(?<![\w.])Zod([A-Z]\w*)/g, 'z.Zod$1')
    .replace(/(?<!core\.)\$(strip|loose|strict)\b/g, 'z.core.$$$1')
    .replace(/\bz\.core\.z\.core\./g, 'z.core.')
    .replace(/\bz\.z\./g, 'z.')
    .replace(/<\{\}(?=[,>])/g, '<Record<never, never>');
}

function propertyText(type, name, at, dictionary) {
  const property = type.getProperty(name);
  if (property === undefined || property.flags & ts.SymbolFlags.Optional) return undefined;
  const propertyType = checker.getTypeOfSymbolAtLocation(property, at);
  if (propertyType.isStringLiteral()) return `'${propertyType.value}'`;
  return shortened(printType(propertyType, at), dictionary);
}

function routeAnnotation(statement) {
  const declaration = statement.declarationList.declarations[0];
  const annotation = declaration.type;
  if (annotation === undefined || !ts.isTypeReferenceNode(annotation)) return undefined;
  if (annotation.typeName.getText() !== 'Route' || annotation.typeArguments?.length !== 1)
    return undefined;
  const literal = annotation.typeArguments[0];
  return ts.isTypeLiteralNode(literal) ? { declaration, literal } : undefined;
}

const squash = (text) =>
  text
    .replace(/\s+/g, '')
    .replace(/,(?=[\]}>)])/g, '')
    .replace(/"/g, "'");

/** A status the annotation lists and the route no longer answers is removed. The statuses a builder derives are not written: the annotation lists the route's own. */
function syncResponses(built, literal, declaration, sourceFile, dictionary, edits) {
  const member = literal.members.find((candidate) => candidate.name?.getText() === 'responses');
  const property = built.getProperty('responses');
  if (member === undefined || property === undefined || !ts.isPropertySignature(member)) return;
  if (member.type === undefined || !ts.isTypeLiteralNode(member.type)) return;
  const builtStatuses = new Map(
    checker
      .getTypeOfSymbolAtLocation(property, declaration)
      .getProperties()
      .map((status) => [status.getName(), checker.getTypeOfSymbolAtLocation(status, declaration)]),
  );
  for (const entry of member.type.members) {
    if (!builtStatuses.has(entry.name?.getText())) {
      edits.push({ start: entry.getFullStart(), end: entry.getEnd(), text: '' });
    }
  }
}

/** Names the new text uses that the module does not have: taken from the http module when it exports them. */
function withImports(text, sourceFile, inserted) {
  const httpImports = sourceFile.statements.filter(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      statement.moduleSpecifier.getText().includes('/http/index.js'),
  );
  const httpImport =
    httpImports.find((statement) => statement.importClause?.isTypeOnly) ?? httpImports[0];
  if (httpImport === undefined) return text;
  const httpModule = checker.getSymbolAtLocation(httpImport.moduleSpecifier);
  if (httpModule === undefined) return text;
  const exported = new Set(
    checker.getExportsOfModule(httpModule).map((symbol) => symbol.getName()),
  );
  const wanted = new Set(
    [...inserted.matchAll(/\b([A-Z][A-Za-z]+)(?=<|;|,|\s|\])/g)]
      .map((match) => match[1])
      .filter((name) => exported.has(name)),
  );
  const missing = [...wanted].filter(
    (name) =>
      checker.resolveName(name, sourceFile, ts.SymbolFlags.Type | ts.SymbolFlags.Value, false) ===
      undefined,
  );
  if (missing.length === 0) return text;
  const clause = httpImport.importClause;
  const named = clause?.namedBindings;
  if (named === undefined || !ts.isNamedImports(named)) return text;
  const last = named.elements.at(-1);
  const end = last === undefined ? named.getStart() + 1 : last.getEnd();
  const names = missing.join(', ');
  return `${text.slice(0, end)}${last === undefined ? '' : ', '}${names}${text.slice(end)}`;
}

const MEMBERS = ['method', 'path', 'parameters', 'access'];

/** Only where the built type does not already fit the annotation: its schema types are the author's. */
const ASSIGNABLE_MEMBERS = ['requestBody'];
let stale = 0;

for (const file of files) {
  const sourceFile = program.getSourceFile(file);
  if (sourceFile === undefined) {
    console.error(`not in the project: ${file}`);
    process.exit(2);
  }
  const dictionary = dictionaryOf(sourceFile);
  const edits = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const found = routeAnnotation(statement);
    if (found === undefined || found.declaration.initializer === undefined) continue;
    const { declaration, literal } = found;
    const built = checker.getTypeAtLocation(declaration.initializer);
    const wanted = Object.fromEntries(
      MEMBERS.map((name) => [name, propertyText(built, name, declaration, dictionary)]),
    );
    const indent = ' '.repeat(literal.getStart(sourceFile) > 0 ? 2 : 0);
    for (const name of MEMBERS) {
      const member = literal.members.find((candidate) => candidate.name?.getText() === name);
      const text = wanted[name];
      if (member !== undefined && ts.isPropertySignature(member) && member.type !== undefined) {
        const property = built.getProperty(name);
        if (property !== undefined && !(property.flags & ts.SymbolFlags.Optional)) {
          const builtType = checker.getTypeOfSymbolAtLocation(property, declaration);
          const annotated = checker.getTypeFromTypeNode(member.type);
          if (checker.isTypeAssignableTo(builtType, annotated)) continue;
        }
        if (text === undefined) {
          edits.push({ start: member.getFullStart(), end: member.getEnd(), text: '' });
        } else if (squash(member.type.getText(sourceFile)) !== squash(text)) {
          edits.push({ start: member.type.getStart(sourceFile), end: member.type.getEnd(), text });
        }
      } else if (text !== undefined) {
        const after = literal.members.find(
          (candidate) => candidate.name?.getText() === 'parameters',
        );
        const at = after?.getEnd() ?? literal.members.at(-1).getEnd();
        edits.push({ start: at, end: at, text: `\n${indent}${name}: ${text};` });
      }
    }
    for (const name of ASSIGNABLE_MEMBERS) {
      const member = literal.members.find((candidate) => candidate.name?.getText() === name);
      const property = built.getProperty(name);
      if (member === undefined || !ts.isPropertySignature(member) || member.type === undefined)
        continue;
      if (property === undefined) continue;
      const builtType = checker.getTypeOfSymbolAtLocation(property, declaration);
      const annotated = checker.getTypeFromTypeNode(member.type);
      if (!checker.isTypeAssignableTo(builtType, annotated)) {
        edits.push({
          start: member.type.getStart(sourceFile),
          end: member.type.getEnd(),
          text: shortened(printType(builtType, declaration), dictionary),
        });
      }
    }
    syncResponses(built, literal, declaration, sourceFile, dictionary, edits);
  }
  if (edits.length === 0) continue;
  stale += edits.length;
  if (check) {
    console.error(`${file}: ${String(edits.length)} annotation member(s) out of line`);
    if (process.env.DEBUG_SYNC)
      for (const edit of edits.slice(0, 4))
        console.error(
          JSON.stringify(edit.text).slice(0, 600),
          '<-',
          JSON.stringify(readFileSync(file, 'utf8').slice(edit.start, edit.end)).slice(0, 600),
        );
    continue;
  }
  let text = readFileSync(file, 'utf8');
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  }
  text = withImports(text, sourceFile, edits.map((edit) => edit.text).join(' '));
  writeFileSync(file, text);
  console.log(`${file}: ${String(edits.length)} annotation member(s) written`);
}
if (check && stale > 0) process.exit(1);
