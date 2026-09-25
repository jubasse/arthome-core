#!/usr/bin/env node
// arthome-comment-density — how much of each file is comment, sorted by the worst.
//
// ⚠ IT IS A REPORT AND IT MUST NEVER BECOME A GATE. It always exits 0, it is not in
//   `verify`, and wiring it into one would be a defect rather than an improvement.
//   code-conventions.md §5.10 sets the quarter-of-a-file mark as a SMELL, not a
//   limit, and says in as many words: "never delete a recorded reason to satisfy a
//   ratio". A gate on this number instructs the next agent to do exactly that — and
//   the lines it would delete first are the measured failures, which are the most
//   expensive prose in the repository. The number opens the question "is this code
//   unclear?"; it never answers it.
//
// HOW IT DECIDES
//   Tracked files only (`git ls-files`), so it never descends into node_modules or
//   dist and behaves the same in every repository. Per file: comment lines over
//   NON-BLANK lines. Excess is the count above the quarter mark.
//
// BESIDE THE RATIO, TWO STRUCTURAL NUMBERS, because the ratio alone points at the
// wrong files. A 28-line header over 43 lines of code reads as 39 % and is exactly the
// prose this project values most; forty lines defending a twelve-line configuration
// object reads lower and is the defect §5.10 names. So each row also carries the size
// of the file's HEADER block and its longest NON-header run, with the line it starts
// on. Both are counted, never interpreted: a run is consecutive comment lines broken
// by a line of code, which is simply how much prose a reader crosses before the next
// code. Sort by either (`--by block`).
//
// ⚠ WHAT THIS TOOL REFUSES TO DETECT, and the refusal is the design.
//   An orphaned JSDoc — one left above nothing after its declaration was deleted — is
//   nearly mechanical, and it is still not here. Two reasons. Deciding what counts as
//   "a declaration" is a judgement about intent, and a report that shouts wrongly gets
//   switched off exactly as a gate does (D-024). The stronger reason: an orphaned
//   JSDoc and a comment claiming a name the file no longer owns are one class —
//   comments that became FALSE — and the second is undetectable by any lexical tool.
//   Shipping a detector for the half that is easy would advertise coverage of the
//   class, which is `workspace.mjs`'s "a green gate that checks nothing" wearing a
//   different hat. Staleness is found by reading, and by the gates that compare a
//   claim against its source.
//
// WHERE THE MECHANISM STOPS — stated, because a ratio invites more belief than it earns
//   - it cannot tell a measured failure from narration, and it cannot see the three
//     shapes §5.10 names: a defended default, a comment on a self-documenting option,
//     or a comment explaining an ABSENCE. That last one no counter can reach — there
//     is nothing at the place where it rots. A file at 40 % may be correct and a file
//     at 10 % unreadable; this says where to look, never what to do;
//   - it counts lines, not value. A licence header and a recorded defect weigh the same;
//   - Markdown and JSON are not measured. A .md file is prose by construction, and
//     JSON has no comment syntax — this project's `_comment` arrays are prose carried
//     as data, so counting them would report every configuration file as all comment;
//   - it measures IMPLEMENTATION files only. `.d.ts`, `.proto` and `.yaml` declare
//     rather than execute, so §5.10's question — "is the CODE unclear?" — has no
//     answer there, and their comments are usually the entire point: this repository's
//     own `pnpm-workspace.yaml` is 85 % comment because it records why each dependency
//     was approved. Naming such a file would invite deleting exactly that.
//     `check-enums` and `check-language` already skip `.d.ts`;
//     ⚠ arthome-core COMMITS `packages/*/dist/`, so without the path skip the report
//       is dominated by 76 generated declaration files nobody edits;
//   - a blank line inside a block comment counts as neither comment nor code;
//   - generated files are excluded by MARKER, so a generator that writes no marker is
//     measured like hand-written code.
//
// ⚠ THE GENERATED MARKER IS NOT NEAR THE TOP, AND A BYTE PREFIX MISSES IT.
//   protobuf-es writes `@generated` on LINE 16, after copying the .proto's own leading
//   comment block. Measured: a 400-character window missed five generated files, which
//   contributed 1 461 phantom excess lines to the first measurement this tool replaces
//   — more than half the total reported. So the window is a LINE count, deliberately
//   generous, and read from text rather than from a byte slice.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CWD = process.cwd();
const args = process.argv.slice(2);
const LIMIT = Number(arg('top', '0')) || 0;
const ALL = args.includes('--all');
const THRESHOLD = Number(arg('threshold', '0.25'));
// ⚠ EVERY OPTION'S VALUE, or it is read as a path. `--by block` measured a file named
//   "block", found none, and printed the empty-repository line as though the
//   repository held no source.
const OPTION_VALUES = new Set(
  [arg('top', ''), arg('threshold', ''), arg('by', '')].filter(Boolean),
);

