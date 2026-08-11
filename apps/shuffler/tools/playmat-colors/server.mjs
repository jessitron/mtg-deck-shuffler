import express from "express";
import { renderPage } from "./page.mjs";
import { readColorsFile, writeColorsFile } from "./data-file.mjs";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function createApp({ imagePath, imageName, candidates, suggestedTwo, suggestedThree, dataFilePath }) {
  const app = express();
  app.use(express.json());

  app.get("/", async (req, res) => {
    const data = await readColorsFile(dataFilePath);
    const existing = data[imageName] || {};
    res.type("html").send(
      renderPage({
        imageName,
        candidates,
        suggestedTwo,
        suggestedThree,
        chosenTwo: existing.chosenTwo,
        chosenThree: existing.chosenThree,
      })
    );
  });

  app.get("/image", (req, res) => {
    res.sendFile(imagePath);
  });

  app.post("/save", async (req, res) => {
    const { which, hexes } = req.body || {};
    const expectedLength = which === "two" ? 2 : which === "three" ? 3 : null;
    if (!expectedLength) {
      return res.status(400).send('"which" must be "two" or "three"');
    }
    if (!Array.isArray(hexes) || hexes.length !== expectedLength || !hexes.every((h) => HEX_COLOR.test(h))) {
      return res.status(400).send(`expected ${expectedLength} hex colors`);
    }

    const data = await readColorsFile(dataFilePath);
    const entry = data[imageName] || {};
    entry.suggestedTwo = suggestedTwo;
    entry.suggestedThree = suggestedThree;
    entry[which === "two" ? "chosenTwo" : "chosenThree"] = hexes;
    data[imageName] = entry;
    await writeColorsFile(dataFilePath, data);

    console.log(`Saved ${which}-color pick for ${imageName}: ${hexes.join(", ")}`);
    res.json({ ok: true });
  });

  return app;
}
