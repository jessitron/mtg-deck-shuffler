import path from "node:path";
import { fileURLToPath } from "node:url";
import { listImages } from "./image-list.mjs";
import { createApp } from "./server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, "../../public/images/playmats");
const DATA_FILE = path.join(IMAGES_DIR, "playmat-colors.json");
const DEFAULT_PORT = 4523;

function main() {
  const filenames = listImages(IMAGES_DIR);
  if (filenames.length === 0) {
    console.error(`No images found in ${IMAGES_DIR}`);
    process.exit(1);
  }

  const requestedImage = process.argv[2];
  let startIndex = 0;
  if (requestedImage) {
    startIndex = filenames.indexOf(requestedImage);
    if (startIndex === -1) {
      console.error(`${requestedImage} not found in ${IMAGES_DIR}`);
      console.error(`Available: ${filenames.join(", ")}`);
      process.exit(1);
    }
  }

  console.log(`Found ${filenames.length} image(s) in ${IMAGES_DIR}`);

  const app = createApp({ imagesDir: IMAGES_DIR, filenames, startIndex, dataFilePath: DATA_FILE });

  const server = app.listen(DEFAULT_PORT, () => {
    console.log(
      `\nOpen http://localhost:${DEFAULT_PORT} to pick colors — starting at ${filenames[startIndex]} (${
        startIndex + 1
      }/${filenames.length})`
    );
    console.log("Use Prev/Next on the page to move through every image in the directory.");
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

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