function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

/** Lines of a file's head searched for a generated marker. See the header. */
const GENERATED_WINDOW_LINES = 40;
const GENERATED_MARKER = /@generated\b|Code generated by|DO NOT EDIT/i;

/** Comment syntax per extension. An extension absent here is not measured. */
const SYNTAX = {
  '.ts': { line: ['//'], block: [['/*', '*/']] },
  '.tsx': { line: ['//'], block: [['/*', '*/']] },
  '.mts': { line: ['//'], block: [['/*', '*/']] },
  '.cts': { line: ['//'], block: [['/*', '*/']] },
  '.js': { line: ['//'], block: [['/*', '*/']] },
  '.jsx': { line: ['//'], block: [['/*', '*/']] },
  '.mjs': { line: ['//'], block: [['/*', '*/']] },
  '.cjs': { line: ['//'], block: [['/*', '*/']] },
  '.css': { line: [], block: [['/*', '*/']] },
  '.scss': { line: ['//'], block: [['/*', '*/']] },
  '.py': { line: ['#'], block: [] },
  '.sh': { line: ['#'], block: [] },
  '.bash': { line: ['#'], block: [] },
  '.sql': { line: ['--'], block: [['/*', '*/']] },
};

const SKIP_PATH =
  /(^|\/)(node_modules|dist|build|coverage|vendor|\.next|out)(\/|$)|\.min\.[jc]ss?$|\.d\.[cm]?ts$/;

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: CWD, encoding: 'utf8' });
  return out.split('\0').filter(Boolean);
}

/**
 * ⚠ A CITED MARKER IS DATA, NOT A MARKER — and this file is the proof: its own header
 *   names `@generated` as the thing it looks for, inside the window, so the first
 *   version excluded ITSELF from its own report. Backticked spans are stripped for the
 *   same reason and by the same structural rule `check-language` uses: no whitespace
 *   inside the span. Generators write the tag bare, so nothing real is lost.
 */
