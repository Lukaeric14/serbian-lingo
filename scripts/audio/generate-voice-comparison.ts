// One-off script (item 11): synthesize every unique word/sentence across units
// 1-3 in BOTH Azure voices, to local files, so Luka can listen and pick one
// before we commit anything to the real Convex audioClips table.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { synthesizeSpeech } from "./azureClient";

const VOICES = {
  sophie: "sr-Latn-RS-SophieNeural",
  nicholas: "sr-Latn-RS-NicholasNeural",
} as const;

const OUT_DIR = join(__dirname, "..", "..", "data", "audio-samples");

function slugify(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .replace(/[čćžšđ]/g, (c) => ({ č: "c", ć: "c", ž: "z", š: "s", đ: "dj" })[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${String(index).padStart(3, "0")}-${base || "clip"}`;
}

async function withConcurrency<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesizeWithRetry(text: string, voice: string, attempts = 4): Promise<Buffer> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await synthesizeSpeech(text, voice);
    } catch (err) {
      const isThrottle = (err as Error).message.includes("429");
      if (!isThrottle || i === attempts - 1) throw err;
      const backoffMs = 2000 * (i + 1);
      await sleep(backoffMs);
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const entries: { text: string; kind: "word" | "sentence" }[] = JSON.parse(
    readFileSync("/tmp/unique-audio-texts.json", "utf-8"),
  );

  for (const voiceKey of Object.keys(VOICES) as (keyof typeof VOICES)[]) {
    mkdirSync(join(OUT_DIR, voiceKey), { recursive: true });
  }

  const manifest: { index: number; text: string; kind: string; files: Record<string, string> }[] = [];
  let done = 0;
  let failed = 0;

  await withConcurrency(entries, 2, async ({ text, kind }, i) => {
    const files: Record<string, string> = {};
    for (const [voiceKey, voiceName] of Object.entries(VOICES)) {
      const filename = `${slugify(text, i)}.mp3`;
      const outPath = join(OUT_DIR, voiceKey, filename);
      if (existsSync(outPath)) {
        files[voiceKey] = outPath;
        continue;
      }
      try {
        const audio = await synthesizeWithRetry(text, voiceName);
        writeFileSync(outPath, audio);
        files[voiceKey] = outPath;
      } catch (err) {
        failed++;
        console.error(`FAILED [${voiceKey}] "${text}": ${(err as Error).message}`);
      }
      await sleep(150);
    }
    manifest.push({ index: i, text, kind, files });
    done++;
    if (done % 20 === 0 || done === entries.length) {
      console.log(`progress: ${done}/${entries.length} texts (${failed} failures so far)`);
    }
  });

  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nDone. ${entries.length} texts x 2 voices. Failures: ${failed}`);
  console.log(`Output: ${OUT_DIR}/{sophie,nicholas}/*.mp3 + manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
