#!/usr/bin/env node
// Removes comments that span more than one line: standalone /* ... */ blocks
// and runs of 2+ consecutive whole-line // or # comments. Leaves single-line
// and inline/trailing comments alone. Dry-run by default; pass --apply to write.
//
// Usage:
//   node scripts/remove-long-comments.mjs            # dry run, report only
//   node scripts/remove-long-comments.mjs --apply     # rewrite files
//   node scripts/remove-long-comments.mjs --apply path/to/file.ts ...

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const BLOCK_COMMENT_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".css"]);
const LINE_COMMENT_PREFIX = {
  ".js": "//",
  ".jsx": "//",
  ".ts": "//",
  ".tsx": "//",
  ".rb": "#",
};
const HANDLED_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".rb", ".css"]);

function extOf(path) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

function lineNumberAt(content, index) {
  let n = 0;
  for (let i = 0; i < index; i++) {
    if (content[i] === "\n") n++;
  }
  return n;
}

function findBlockCommentLineRanges(content) {
  const ranges = [];
  const regex = /\/\*[\s\S]*?\*\//g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const startLine = lineNumberAt(content, start);
    const endLine = lineNumberAt(content, end);
    if (endLine === startLine) continue; // single-line comment, leave it

    const lineStart = content.lastIndexOf("\n", start) + 1;
    const before = content.slice(lineStart, start);
    const lineEnd = content.indexOf("\n", end);
    const after = content.slice(end, lineEnd === -1 ? content.length : lineEnd);

    if (before.trim() === "" && after.trim() === "") {
      ranges.push([startLine, endLine]);
    }
  }
  return ranges;
}

function findRubyBeginEndRanges(content) {
  const ranges = [];
  const regex = /^=begin[\s\S]*?^=end.*$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    ranges.push([lineNumberAt(content, start), lineNumberAt(content, end)]);
  }
  return ranges;
}

function findLineCommentRunRanges(lines, prefix, alreadyMarked) {
  const ranges = [];
  let i = 0;
  while (i < lines.length) {
    if (alreadyMarked.has(i) || !lines[i].trim().startsWith(prefix)) {
      i++;
      continue;
    }
    const runStart = i;
    let j = i;
    while (j < lines.length && !alreadyMarked.has(j) && lines[j].trim().startsWith(prefix)) {
      j++;
    }
    if (j - runStart >= 2) {
      ranges.push([runStart, j - 1]);
    }
    i = j;
  }
  return ranges;
}

function processFile(content, ext) {
  const toDelete = new Set();
  const blocks = [];

  const blockRanges = ext === ".rb" ? findRubyBeginEndRanges(content) : BLOCK_COMMENT_EXTS.has(ext) ? findBlockCommentLineRanges(content) : [];
  for (const [start, end] of blockRanges) {
    for (let l = start; l <= end; l++) toDelete.add(l);
    blocks.push([start, end]);
  }

  const lines = content.split("\n");
  const prefix = LINE_COMMENT_PREFIX[ext];
  if (prefix) {
    const runRanges = findLineCommentRunRanges(lines, prefix, toDelete);
    for (const [start, end] of runRanges) {
      for (let l = start; l <= end; l++) toDelete.add(l);
      blocks.push([start, end]);
    }
  }

  if (blocks.length === 0) return null;

  blocks.sort((a, b) => a[0] - b[0]);
  const newContent = lines.filter((_, idx) => !toDelete.has(idx)).join("\n");
  return { newContent, blocks, lines };
}

function trackedFiles(args) {
  if (args.length > 0) return args;
  const out = execFileSync("git", ["ls-files"], { cwd: process.cwd(), encoding: "utf8" });
  return out
    .split("\n")
    .filter(Boolean)
    .filter((path) => HANDLED_EXTS.has(extOf(path)))
    .filter((path) => !path.endsWith(".min.js"))
    .filter((path) => !/(^|\/)public\/hny\.js$/.test(path)); // vendored, bundled — not our comments
}

function main() {
  const rawArgs = process.argv.slice(2);
  const apply = rawArgs.includes("--apply");
  const files = trackedFiles(rawArgs.filter((a) => a !== "--apply"));

  let totalBlocks = 0;
  let totalFiles = 0;

  for (const path of files) {
    let content;
    try {
      content = readFileSync(path, "utf8");
    } catch {
      continue;
    }
    const ext = extOf(path);
    const result = processFile(content, ext);
    if (!result) continue;

    totalFiles++;
    totalBlocks += result.blocks.length;
    console.log(`${path}: ${result.blocks.length} multi-line comment block(s)`);
    for (const [start, end] of result.blocks) {
      const preview = result.lines[start].trim().slice(0, 60);
      console.log(`  L${start + 1}-${end + 1}: ${preview}${result.lines[start].trim().length > 60 ? "…" : ""}`);
    }

    if (apply) {
      writeFileSync(path, result.newContent);
    }
  }

  console.log(`\n${totalBlocks} block(s) across ${totalFiles} file(s)${apply ? " removed" : " would be removed (dry run — pass --apply to write)"}`);
}

main();