function isGenerated(text) {
  const head = text
    .split('\n', GENERATED_WINDOW_LINES)
    .join('\n')
    .replace(/`+[^`\s]+`+/g, ' ');
  return GENERATED_MARKER.test(head);
}

/**
 * The line with every string literal's contents blanked out, same length.
 *
 * ⚠ WITHOUT THIS, A GLOB IS A COMMENT MARKER. `check-language` learned it the
 *   expensive way: the string `"prototypes/*.dc.html"` opens a `/*` that never
 *   closes, and every following line of the file is read as comment prose. Masking
 *   is length-preserving because the marker's INDEX decides whether it is a comment
 *   or part of a URL.
 */
function maskStrings(line) {
  return line.replace(
    /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,
    (m) => m[0] + 'x'.repeat(Math.max(0, m.length - 2)) + m[0],
  );
}

/**
 * Comment and non-blank line counts for one file's text.
 *
 * ⚠ WHICHEVER MARKER COMES FIRST ON THE LINE DECIDES, and getting that backwards was
 *   a real defect in this file. Checking for a block opener before a line marker made
 *   `//   - directories below packages/*\/src/*` — a LINE comment in check-map.mjs —
 *   open a `/*` that never closed, so every remaining line of the file counted as
 *   comment and it reported 99 % against a true 41 %. It is the same fault
 *   `check-language` records for the glob `"prototypes/*.dc.html"`, in the variant
 *   masking cannot reach: the text is not in a string, it is in a comment.
 *
 * A line counts only when the comment STARTS it. A trailing `// note` after code is
 * not a comment line — the code is what that line is for — but a block opened
 * mid-line still has its state tracked, or everything after it is misread.
 */
function measure(text, syntax) {
  let comment = 0;
  let nonBlank = 0;
  let closing = null;

  // Runs of consecutive comment lines, broken by a line of code. A blank line does not
  // break one: two paragraphs with a gap are still one stretch of prose to cross.
  const runs = [];
  let run = 0;
  let runStart = 0;
  let lineNumber = 0;
  const endRun = () => {
    if (run > 0) runs.push({ lines: run, at: runStart });
    run = 0;
  };
  const countComment = () => {
    comment += 1;
    if (run === 0) runStart = lineNumber;
    run += 1;
  };

  for (const raw of text.split('\n')) {
    lineNumber += 1;
    if (raw.trim() === '') continue;
    nonBlank += 1;

    if (closing !== null) {
      countComment();
      if (raw.includes(closing)) closing = null;
      continue;
    }

    const masked = maskStrings(raw);

    // A line marker counts only at the start of the line or after whitespace, so
    // `https://` and a shell `a#b` are not markers.
    let lineAt = -1;
    for (const marker of syntax.line) {
      const at = masked.indexOf(marker);
      if (at === -1 || !(at === 0 || /\s/.test(masked[at - 1]))) continue;
      if (lineAt === -1 || at < lineAt) lineAt = at;
    }

    let blockAt = -1;
    let block = null;
    for (const pair of syntax.block) {
      const at = masked.indexOf(pair[0]);
      if (at === -1 || (blockAt !== -1 && at >= blockAt)) continue;
      blockAt = at;
      block = pair;
    }

    if (blockAt !== -1 && (lineAt === -1 || blockAt < lineAt)) {
      if (masked.slice(0, blockAt).trim() === '') countComment();
      else endRun();
      if (!masked.slice(blockAt + block[0].length).includes(block[1])) closing = block[1];
      continue;
    }
    if (lineAt !== -1 && masked.slice(0, lineAt).trim() === '') countComment();
    else endRun();
  }
  endRun();

  // The header is the run the file opens with, a shebang allowed before it. It is the
  // file's contract and §5.10 exempts it by name, so it is reported and never ranked.
  const first = runs[0];
  const header = first && first.at <= 2 ? first.lines : 0;
  const body = header ? runs.slice(1) : runs;
  const longest = body.reduce((worst, r) => (r.lines > worst.lines ? r : worst), {
    lines: 0,
    at: 0,
  });

  return { comment, nonBlank, header, longest };
}

// Explicit paths measure exactly those files and skip the walk — which is how a
// before/after is produced with THIS code rather than a probe that can drift from it.
const explicit = args.filter((a) => !a.startsWith('--') && !OPTION_VALUES.has(a));
const scanned = explicit.length ? explicit : trackedFiles();

const rows = [];
let considered = 0;
let generated = 0;

for (const file of scanned) {
  if (!explicit.length && SKIP_PATH.test(file)) continue;
  const syntax = SYNTAX[path.extname(file).toLowerCase()];
  if (!syntax) continue;

  let text;
  try {
    text = fs.readFileSync(path.resolve(CWD, file), 'utf8');
  } catch {
    continue;
  }
  if (isGenerated(text)) {
    generated += 1;
    continue;
  }

  const { comment, nonBlank, header, longest } = measure(text, syntax);
  // A file with no code lines has no ratio to report, and dividing by it is how a
  // repository holding only Markdown becomes a crash instead of a silent zero.
  if (nonBlank === 0) continue;
  considered += 1;

  const ratio = comment / nonBlank;
  const excess = comment - Math.floor(nonBlank * THRESHOLD);
  if (ALL || ratio > THRESHOLD)
    rows.push({ file, comment, nonBlank, ratio, excess, header, longest });
}

const BY_BLOCK = arg('by', '') === 'block';
rows.sort((a, b) =>
  BY_BLOCK
    ? b.longest.lines - a.longest.lines || b.excess - a.excess
    : b.excess - a.excess || b.ratio - a.ratio,
);

const over = rows.filter((r) => r.ratio > THRESHOLD);
const totalExcess = over.reduce((sum, r) => sum + r.excess, 0);
const pct = (r) => `${Math.round(r * 100)}%`;

// Zero files is a legitimate, silent result: arthome-storefront-web and
// arthome-studio-web hold only CLAUDE.md and README.md today.
if (considered === 0) {
  console.log('arthome-comment-density: no measurable source file (report only, nothing to do)');
  process.exit(0);
}

console.log(
  `arthome-comment-density: ${considered} file(s) measured, ${generated} generated file(s) ` +
    `excluded, ${over.length} above ${pct(THRESHOLD)} (${totalExcess} excess line(s))`,
);

const shown = LIMIT > 0 ? rows.slice(0, LIMIT) : rows;
if (shown.length) console.log('  ratio  excess  comment/code   header   longest run  file');
for (const r of shown) {
  const longest = r.longest.lines ? `${r.longest.lines} @L${r.longest.at}` : '-';
  console.log(
    `  ${String(pct(r.ratio)).padStart(5)}  ${String(r.excess).padStart(6)}  ` +
      `${String(`${r.comment}/${r.nonBlank}`).padStart(11)}  ${String(r.header || '-').padStart(6)}  ` +
      `${longest.padStart(11)}  ${r.file}`,
  );
}
if (shown.length < rows.length) console.log(`  … and ${rows.length - shown.length} more`);

console.log(
  '\n  A report, never a gate: §5.10 makes the quarter mark a smell, not a limit.\n' +
    '  `header` is exempt by §5.10 and is shown, not ranked. `longest run` is where to\n' +
    '  look first: forty lines defending a twelve-line object is the shape the rule\n' +
    '  names, and it does not need a high ratio to be there.\n' +
    '  Never delete a measured failure to move any of these numbers.',
);
