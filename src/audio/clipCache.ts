// On-device disk cache for audio clips (SPEC.md §5: "Client caches MP3s on
// device so lessons feel instant and repeat plays are free").
//
// Why this exists (learned from Dominika's TestFlight install): the first
// implementation pointed hundreds of AVPlayers at remote R2 URLs at once.
// iOS caps concurrent connections per host, so every clip fought to buffer
// simultaneously and the first tapped word could sit unplayable behind the
// whole queue for minutes. Downloading the current lesson's ~20 files to
// disk first (skipping ones already cached from a previous session) makes
// the first tap instant and playback network-independent mid-lesson.

import { Directory, File, Paths } from "expo-file-system";

const CACHE_DIR_NAME = "audio-clips";

/** Stable on-disk filename derived from the clip's URL path (unique per clip). */
function fileNameFor(url: string): string {
  const pathname = new URL(url).pathname; // e.g. /audio/nicholas/000.mp3
  return pathname.replace(/^\//, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Ensures `url` is downloaded to the local cache; returns the local file URI.
 * Falls back to the remote URL on any failure (the player then streams it,
 * same as the old behavior — degraded, not broken).
 */
export async function ensureDownloaded(url: string): Promise<string> {
  try {
    const dir = new Directory(Paths.cache, CACHE_DIR_NAME);
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });

    const file = new File(dir, fileNameFor(url));
    if (file.exists) return file.uri;

    const downloaded = await File.downloadFileAsync(url, file, { idempotent: true });
    return downloaded.uri;
  } catch {
    return url;
  }
}

/**
 * Resolves every clip URL to a local URI, downloading missing ones with
 * bounded concurrency (small files; 6 at a time keeps well under iOS's
 * per-host connection limits while still finishing a lesson's worth in
 * ~1-2 seconds on a normal connection).
 */
export async function ensureAllDownloaded(
  urls: string[],
  concurrency = 6,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  let next = 0;

  async function worker(): Promise<void> {
    while (next < urls.length) {
      const url = urls[next++];
      results.set(url, await ensureDownloaded(url));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, urls.length) }, () => worker()),
  );
  return results;
}
