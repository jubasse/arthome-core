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
//   - the quoted text must appear VERBATIM in the file, so an entry cannot name a
//     sentence that was never there;
//   - an entry whose quotation is GONE is an error, not a silent no-op, so the
//     exemption expires the day the sentence it protects does. A stale allowance
//     is the rot this gate exists to find;
//   - the quotation must cover at most MAX_QUOTED_LINES lines.
//
// The third property was added after the first two proved insufficient. Verbatim
// guarantees the quote EXISTS; it does not guarantee it is NARROW. A quotation of
// `"e"` appears verbatim in almost every line, so it skipped every line and the
// whole file passed — a blanket pass through the front door, defeating exactly the
// property the verbatim rule was there to provide. Demonstrated in a scratch
// repository rather than argued.
//
// The first attempt at a fix was worse than the hole: require the quotation to
// contain a word from FRENCH. That rejected `les quatorze entrées de navigation`,
// which is manifestly French, because this list is deliberately NARROW — it holds
// only words that cannot be English or an identifier, which is what makes it
// precise at DETECTION. A list tuned for precision in detection is the wrong
// instrument for judging coverage in validation, and reusing it inverted its
// purpose.
//
// So the bound is structural rather than linguistic: a quotation may cover a
// quotation, not a document. It needs no view about language, and it is what
// actually limits the damage — `"e"` covers every line and is refused on that
// ground alone. Needing more lines than the cap means the right category is a file
// exemption, which has to be declared and read as one.
const QUOTATIONS = allow.quotations?.allow ?? [];

const MAX_QUOTED_LINES = 3;

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
/**
 * A cited token is data, not prose: `\`jamais\`` in a sentence about detecting French
 * is the WORD, the way a fenced block is the CODE.
 *
 * ⚠ THE CAP IS STRUCTURAL — NO WHITESPACE INSIDE THE SPAN — AND THAT IS THE WHOLE
 *   DIFFERENCE BETWEEN A CITED TOKEN AND A QUOTED SENTENCE.
 *
 *   A document about a French-detection gate has to be able to name the words it
 *   detects. `jamais`, `dans`, `depuis`, `fichier` written as evidence for WHY a
 *   miss would have been caught are data — the same data the FRENCH array below
 *   holds, which passes only because in a .js file an array is code and not a
 *   comment. The same tokens must not become prose by being discussed.
 *
 *   `les quatorze entrées de navigation` is a different thing: a French SENTENCE,
 *   and it stays reported. A span with spaces in it is a quotation, and a quotation
 *   goes through tools/language.allow.json with its reason — not through a silent
 *   widening here.
 *
 *   This is the narrow instrument again (§5.3.1): stripping every inline span would
 *   let a paragraph of French hide behind backticks, and stripping none makes the
 *   document unable to cite its own subject. Whitespace separates the two cases
 *   without a word list, so it does not drift.
 *
 *   Applied to BOTH kinds of prose — Markdown and code comments — from one place.
 *   The backtick convention is the same in a `.md` paragraph and in a `//` comment,
 *   and this gate's own source is the proof: it cites those four words in a comment
 *   explaining this very function. Two copies of this rule would be a parallel table
 *   in the gate that exists to keep prose honest.
 */
function stripCitedTokens(line) {
  return line.replace(/`+[^`\s]+`+/g, ' ');
}

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
  // ⚠ JSON IS NOT COMMENT-FREE IN THIS PROJECT, BUT IT IS NOT HANDLED HERE EITHER.
  //   Both of its prose forms — `//` comments and `_comment` arrays — are handled in
  //   the JSON branch of commentsOfSource, against a STRING-MASKED projection of the
  //   line. Putting them in this table was the first attempt and it was wrong: a
  //   block marker of `/*` is opened by the glob `"prototypes/*.dc.html"`, which
  //   never closes, so every remaining line of tools/language.allow.json was read as
  //   comment prose and the file reported four French words it does not have.
  //   A glob looks exactly like a comment marker. Deciding by raw text cannot tell
  //   them apart; deciding outside string literals can.
  '.json': { line: [], block: [] },
};

/** The keys this project uses to carry prose inside JSON. */
const JSON_PROSE_KEY =
  /"(_comment[\p{L}\p{N}_]*|_why|why|reason|description|summary)"\s*:\s*(.*)$/u;

/**
 * The line with every string literal's CONTENTS blanked out, same length.
 *
 * Length-preserving on purpose: callers need indices into the original line, so
 * deleting the strings instead of masking them would shift every position after the
 * first quote. What is left is the line's STRUCTURE — its real brackets and its real
 * comment markers — with the data removed.
 */
function maskStrings(line) {
  return line.replace(/"(?:[^"\\]|\\.)*"/g, (m) => `"${'x'.repeat(Math.max(0, m.length - 2))}"`);
}

