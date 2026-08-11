import sharp from "sharp";
import { extractCandidates, pickBestPair, pickBestTriple, pickBestQuintet } from "./extract-colors.mjs";

export async function analyzeImage(imagePath) {
  const { data, info } = await sharp(imagePath)
    .resize({ width: 300, height: 300, fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) {
    throw new Error(`expected 3-channel RGB buffer after removeAlpha, got ${info.channels}`);
  }

  const candidates = extractCandidates(data);
  return {
    candidates,
    suggestedTwo: pickBestPair(candidates),
    suggestedThree: pickBestTriple(candidates),
    suggestedFive: pickBestQuintet(candidates),
  };
}
