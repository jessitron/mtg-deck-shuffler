
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

describe("no direct Tabletop->Shuffler HTTP call", () => {
  const tabletopSrc = path.resolve(__dirname, "..", "..", "tabletop", "src");

  it("has no fetch() call in the Tabletop's source that names the Shuffler as its target", () => {
    const offenders: string[] = [];
    for (const file of listFiles(tabletopSrc)) {
      const content = fs.readFileSync(file, "utf8");
      const fetchCalls = content.match(/fetch\([^)]*\)/g) ?? [];
      for (const call of fetchCalls) {
        if (/shuffler|SHUFFLER_URL|:3344|:3001/i.test(call)) {
          offenders.push(`${path.relative(tabletopSrc, file)}: ${call}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