/** Net bracket depth of a line, counting only brackets outside string literals. */
function brackets(line) {
  let d = 0;
  for (const c of maskStrings(line)) {
    if (c === '[') d += 1;
    else if (c === ']') d -= 1;
  }
  return d;
}

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
  // Open-bracket depth of a JSON prose value currently being consumed.
  let jsonProse = 0;
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

    // Inside a multi-line JSON prose array: every element line is prose.
    if (jsonProse > 0) {
      out.push([n, line]);
      jsonProse += brackets(line);
      return;
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
    // This project's JSON prose lives in `_comment` and a few named keys, so those
    // ARE its comments. Both halves below were defects, found by a French comment
    // that sat in `packages/core/tsconfig.build.json` for three days:
    //
    //   ⚠ THE VALUE IS USUALLY A MULTI-LINE ARRAY, AND A SINGLE-LINE REGEX SEES `[`.
    //     Every `_comment` in this repository is written as an array of lines. The
    //     previous pattern captured the rest of the KEY's line — which is `[` — and
    //     the element lines that hold the actual prose were never looked at. The word
    //     list was never the problem: the missed text scored four distinct French
    //     words against a threshold of three. The mechanism covered the one form the
    //     project barely uses (`"description": "one line"`) and missed the form it
    //     uses everywhere. A gate's guarantee is only as wide as its mechanism.
    //
    //   ⚠ `_comment_exports` AND `_comment_peer` ARE ALSO PROSE.
    //     `@arthome/contracts` names its blocks that way because one file carries
    //     several. An exact-match key list silently exempted them.
    if (ext === '.json') {
      // A `//` that is really a comment, and not one inside a string: tsconfig.json
      // is JSONC and the root one carries its reasoning in `//` lines. Decided on the
      // masked projection, which is what keeps the glob `"a/*.html"` and the URL
      // `"https://…"` from looking like markers.
      const slashes = maskStrings(line).indexOf('//');
      if (slashes !== -1) {
        out.push([n, line.slice(slashes + 2)]);
        return;
      }
    }

    const j = line.match(JSON_PROSE_KEY);
    if (j) {
      out.push([n, j[2]]);
      // Depth is counted on the line with STRING CONTENTS REMOVED. A `_comment`
      // line may legitimately contain a bracket as prose — the root tsconfig.json
      // writes `types: ["node"]` inside one — and counting those would end the
      // array early or never.
      jsonProse += brackets(j[2]);
    }
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

  const lines = (prose ? proseOfMarkdown(text) : commentsOfSource(text, ext)).map(([n, line]) => [
    n,
    stripCitedTokens(line),
  ]);
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
  const live = quotes.filter((q) => text.includes(q.quote) && q.reason);
  // A quotation may cover a quotation, not a document. More lines than this and the
  // right category is a file exemption — which must be declared, and read, as one.
  for (const q of live) {
    const covered = text.split('\n').filter((l) => l.includes(q.quote)).length;
    if (covered > MAX_QUOTED_LINES) {
      staleQuotations.push(
        `${file}: the exempted quotation covers ${covered} lines, the limit is ${MAX_QUOTED_LINES} —\n` +
          `      ${JSON.stringify(q.quote)}\n` +
          `      A quotation that matches this much of a file is acting as a file exemption.\n` +
          `      Quote the specific sentence, or declare a file exemption and say why.`,
      );
    }
  }
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

if (!QUIET) {
  // THE VERDICT STATES ITS MECHANISM, because the name promises more than the
  // mechanism delivers — the same correction check-core-entry carries.
  //
  //   `translator-docs` found, on its last turn, that this gate decides on a
  //   stop-word list of FUNCTION WORDS while the product's vocabulary is
  //   entirely CONTENT WORDS, so a French label or copy string passes and a
  //   later tidy-up that anglicises one looks exactly as clean as leaving it.
  //
  //   `conventions` disagreed about the remedy and is right: this is a NAMING
  //   defect, not a detection defect. Function words are where SENTENCES live,
  //   and a sentence is what this gate detects. It cannot detect French TERMS,
  //   and no stop-word list can, because a content word is exactly what a
  //   legitimate product vocabulary is made of — `billetterie` is French AND a
  //   domain term. The two are separable only by POSITION, which this gate
  //   already handles structurally: the same term is data in a vocabulary
  //   constant and a defect in a comment. A gate that shouts on `billetterie`
  //   gets switched off, which is D-024.
  //
  //   So the scope is said out loud rather than widened. What is still owed is
  //   the rename itself — this remains `check-language` while guaranteeing
  //   something narrower than that name claims.
  console.log('PASS no French prose in a committed file');
  console.log(
    `  (scope: French SENTENCES — function words at a threshold of ${THRESHOLD}. An isolated`,
  );
  console.log('   French TERM in a comment is not detected, and cannot be by a word list:');
  console.log('   a content word is exactly what a product vocabulary is made of.)');
}
