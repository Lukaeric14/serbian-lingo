// One-off: synthesize + publish every text present in data/units/*.audio-manifest.json
// that never got uploaded to R2/Convex. Discovered while wiring up real client-side
// playback (src/audio/player.ts's preload was never called anywhere) — turned out the
// live audioClips table only has the 159 texts from the original one-time
// generate-voice-comparison.ts + publish-to-r2.ts run, which predates the "3->5
// lessons per unit" content expansion. The manifests were updated for the new lessons;
// nothing re-ran the actual generate+publish step for the newly-added texts.
//
// Reuses computeMissingClips (scripts/audio/diff.ts, already unit tested) for the diff,
// and the same random-voice-per-text policy as publish-to-r2.ts/fill-gap.ts. Distinct R2
// key prefix ("gap2-") so this never collides with fill-gap.ts's earlier "gap-*" keys.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { computeMissingClips, type ManifestClip } from "./diff";
import { synthesizeSpeech } from "./azureClient";
import { uploadClip } from "./r2Client";

const VOICE_NAMES = {
  sophie: "sr-Latn-RS-SophieNeural",
  nicholas: "sr-Latn-RS-NicholasNeural",
} as const;
const VOICES = Object.keys(VOICE_NAMES) as (keyof typeof VOICE_NAMES)[];

const MANIFEST_DIR = join(__dirname, "..", "..", "data", "units");

function readAllManifests(): ManifestClip[] {
  const filenames = readdirSync(MANIFEST_DIR).filter((n) => n.endsWith(".audio-manifest.json"));
  const entries: ManifestClip[] = [];
  for (const filename of filenames.sort()) {
    const parsed = JSON.parse(readFileSync(join(MANIFEST_DIR, filename), "utf-8"));
    entries.push(...parsed);
  }
  return entries;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Azure's free tier throttles under sustained sequential load (hit this exact
// 429 during the original item-11 generation run too) — retry with backoff
// rather than fail the whole batch on one rate-limited call.
async function synthesizeWithRetry(text: string, voice: string, attempts = 4): Promise<Buffer> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await synthesizeSpeech(text, voice);
    } catch (err) {
      if (attempt === attempts) throw err;
      const backoffMs = 2000 * attempt;
      console.log(`  retry ${attempt}/${attempts - 1} after ${backoffMs}ms (${(err as Error).message})`);
      await sleep(backoffMs);
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  const convex = new ConvexHttpClient(convexUrl);

  const manifestEntries = readAllManifests();
  const existingTexts: string[] = await convex.query(anyApi.audioClips.listTexts, {});
  const missing = computeMissingClips(manifestEntries, existingTexts);

  console.log(
    `${manifestEntries.length} manifest entries, ${existingTexts.length} already published, ${missing.length} missing.`,
  );

  const voiceCounts: Record<string, number> = { sophie: 0, nicholas: 0 };
  let done = 0;

  for (const { text, kind } of missing) {
    const voiceKey = VOICES[Math.floor(Math.random() * VOICES.length)];
    const audio = await synthesizeWithRetry(text, VOICE_NAMES[voiceKey]);
    const key = `audio/${voiceKey}/gap2-${String(done).padStart(3, "0")}.mp3`;
    const url = await uploadClip(key, audio);
    await convex.mutation(anyApi.audioClips.upsertClip, { text, kind, url });
    voiceCounts[voiceKey]++;
    done++;
    console.log(`[${done}/${missing.length}] "${text}" -> ${voiceKey}`);
    await sleep(300);
  }

  console.log(
    `\nDone. Published ${done}. Voice split: ${voiceCounts.sophie} Sophie / ${voiceCounts.nicholas} Nicholas.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
