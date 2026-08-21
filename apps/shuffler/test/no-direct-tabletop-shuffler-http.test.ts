
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * The card-return channel (Tabletop -> Spine -> Shuffler -> browser) must never grow a
 * direct Tabletop->Shuffler HTTP call — every event crosses the Spine (Mountain 2). This
 * scans the Tabletop's own source for any fetch() call that names the Shuffler, so a
 * future shortcut trips a test instead of only a code review.
 */
function listFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    if (/\.(ts|tsx)$/.test(entry.name)) return [full];
    return [];
  });
}

/**
 * Every `fetch(...)` call's full argument list, matched by counting parens rather than
 * stopping at the first `)` — a naive `fetch\([^)]*\)` regex truncates (and so silently
 * clears) any call whose target expression itself contains a nested call, e.g.
 * `fetch(buildUrl(), { headers: { "x-target": SHUFFLER_URL } })`.
 */
function fetchCalls(content: string): string[] {
  const calls: string[] = [];
  const callStart = /fetch\(/g;
  let match: RegExpExecArray | null;
  while ((match = callStart.exec(content)) !== null) {
    let depth = 1;
    let end = match.index + match[0].length;
    while (end < content.length && depth > 0) {
      if (content[end] === "(") depth++;
      else if (content[end] === ")") depth--;
      end++;
    }
    calls.push(content.slice(match.index, end));
  }
  return calls;
}

describe("no direct Tabletop->Shuffler HTTP call", () => {
  const tabletopSrc = path.resolve(__dirname, "..", "..", "tabletop", "src");

  it("has no fetch() call in the Tabletop's source that names the Shuffler as its target", () => {
    const offenders: string[] = [];
    for (const file of listFiles(tabletopSrc)) {
      const content = fs.readFileSync(file, "utf8");
      for (const call of fetchCalls(content)) {
        if (/shuffler|SHUFFLER_URL|:3344|:3001/i.test(call)) {
          offenders.push(`${path.relative(tabletopSrc, file)}: ${call}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
