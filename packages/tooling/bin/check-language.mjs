#!/usr/bin/env node
// arthome-check-language — everything committed is written in English.
//
// WHAT IT GUARANTEES
//   No French prose in a committed file: not in documentation, not in a code
//   comment, not in a message a gate prints when it fails.
//
// WHY THIS IS A GATE AND NOT A DISCIPLINE
//   A repository written by eleven agents over several sessions drifts one file
//   at a time, and the drift is invisible: the code compiles, the tests pass,
//   and a French comment reads perfectly well TO THE PERSON WHO WROTE IT. This
//   is the same failure profile as the parallel literal table (E2) — nothing
//   reports it, and by the time anyone notices, forty files have it.
//
// HOW IT DECIDES
//   A stop-word list, and a THRESHOLD. Not one word: one word is how you get
//   false positives, and a gate that shouts wrongly gets disabled (D-024). The
//   list holds only words that do not exist in English and are not plausible
//   identifiers — `en`, `la`, `son`, `car`, `pas`, `on` are deliberately absent
//   because each of them is either an English word or a locale code, and this
//   repository is full of both.
//
//   It checks PROSE: all of a Markdown file except its fenced code blocks, and
//   in source files only the comments. A French string literal is data and gets
//   judged by whoever owns the data, not here.
//
// WHAT IT DOES NOT JUDGE
//   The product's own vocabulary, and the verbatim copy of the read-only design
//   handoff. Both are in tools/language.allow.json, each with its reason.
//
// See DECISIONS.md and tools/language.allow.json.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CWD = process.cwd();
const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const VERBOSE = args.includes('--verbose');

const ALLOW_FILE = path.join(CWD, 'tools', 'language.allow.json');
const allow = fs.existsSync(ALLOW_FILE) ? JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf8')) : {};
const ALLOWED = (allow.allow ?? []).map((e) => e.path);
const EXTRACT = allow.extractBlocks ?? null;

// Words that are French, are not English, and are not plausible identifiers.
// Every addition here must survive the question: "could this appear in English
// prose, in a file path, in a locale code or in a variable name?"
const FRENCH = [
  'qui',
  'pour',
  'avec',
  'dans',
  'cette',
  'cet',
  'nous',
  'vous',
  'donc',
  'mais',
  'sont',
  'être',
  'était',
  'elle',
  'leur',
  'leurs',
  'sans',
  'sous',
  'toute',
  'toutes',
  'tous',
  'chaque',
  'ainsi',
  'alors',
  'depuis',
  'jamais',
  'toujours',
  'plusieurs',
  'doit',
  'doivent',
  'peut',
  'peuvent',
  'faut',
  'aucun',
  'aucune',
  'même',
  'déjà',
  'encore',
  'entre',
  'vers',
  'chez',
  'parce',
  'lorsque',
  'quand',
  'quoi',
  'dont',
  'ceux',
  'celle',
  'celles',
  'ici',
  'là',
  'très',
  'trop',
  'moins',
  'aussi',
  'autre',
  'autres',
  'être',
  'avoir',
  'fait',
  'une',
  'aux',
  'des',
  'les',
  'est',
  'écran',
  'écrans',
  'règle',
  'règles',
  'décision',
  'fichier',
  'fichiers',
  'porte',
  'valeur',
  'valeurs',
];
const FRENCH_RE = new RegExp(
  `(?<![\\p{L}\\p{N}_-])(${FRENCH.join('|')})(?![\\p{L}\\p{N}_-])`,
  'giu',
);

// How many DISTINCT French words a file must show before it is reported.
// Three, because two is reachable by accident — a stop-word can surface inside a
// show title or a foreign word list — and four would miss a short header comment.
const THRESHOLD = 3;

// ---------------------------------------------------------------- file lists
function tracked() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: CWD, encoding: 'utf8' });
  return out.split('\0').filter(Boolean);
}

const PROSE_EXT = new Set(['.md', '.markdown']);
const CODE_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.proto',
  '.yaml',
  '.yml',
  '.json',
  '.html',
  '.css',
  '.sh',
  '.sql',
]);

function matchesGlob(file, pattern) {
  const rx = new RegExp(
    `^${pattern
      .split('**')
      .map((s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'))
      .join('.*')}$`,
  );
  return rx.test(file);
}

const isAllowed = (file) => ALLOWED.some((p) => matchesGlob(file, p));

