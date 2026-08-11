import express from "express";
import path from "node:path";
import { renderPage } from "./page.mjs";
import { readColorsFile, writeColorsFile } from "./data-file.mjs";
import { analyzeImage } from "./analyze.mjs";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const GROUPS = {
  two: { size: 2, chosenKey: "chosenTwo" },
  three: { size: 3, chosenKey: "chosenThree" },
  five: { size: 5, chosenKey: "chosenFive" },
};

export function createApp({ imagesDir, filenames, startIndex, dataFilePath }) {
  const app = express();
  app.use(express.json());

  let currentIndex = startIndex;
  const currentImageName = () => filenames[currentIndex];
  const currentImagePath = () => path.join(imagesDir, currentImageName());

  app.get("/", async (req, res) => {
    const imageName = currentImageName();
    const { candidates, suggestedTwo, suggestedThree, suggestedFive } = await analyzeImage(currentImagePath());
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
        position: currentIndex + 1,
        total: filenames.length,
      })
    );
  });

  app.get("/image", (req, res) => {
    res.sendFile(currentImagePath());
  });

  app.get("/next", (req, res) => {
    currentIndex = (currentIndex + 1) % filenames.length;
    res.redirect("/");
  });

  app.get("/prev", (req, res) => {
    currentIndex = (currentIndex - 1 + filenames.length) % filenames.length;
    res.redirect("/");
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

    const imageName = currentImageName();
    const { suggestedTwo, suggestedThree, suggestedFive } = await analyzeImage(currentImagePath());

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
