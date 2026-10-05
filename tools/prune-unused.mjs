#!/usr/bin/env node
/**
 * Removes what a module no longer uses once its routes moved out: unused imports, and top-level
 * consts nothing reads (a builder, a local vocabulary), until nothing more goes. Exports are kept.
 *
 *   node tools/prune-unused.mjs packages/contracts/src/studio-api/run.ts ...
 *
 * Then `pnpm run fix`: the language service leaves the formatting to Prettier.
 */

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(`${process.cwd()}/`);
const ts = require('typescript');

const files = process.argv.slice(2).map((file) => resolve(file));
if (files.length === 0) {
  console.error('usage: prune-unused.mjs <module.ts>...');
  process.exit(2);
}

const root = resolve('packages/contracts');
const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);

const edited = new Map();
const versions = new Map();
const read = (file) => edited.get(file) ?? ts.sys.readFile(file);
const write = (file, text) => {
  edited.set(file, text);
  versions.set(file, (versions.get(file) ?? 0) + 1);
};

const service = ts.createLanguageService({
  getScriptFileNames: () => [...new Set([...parsed.fileNames, ...files])],
  getScriptVersion: (file) => String(versions.get(file) ?? 0),
  getScriptSnapshot: (file) => {
    const text = read(file);
    return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
  },
  getCurrentDirectory: () => root,
  getCompilationSettings: () => parsed.options,
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  fileExists: ts.sys.fileExists,
  readFile: read,
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories,
});

const applied = (text, edits) =>
  [...edits]
    .sort((a, b) => b.span.start - a.span.start)
    .reduce(
      (out, edit) =>
        out.slice(0, edit.span.start) +
        edit.newText +
        out.slice(edit.span.start + edit.span.length),
      text,
    );

/** Top-level consts of the file that are not exported and that nothing references. */
function unreadConsts(file) {
  const sf = service.getProgram().getSourceFile(file);
  return sf.statements.filter((statement) => {
    if (!ts.isVariableStatement(statement)) return false;
    if (statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return false;
    const [declaration] = statement.declarationList.declarations;
    if (declaration === undefined || !ts.isIdentifier(declaration.name)) return false;
    const references = service.findReferences(file, declaration.name.getStart(sf)) ?? [];
    return references.flatMap((entry) => entry.references).every((use) => use.isDefinition);
  });
}

for (const file of files) {
  for (;;) {
    const imports = service
      .organizeImports(
        { type: 'file', fileName: file, mode: ts.OrganizeImportsMode.RemoveUnused },
        {},
        undefined,
      )
      .flatMap((change) => change.textChanges);
    const before = read(file);
    const after = applied(before, imports);
    if (after !== before) write(file, after);
    const unread = unreadConsts(file);
    if (unread.length === 0 && after === before) break;
    const sf = service.getProgram().getSourceFile(file);
    write(
      file,
      applied(
        read(file),
        unread.map((statement) => ({
          span: {
            start: statement.getStart(sf),
            length: statement.getEnd() - statement.getStart(sf),
          },
          newText: '',
        })),
      ),
    );
  }
  writeFileSync(file, read(file));
  console.log(`${file}: pruned`);
}
