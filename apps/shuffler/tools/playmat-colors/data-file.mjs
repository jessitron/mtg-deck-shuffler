import { readFile, writeFile } from "node:fs/promises";

export async function readColorsFile(path) {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

export async function writeColorsFile(path, data) {
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
