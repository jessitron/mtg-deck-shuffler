// Classify each networkidle / waitForTimeout site by what statement follows it.
// "auto-retrying" = the next real statement is expect(...) or a locator action,
// both of which Playwright auto-waits on, so the wait is redundant.
import { readdirSync, readFileSync } from "node:fs";

const dir = process.argv[2];
const files = readdirSync(dir).filter((f) => f.endsWith(".spec.ts"));

const buckets = { networkidle: {}, waitForTimeout: {} };
const detail = [];

for (const f of files) {
  const lines = readFileSync(`${dir}/${f}`, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const kind = lines[i].includes("waitForLoadState('networkidle')")
      ? "networkidle"
      : lines[i].includes("waitForTimeout")
        ? "waitForTimeout"
        : null;
    if (!kind) continue;

    // next non-blank, non-comment, non-closing-brace line
    let j = i + 1;
    while (
      j < lines.length &&
      (lines[j].trim() === "" ||
        lines[j].trim().startsWith("//") ||
        lines[j].trim().startsWith("}"))
    )
      j++;
    const next = (lines[j] ?? "").trim();

    let cls;
    if (/^await expect\(/.test(next)) cls = "expect (auto-retries)";
    else if (/\.(click|fill|press|check|selectOption|hover)\(/.test(next))
      cls = "locator action (auto-waits)";
    else if (/waitForURL|waitForLoadState|waitForSelector|waitForTimeout/.test(next))
      cls = "another wait";
    else if (/\.(count|textContent|innerText|getAttribute|isVisible|all)\(/.test(next))
      cls = "NON-retrying read <-- judgment call";
    else if (/page\.goto/.test(next)) cls = "goto";
    else cls = `other: ${next.slice(0, 60)}`;

    buckets[kind][cls] = (buckets[kind][cls] ?? 0) + 1;
    if (cls.startsWith("NON-retrying") || cls.startsWith("other"))
      detail.push(`${kind}  ${f}:${i + 1}  -> ${next.slice(0, 70)}`);
  }
}

for (const [kind, b] of Object.entries(buckets)) {
  const total = Object.values(b).reduce((a, c) => a + c, 0);
  console.log(`\n=== ${kind} (${total} sites) ===`);
  for (const [k, v] of Object.entries(b).sort((a, c) => c[1] - a[1]))
    console.log(`  ${String(v).padStart(3)}  ${k}`);
}
console.log("\n=== sites needing a look ===");
detail.forEach((d) => console.log("  " + d));
