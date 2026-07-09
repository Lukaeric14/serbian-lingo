// Pure diffing logic for the audio-generation pipeline — no I/O.
//
// Given everything the unit manifests say should have audio, and everything
// that already has an `audioClips` row (keyed by exact displayed text, per
// SPEC.md §2), return the subset that still needs to be synthesized.

export type ClipKind = "word" | "sentence";

export interface ManifestClip {
  text: string;
  kind: ClipKind;
}

/**
 * Dedupes `manifestTexts` by exact text (first occurrence wins) and returns
 * only the entries whose text isn't already present in `existingClipTexts`.
 *
 * Pure and synchronous — safe to unit test without mocking anything.
 */
export function computeMissingClips(
  manifestTexts: ManifestClip[],
  existingClipTexts: string[],
): ManifestClip[] {
  const existing = new Set(existingClipTexts);
  const seen = new Set<string>();
  const missing: ManifestClip[] = [];

  for (const clip of manifestTexts) {
    if (seen.has(clip.text)) continue;
    seen.add(clip.text);

    if (existing.has(clip.text)) continue;
    missing.push(clip);
  }

  return missing;
}
