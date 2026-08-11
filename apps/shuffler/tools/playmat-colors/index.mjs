import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { extractCandidates, pickBestPair, pickBestTriple } from "./extract-colors.mjs";
import { createApp } from "./server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, "../../public/images");
const DATA_FILE = path.join(IMAGES_DIR, "playmat-colors.json");
const DEFAULT_PORT = 4523;

async function main() {
  const imageName = process.argv[2];
  if (!imageName) {
    console.error("Usage: npm start -- <image-filename>");
    console.error(`Looks for the file under ${IMAGES_DIR}`);
    process.exit(1);
  }

  const imagePath = path.join(IMAGES_DIR, imageName);

  const { data, info } = await sharp(imagePath)
    .resize({ width: 300, height: 300, fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) {
    throw new Error(`expected 3-channel RGB buffer after removeAlpha, got ${info.channels}`);
  }

  const candidates = extractCandidates(data);
  if (candidates.length === 0) {
    console.error("No saturated colors found in this image — try loosening minSaturation in extract-colors.mjs.");
    process.exit(1);
  }

  const suggestedTwo = pickBestPair(candidates);
  const suggestedThree = pickBestTriple(candidates);

  console.log(`Suggested 2-color pick: ${suggestedTwo.join(", ")}`);
  console.log(`Suggested 3-color pick: ${suggestedThree.join(", ")}`);

  const app = createApp({
    imagePath,
    imageName,
    candidates,
    suggestedTwo,
    suggestedThree,
    dataFilePath: DATA_FILE,
  });

  const server = app.listen(DEFAULT_PORT, () => {
    console.log(`\nOpen http://localhost:${DEFAULT_PORT} to pick colors for ${imageName}`);
    console.log(`Saves into ${DATA_FILE}`);
    console.log("Ctrl-C when done.\n");
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${DEFAULT_PORT} is already in use — is another playmat-colors run still open?`);
      process.exit(1);
    }
    throw err;
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
