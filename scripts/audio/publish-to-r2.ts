// Uploads the already-generated local clips (data/audio-samples/<voice>/*.mp3,
// produced by generate-voice-comparison.ts) to R2 and records each in Convex's
// audioClips table via the upsertClip mutation. Run once Luka has picked a
// voice — usage: `VOICE=sophie npx tsx scripts/audio/publish-to-r2.ts`.
//
// Idempotent: re-running only re-uploads/re-upserts, never duplicates rows
// (upsertClip finds-or-creates by exact text).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { uploadClip } from "./r2Client";

const SAMPLES_DIR = join(__dirname, "..", "..", "data", "audio-samples");

async function main() {
  const voice = process.env.VOICE;
  if (voice !== "sophie" && voice !== "nicholas") {
    console.error('Set VOICE=sophie or VOICE=nicholas, e.g. `VOICE=sophie npx tsx scripts/audio/publish-to-r2.ts`.');
    process.exit(1);
  }

  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    console.error("CONVEX_URL is not set. Point it at a Convex deployment before running.");
    process.exit(1);
  }
  const convex = new ConvexHttpClient(convexUrl);

  const manifest: { index: number; text: string; kind: "word" | "sentence"; files: Record<string, string> }[] =
    JSON.parse(readFileSync(join(SAMPLES_DIR, "manifest.json"), "utf-8"));

  let uploaded = 0;
  let skipped = 0;

  for (const entry of manifest) {
    const localPath = entry.files[voice];
    if (!localPath) {
      console.error(`No ${voice} file for "${entry.text}" — skipping.`);
      skipped++;
      continue;
    }
    const audio = readFileSync(localPath);
    const key = `audio/${voice}/${String(entry.index).padStart(3, "0")}.mp3`;
    const url = await uploadClip(key, audio);
    await convex.mutation(anyApi.audioClips.upsertClip, { text: entry.text, kind: entry.kind, url });
    uploaded++;
    if (uploaded % 20 === 0) console.log(`uploaded ${uploaded}/${manifest.length}`);
  }

  console.log(`\nDone. Uploaded ${uploaded}, skipped ${skipped}. Voice: ${voice}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