// ------------------------------------------------------------------ quotations
// A THIRD CATEGORY, AND THE ONLY ONE THAT IS NOT A FILE.
//
// A record of why something was corrected will quote the thing it corrected, and
// here that thing is often French: a mockup string, a stale comment, the project
// owner's own words. Translating the quotation destroys what it is doing: a
// stale comment quoted for its wrong count, once translated, stops BEING the
// defect and becomes a claim about one (D-027b).
//
// The two file-level exemptions do not cover this, and neither should cover it:
// the arbitration log is English, and exempting the whole file would exempt the
// prose that is the point of it.
//
// So exemptions are per QUOTATION, each naming its file, its exact text and its
// reason — the shape this repository already uses for an enum literal and for an
// idempotency exemption. Two properties make it safe to have at all:
//
//   - the quoted text must appear VERBATIM in the file, so an entry cannot widen
//     into a blanket pass;
//   - an entry whose quotation is GONE is an error, not a silent no-op, so the
//     exemption expires the day the sentence it protects does. A stale allowance
//     is the rot this gate exists to find.
const QUOTATIONS = allow.quotations?.allow ?? [];

function quotationsFor(file) {
  return QUOTATIONS.filter((q) => q.file === file);
}

// ------------------------------------------------------------------ provenance
// A LINE THAT ALREADY EXISTS IN THE READ-ONLY SOURCE IS NOT OURS TO TRANSLATE.
//
// The screen extractions under prototypes/screens/ are line-range slices of the
// five mockups, and the mockups carry the DESIGNER'S OWN comments, in French.
// Those come out in the slice. Judging them by shape flagged 27 files whose
// authored prose was already English — the second false positive of this gate,
// and the same mistake as the first: reading a line without asking who wrote it.
//
// Exempting prototypes/screens/ wholesale would have exempted the authored
// headers too, which are the part worth checking. So provenance decides: the
// line is skipped if and only if it appears verbatim in a source file.
const SOURCE_GLOBS = ['prototypes/*.dc.html', 'prototypes/shared/**'];
let sourceLines = null;

function sourceLineSet(files) {
  if (sourceLines) return sourceLines;
  sourceLines = new Set();
  for (const f of files) {
    if (!SOURCE_GLOBS.some((g) => matchesGlob(f, g))) continue;
    let text;
    try {
      text = fs.readFileSync(path.join(CWD, f), 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (t.length > 12) sourceLines.add(t);
    }
  }
  return sourceLines;
}

// ------------------------------------------------------------ prose extraction
/** Markdown minus its fenced code blocks: a code sample is not prose. */
function proseOfMarkdown(text) {
  const out = [];
  let fenced = false;
  text.split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (!fenced) out.push([i + 1, line]);
  });
  return out;
}

// Comment markers BY EXTENSION, and not one set for every language.
//
// The first version took `#` after whitespace as a line comment everywhere, and
// flagged `color: #C6CDD4` in an HTML mockup — reading French interface copy as
// a French comment. A gate that shouts wrongly gets disabled (D-024), so the
// markers are declared per language instead of guessed.
const MARKERS = {
  '.ts': { line: ['//'], block: [['/*', '*/']] },
  '.tsx': { line: ['//'], block: [['/*', '*/']] },
  '.js': { line: ['//'], block: [['/*', '*/']] },
  '.jsx': { line: ['//'], block: [['/*', '*/']] },
  '.mjs': { line: ['//'], block: [['/*', '*/']] },
  '.cjs': { line: ['//'], block: [['/*', '*/']] },
  '.proto': { line: ['//'], block: [['/*', '*/']] },
  '.css': { line: [], block: [['/*', '*/']] },
  '.py': { line: ['#'], block: [] },
  '.sh': { line: ['#'], block: [] },
  '.yaml': { line: ['#'], block: [] },
  '.yml': { line: ['#'], block: [] },
  // In HTML, `//` is not a comment (`https://`, a CSS value) and `#` is a
  // colour or a fragment. Only the SGML comment counts — plus `/* */`, which
  // appears inside <style> and <script>.
  '.html': {
    line: [],
    block: [
      ['<!--', '-->'],
      ['/*', '*/'],
    ],
  },
  // JSON has no comments at all. Its prose lives in the named keys below.
  '.json': { line: [], block: [] },
};

/**
 * Source files: the comments only. A French STRING is data — the taxonomy, a
 * fixture, a copy key — and it is not this gate's business. A French COMMENT is
 * ours.
 */
