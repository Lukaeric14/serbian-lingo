// One-off: re-synthesizes every individual-word ("kind": "word") audioClip so all of
// them share ONE consistent voice, while leaving "kind": "sentence" clips on the
// existing random-per-text policy (publish-to-r2.ts).
//
// Why: audioClips is keyed by exact text, globally shared across every exercise that
// uses that word — a word's voice is NOT scoped to one exercise. The original
// "random voice per text" policy (per Luka's request to alternate voices so Dominika
// hears both genders) works fine for full sentences (each played as one atomic clip,
// never mixed with another clip in the same interaction) but breaks down for
// individual word tiles: translate_bank_reverse/match_pairs tap through several word
// clips within ONE exercise, and since each word's voice was picked independently,
// adjacent taps could land on different voices mid-sentence ("man woman man woman").
// There's no per-exercise fix possible without literally storing separate audio per
// (challenge, word) occurrence — a much bigger schema change. Given a word's voice is
// necessarily global, the only way to guarantee no in-exercise clash is for every word
// to share the same voice. Sentence-level clips keep the variety Luka asked for.
//
// Usage: `npx tsx scripts/audio/unify-word-voice.ts`. Idempotent: only re-synthesizes
// clips not already on TARGET_VOICE.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { synthesizeSpeech } from "./azureClient";
import { uploadClip } from "./r2Client";

const VOICE_NAMES = {
  sophie: "sr-Latn-RS-SophieNeural",
  nicholas: "sr-Latn-RS-NicholasNeural",
} as const;

// Nicholas already had the slight majority (58 vs 49) of existing word clips, so
// this minimizes how many clips need re-synthesis.
const TARGET_VOICE: keyof typeof VOICE_NAMES = "nicholas";

const MANIFEST_DIR = join(__dirname, "..", "..", "data", "units");

function readKindByText(): Map<string, "word" | "sentence"> {
  const map = new Map<string, "word" | "sentence">();
  const filenames = readdirSync(MANIFEST_DIR).filter((n) => n.endsWith(".audio-manifest.json"));
  for (const filename of filenames) {
    const entries: { text: string; kind: "word" | "sentence" }[] = JSON.parse(
      readFileSync(join(MANIFEST_DIR, filename), "utf-8"),
    );
    for (const { text, kind } of entries) map.set(text, kind);
  }
  return map;
}

function voiceOfUrl(url: string): "sophie" | "nicholas" | "unknown" {
  if (url.includes("/sophie/")) return "sophie";
  if (url.includes("/nicholas/")) return "nicholas";
  return "unknown";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  const kindByText = readKindByText();
  const clips: { text: string; url: string }[] = await convex.query(anyApi.audioClips.listAll, {});

  const toFix = clips.filter(
    (c) => kindByText.get(c.text) === "word" && voiceOfUrl(c.url) !== TARGET_VOICE,
  );

  console.log(`${clips.length} total clips, ${toFix.length} word clips need re-voicing to ${TARGET_VOICE}.`);

  let done = 0;
  for (const clip of toFix) {
    const audio = await synthesizeWithRetry(clip.text, VOICE_NAMES[TARGET_VOICE]);
    const key = `audio/${TARGET_VOICE}/wordfix-${String(done).padStart(3, "0")}.mp3`;
    const url = await uploadClip(key, audio);
    await convex.mutation(anyApi.audioClips.upsertClip, { text: clip.text, kind: "word", url });
    done++;
    console.log(`[${done}/${toFix.length}] "${clip.text}" -> ${TARGET_VOICE}`);
    await sleep(300);
  }

  console.log(`\nDone. Re-voiced ${done} word clips to ${TARGET_VOICE}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
