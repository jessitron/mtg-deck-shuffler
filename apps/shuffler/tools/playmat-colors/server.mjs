import express from "express";
import { renderPage } from "./page.mjs";
import { readColorsFile, writeColorsFile } from "./data-file.mjs";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const GROUPS = {
  two: { size: 2, suggestedKey: "suggestedTwo", chosenKey: "chosenTwo" },
  three: { size: 3, suggestedKey: "suggestedThree", chosenKey: "chosenThree" },
  five: { size: 5, suggestedKey: "suggestedFive", chosenKey: "chosenFive" },
};

export function createApp({ imagePath, imageName, candidates, suggestedTwo, suggestedThree, suggestedFive, dataFilePath }) {
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
        suggestedFive,
        chosenTwo: existing.chosenTwo,
        chosenThree: existing.chosenThree,
        chosenFive: existing.chosenFive,
      })
    );
  });

  app.get("/image", (req, res) => {
    res.sendFile(imagePath);
  });

  app.post("/save", async (req, res) => {
    const { which, hexes } = req.body || {};
    const group = GROUPS[which];
    if (!group) {
      return res.status(400).send(`"which" must be one of: ${Object.keys(GROUPS).join(", ")}`);
    }
    if (!Array.isArray(hexes) || hexes.length !== group.size || !hexes.every((h) => HEX_COLOR.test(h))) {
      return res.status(400).send(`expected ${group.size} hex colors`);
    }

    const data = await readColorsFile(dataFilePath);
    const entry = data[imageName] || {};
    entry.suggestedTwo = suggestedTwo;
    entry.suggestedThree = suggestedThree;
    entry.suggestedFive = suggestedFive;
    entry[group.chosenKey] = hexes;
    data[imageName] = entry;
    await writeColorsFile(dataFilePath, data);

    console.log(`Saved ${which}-color pick for ${imageName}: ${hexes.join(", ")}`);
    res.json({ ok: true });
  });

  return app;
}