function commentsOfSource(text, ext) {
  const marks = MARKERS[ext] ?? { line: [], block: [] };
  const out = [];
  let block = null;
  let inExtract = false;
  text.split('\n').forEach((raw, i) => {
    const n = i + 1;
    const line = raw;

    if (EXTRACT) {
      if (!inExtract && line.includes(EXTRACT.open)) inExtract = true;
      else if (inExtract && line.includes(EXTRACT.close)) {
        inExtract = false;
        return;
      }
      if (inExtract) return;
    }

    if (block) {
      out.push([n, line]);
      if (line.includes(block)) block = null;
      return;
    }
    const opened = marks.block.find(([o]) => line.includes(o));
    if (opened) {
      out.push([n, line]);
      if (!line.slice(line.indexOf(opened[0]) + opened[0].length).includes(opened[1])) {
        block = opened[1];
      }
      return;
    }
    for (const marker of marks.line) {
      const i = line.indexOf(marker);
      // A marker must start the line or follow whitespace: `https://` and
      // `a#b` are not comments.
      if (i !== -1 && (i === 0 || /\s/.test(line[i - 1]))) {
        out.push([n, line.slice(i + marker.length)]);
        break;
      }
    }
    // A JSON file has no comments, but this project uses `_comment` and
    // `reason` keys for exactly that purpose, so they count as prose.
    const j = line.match(/"(?:_comment|_why|reason|why|description)"\s*:\s*(.*)$/);
    if (j) out.push([n, j[1]]);
  });
  return out;
}

// ------------------------------------------------------------------------ main
const files = tracked();
const reported = [];
const skipped = [];
const staleQuotations = [];
let checked = 0;

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  const prose = PROSE_EXT.has(ext);
  if (!prose && !CODE_EXT.has(ext)) continue;
  if (isAllowed(file)) {
    skipped.push(file);
    continue;
  }
  const abs = path.join(CWD, file);
  let text;
  try {
    text = fs.readFileSync(abs, 'utf8');
  } catch {
    continue;
  }
  checked += 1;

  const lines = prose ? proseOfMarkdown(text) : commentsOfSource(text, ext);
  // Inside prototypes/, a line lifted verbatim from a mockup is the designer's,
  // not ours. Checked by provenance, never assumed from the directory.
  const src = file.startsWith('prototypes/') ? sourceLineSet(files) : null;
  // Declared quotations, checked against the file before they are honoured: one
  // that has gone is an error rather than a silent no-op.
  const quotes = quotationsFor(file);
  for (const q of quotes) {
    if (!q.reason || !String(q.reason).trim()) {
      staleQuotations.push(`${file}: a quotation exemption carries no reason.`);
    } else if (!text.includes(q.quote)) {
      staleQuotations.push(
        `${file}: the exempted quotation is no longer in the file —\n      ${JSON.stringify(q.quote)}\n      Remove the entry from tools/language.allow.json; it now exempts nothing.`,
      );
    }
  }
  const live = quotes.filter((q) => text.includes(q.quote));
  const words = new Map(); // word -> first line
  for (const [n, line] of lines) {
    if (src && src.has(line.trim())) continue;
    if (live.some((q) => line.includes(q.quote))) continue;
    for (const m of line.matchAll(FRENCH_RE)) {
      const w = m[1].toLowerCase();
      if (!words.has(w)) words.set(w, n);
    }
  }
  if (words.size >= THRESHOLD) reported.push({ file, words });
}

if (!QUIET) {
  console.log(
    `arthome-check-language: ${checked} file(s) checked, ${skipped.length} allowed by tools/language.allow.json`,
  );
  if (VERBOSE) for (const s of skipped) console.log(`  allowed  ${s}`);
}

if (staleQuotations.length) {
  console.error(`\nFAIL ${staleQuotations.length} stale quotation exemption(s):\n`);
  for (const s of staleQuotations) console.error(`  ${s}`);
  console.error(
    '\n  A quotation exemption is honoured only while the quotation is there. One\n' +
      '  that outlives its sentence is a standing hole with nobody behind it, which\n' +
      '  is the rot this gate exists to find.',
  );
  process.exit(1);
}

if (reported.length) {
  console.error(`\nFAIL ${reported.length} file(s) still carry French prose:\n`);
  for (const { file, words } of reported) {
    const sample = [...words.entries()]
      .sort((a, b) => a[1] - b[1])
      .slice(0, 6)
      .map(([w, n]) => `${w}:${n}`)
      .join(', ');
    console.error(`  ${file}`);
    console.error(`    ${words.size} French word(s) — ${sample}`);
  }
  console.error(
    '\n  Everything committed is written in English: documentation, comments, and the\n' +
      "  messages a gate prints. French survives only as the product's own vocabulary\n" +
      '  and as the verbatim copy of the read-only handoff — both in\n' +
      '  tools/language.allow.json, each with its reason. Translate the file; do not\n' +
      '  add an entry there to make this pass.',
  );
  process.exit(1);
}

if (!QUIET) console.log('PASS no French prose in a committed file');
