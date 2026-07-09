// Orchestrator for SPEC.md §3 step 4 ("generate-audio"):
//
//   diff the unit's unique Serbian surface forms AND full sentence prompts
//   against existing audioClips → Azure TTS (sr-Latn-RS, chosen voice) →
//   MP3s into Convex storage. Idempotent, keyed by exact text.
//
// This module is deliberately decoupled from a live Convex deployment: the
// actual "upload to storage + insert an audioClips row" step is expressed as
// a small injectable `ClipStore` interface, so the orchestration logic is
// fully unit-testable (generate.test.ts) without any real network calls.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { computeMissingClips, type ClipKind, type ManifestClip } from "./diff";
import { synthesizeSpeech } from "./azureClient";

/**
 * Injectable seam over Convex. In production this is backed by a real Convex
 * client (upload to file storage, then insert an `audioClips` row per
 * convex/schema.ts). In tests it's a fake in-memory store.
 */
export interface ClipStore {
  /** All `text` values that already have an audioClips row. */
  existingTexts(): Promise<string[]>;
  /** Upload synthesized audio and insert the corresponding audioClips row. */
  upload(text: string, kind: ClipKind, audio: Buffer): Promise<void>;
}

export interface GenerateOptions {
  /** Directory containing `*.audio-manifest.json` files. */
  manifestDir: string;
  /** Azure neural voice name, e.g. "sr-RS-SophieNeural". */
  voice: string;
  clipStore: ClipStore;
  /** Injectable for tests; defaults to the real Azure REST wrapper. */
  synthesize?: (text: string, voice: string) => Promise<Buffer>;
  /** Injectable for tests; defaults to console.log. */
  log?: (message: string) => void;
}

export interface GenerateResult {
  manifestEntryCount: number;
  missing: ManifestClip[];
  synthesized: ManifestClip[];
}

/**
 * A manifest file is a flat JSON array of `{ text, kind }` entries — the
 * unique Serbian surface forms and sentence prompts for one unit. Produced
 * alongside `data/units/unit-NN.json` as `data/units/unit-NN.audio-manifest.json`.
 */
function readManifests(manifestDir: string): ManifestClip[] {
  let filenames: string[];
  try {
    filenames = readdirSync(manifestDir);
  } catch {
    return [];
  }

  const manifestFiles = filenames
    .filter((name) => name.endsWith(".audio-manifest.json"))
    .sort();

  const entries: ManifestClip[] = [];
  for (const filename of manifestFiles) {
    const raw = readFileSync(join(manifestDir, filename), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error(`${filename}: expected a JSON array of {text, kind} entries`);
    }
    for (const entry of parsed) {
      entries.push(validateManifestClip(entry, filename));
    }
  }
  return entries;
}

function validateManifestClip(entry: unknown, filename: string): ManifestClip {
  if (
    typeof entry !== "object" ||
    entry === null ||
    typeof (entry as ManifestClip).text !== "string" ||
    ((entry as ManifestClip).kind !== "word" && (entry as ManifestClip).kind !== "sentence")
  ) {
    throw new Error(
      `${filename}: invalid manifest entry, expected {text: string, kind: "word"|"sentence"}, got ${JSON.stringify(entry)}`,
    );
  }
  return entry as ManifestClip;
}

/**
 * Reads every `data/units/*.audio-manifest.json`, diffs against the clip
 * store's existing texts, and synthesizes + uploads whatever's missing.
 * Safe to re-run: already-present texts are skipped (idempotent).
 */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const { manifestDir, voice, clipStore } = options;
  const synthesize = options.synthesize ?? synthesizeSpeech;
  const log = options.log ?? ((message: string) => console.log(message));

  const manifestEntries = readManifests(manifestDir);
  const existingTexts = await clipStore.existingTexts();
  const missing = computeMissingClips(manifestEntries, existingTexts);

  log(
    `Found ${manifestEntries.length} manifest entries, ${missing.length} missing ` +
      `(${existingTexts.length} already in audioClips).`,
  );

  const synthesized: ManifestClip[] = [];
  for (const clip of missing) {
    log(`Synthesizing "${clip.text}" (${clip.kind})...`);
    const audio = await synthesize(clip.text, voice);
    await clipStore.upload(clip.text, clip.kind, audio);
    synthesized.push(clip);
  }

  return {
    manifestEntryCount: manifestEntries.length,
    missing,
    synthesized,
  };
}
