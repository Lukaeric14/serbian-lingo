// Uploads the already-generated local clips (data/audio-samples/<voice>/*.mp3,
// produced by generate-voice-comparison.ts) to R2 and records each in Convex's
// audioClips table via the upsertClip mutation.
//
// Per Luka: don't pick one voice — randomly assign Sophie or Nicholas PER TEXT
// (roughly 50/50 across the vocabulary) so Dominika hears both a female and
// male pronunciation across her lessons, not the same voice for everything.
// The random pick happens once here, at publish time — audioClips still has
// exactly one row per text (no schema/runtime randomization needed).
//
// Usage: `npx tsx scripts/audio/publish-to-r2.ts`. Idempotent: re-running
// picks a fresh random voice per text and re-uploads/re-upserts (never
// duplicates rows — upsertClip finds-or-creates by exact text).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { uploadClip } from "./r2Client";

const SAMPLES_DIR = join(__dirname, "..", "..", "data", "audio-samples");
const VOICES = ["sophie", "nicholas"] as const;

async function main() {
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
  const voiceCounts: Record<string, number> = { sophie: 0, nicholas: 0 };

  for (const entry of manifest) {
    const voice = VOICES[Math.floor(Math.random() * VOICES.length)];
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
    voiceCounts[voice]++;
    uploaded++;
    if (uploaded % 20 === 0) console.log(`uploaded ${uploaded}/${manifest.length}`);
  }

  console.log(
    `\nDone. Uploaded ${uploaded}, skipped ${skipped}. Voice split: ${voiceCounts.sophie} Sophie / ${voiceCounts.nicholas} Nicholas.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
