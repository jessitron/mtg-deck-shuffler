import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { listImages } from "./image-list.mjs";

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "playmat-colors-test-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("listImages returns only image files, sorted", () => {
  withTempDir((dir) => {
    fs.writeFileSync(path.join(dir, "zebra.png"), "");
    fs.writeFileSync(path.join(dir, "apple.jpg"), "");
    fs.writeFileSync(path.join(dir, "mango.JPEG"), "");
    fs.writeFileSync(path.join(dir, "playmat-colors.json"), "{}");
    fs.writeFileSync(path.join(dir, "notes.txt"), "");

    const result = listImages(dir);
    assert.deepEqual(result, ["apple.jpg", "mango.JPEG", "zebra.png"]);
  });
});

test("listImages returns an empty array for a directory with no images", () => {
  withTempDir((dir) => {
    fs.writeFileSync(path.join(dir, "readme.md"), "");
    assert.deepEqual(listImages(dir), []);
  });
});
