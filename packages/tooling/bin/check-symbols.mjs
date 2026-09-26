#!/usr/bin/env node
// arthome-check-symbols — no warning sign, check mark, cross or emoji in a committed file:
// not in a comment, a document, a JSON prose field or a line a gate prints.
//
// A warning is a sentence that says what breaks (code-conventions.md §5.10). The symbols were
// removed from every repository on 2026-09-26; a rule nobody checks drifts back one file at a time.
//
// Markdown inline code is exempt, because the rule itself has to name the symbols it forbids.
// Anything else goes in tools/symbols.allow.json, with its reason. Typographic punctuation
// (arrows, dashes, section signs) is not concerned.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CWD = process.cwd();

// Written as escapes so this file passes its own check.
const FORBIDDEN = /[\u26A0\u2605\u2606\u2610-\u2612\u2713-\u2718]|\uFE0F|\p{Emoji_Presentation}/gu;
const INLINE_CODE = /``[^`].*?``|`[^`]+`/g;

const ALLOW_FILE = path.join(CWD, 'tools', 'symbols.allow.json');
const allowed = fs.existsSync(ALLOW_FILE)
  ? JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf8')).allow.map((entry) => entry.path)
  : [];

function globToRegExp(pattern) {
  const body = pattern
    .split('**')
    .map((part) => part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'))
    .join('.*');
  return new RegExp(`^${body}$`);
}
const allowedPatterns = allowed.map(globToRegExp);

const files = execFileSync('git', ['ls-files', '-z'], { cwd: CWD, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const findings = [];
let read = 0;
for (const file of files) {
  if (allowedPatterns.some((pattern) => pattern.test(file))) continue;
  const absolute = path.join(CWD, file);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) continue;
  const bytes = fs.readFileSync(absolute);
  if (bytes.includes(0)) continue;
  read += 1;

  const markdown = /\.(md|markdown)$/.test(file);
  bytes
    .toString('utf8')
    .split('\n')
    .forEach((line, index) => {
      const scanned = markdown
        ? line.replace(INLINE_CODE, (code) => ' '.repeat(code.length))
        : line;
      for (const match of scanned.matchAll(FORBIDDEN)) {
        const codePoint = match[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
        findings.push(
          `  ${file}:${index + 1}:${match.index + 1}  U+${codePoint}  ${line.trim().slice(0, 100)}`,
        );
      }
    });
}

console.log(
  `arthome-check-symbols: ${read} committed file(s) read, ${allowed.length} path(s) allowed`,
);
if (findings.length === 0) {
  console.log('PASS no warning sign, check mark, cross or emoji');
  process.exit(0);
}
console.error(
  `\nFAIL ${findings.length} symbol(s). Say it in words (code-conventions.md §5.10):\n`,
);
for (const finding of findings) console.error(finding);
process.exit(1);
