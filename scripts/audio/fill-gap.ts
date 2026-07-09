// One-off: synthesize + publish the 13 word-tile audio gaps discovered while
// fixing u1's punctuation bug (verified missing from data/units/u1.audio-manifest.json
// via the audio-completeness cross-check). Same random-voice-per-text policy as
// publish-to-r2.ts. Not meant to be reused — publish-to-r2.ts is the real pipeline.
import { readFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { synthesizeSpeech } from "./azureClient";
import { uploadClip } from "./r2Client";

const VOICE_NAMES = {
  sophie: "sr-Latn-RS-SophieNeural",
  nicholas: "sr-Latn-RS-NicholasNeural",
} as const;
const VOICES = Object.keys(VOICE_NAMES) as (keyof typeof VOICE_NAMES)[];

async function main() {
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  const convex = new ConvexHttpClient(convexUrl);

  const entries: { text: string; kind: "word" | "sentence" }[] = JSON.parse(
    readFileSync("/tmp/new-words.json", "utf-8"),
  );

  for (let i = 0; i < entries.length; i++) {
    const { text, kind } = entries[i];
    const voiceKey = VOICES[Math.floor(Math.random() * VOICES.length)];
    const audio = await synthesizeSpeech(text, VOICE_NAMES[voiceKey]);
    const key = `audio/${voiceKey}/gap-${String(i).padStart(3, "0")}.mp3`;
    const url = await uploadClip(key, audio);
    await convex.mutation(anyApi.audioClips.upsertClip, { text, kind, url });
    console.log(`"${text}" -> ${voiceKey} -> ${url}`);
  }
  console.log(`\nDone. Published ${entries.length} gap-fill clips.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
