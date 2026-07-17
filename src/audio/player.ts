// Thin wrapper around expo-audio for SPEC.md §5 playback behavior:
//
//   - Client caches MP3s on device (keyed by clip text) so lessons feel
//     instant and repeat plays are free.
//   - Tap any Serbian word or tile → plays that word's clip; rapid repeated
//     taps must not stack overlapping playback (stop/restart, not layer).
//
// Uses `createAudioPlayer` (the non-hook factory) rather than `useAudioPlayer`
// because this module manages a cache of players outside of React's render
// cycle — it's a service, not a component.
//
// CRASH-PROOFING (learned on Dominika's real iPhone, invisible in the
// simulator): iOS can invalidate the native audio session or an individual
// native player at any time (backgrounding, lock screen, call/Siri
// interruptions, audio-focus loss). When that happens, native calls throw
// ("Server was dead when activation request was made", "Session lookup
// failed"). NOTHING in this module may ever let such an error escape to the
// caller — a missed sound is a shrug, an uncaught native error is a crashed
// lesson. Every play path: try → on failure, revive the audio session +
// recreate the player and retry once (async) → on failure again, give up
// silently. The next tap starts the whole ladder fresh.

import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { reviveAudioSession } from "./audioSession";

export interface AudioClip {
  text: string;
  uri: string;
}

interface CachedClip {
  player: AudioPlayer;
  uri: string;
}

/**
 * Caches one AudioPlayer per clip text and exposes play-by-text semantics.
 * A single instance is meant to be used as a module-level singleton (see the
 * default export below) so the whole app shares one cache.
 */
export class AudioClipPlayer {
  private clips = new Map<string, CachedClip>();
  /** Text of the clip currently (or most recently) playing, if any. */
  private currentlyPlayingText: string | null = null;

  /**
   * Registers clips for playback, creating (or replacing) a cached player
   * for each. Safe to call multiple times / incrementally as new lessons
   * come into view — already-registered texts get their source swapped in
   * place rather than leaking a duplicate player.
   */
  preload(clips: AudioClip[]): void {
    for (const clip of clips) {
      try {
        const existing = this.clips.get(clip.text);
        if (existing) {
          existing.player.replace({ uri: clip.uri });
          existing.uri = clip.uri;
          continue;
        }
        this.clips.set(clip.text, { player: createAudioPlayer({ uri: clip.uri }), uri: clip.uri });
      } catch {
        // A clip that failed to register just won't play until re-preloaded —
        // never abort the rest of the batch (or the caller) over it.
        this.clips.delete(clip.text);
      }
    }
  }

  private replay(player: AudioPlayer): void {
    // Restart from the top even on a repeated tap of the same clip, rather
    // than letting a second play() stack on an already-playing instance.
    player.pause();
    void player.seekTo(0);
    player.play();
  }

  /**
   * Plays the clip registered for `text`. Rapid repeated taps on the same
   * (or a different) clip stop whatever's currently playing first, then
   * restart from the beginning — never stacks overlapping playback.
   *
   * No-ops (silently) if `text` was never preloaded, and NEVER throws —
   * see the crash-proofing note at the top of this file.
   */
  play(text: string): void {
    const clip = this.clips.get(text);
    if (!clip) return;

    // Stop any other clip that's mid-playback so plays never overlap.
    // Best-effort: a stale native player here must not fail THIS play.
    if (this.currentlyPlayingText && this.currentlyPlayingText !== text) {
      try {
        this.clips.get(this.currentlyPlayingText)?.player.pause();
      } catch {
        // ignore
      }
    }
    this.currentlyPlayingText = text;

    try {
      this.replay(clip.player);
    } catch {
      // Native player and/or the whole audio session has gone stale. Revive
      // the session first (a fresh player bound to a dead session fails the
      // same way), then recreate and retry once. Async on purpose — play()
      // is called from sync UI handlers; a ~100ms-late recovered sound beats
      // a crash. If recovery fails too, stay silent; the next tap retries.
      void this.recover(text, clip.uri);
    }
  }

  private async recover(text: string, uri: string): Promise<void> {
    try {
      await reviveAudioSession();
      const fresh = createAudioPlayer({ uri });
      this.clips.set(text, { player: fresh, uri });
      this.replay(fresh);
    } catch {
      // Give up on this play. Cache entry (fresh or old) stays; a later
      // play() walks the same revive path again.
    }
  }

  /** Stops whatever's currently playing, if anything. Never throws. */
  stop(): void {
    if (!this.currentlyPlayingText) return;
    try {
      this.clips.get(this.currentlyPlayingText)?.player.pause();
    } catch {
      // ignore
    }
    this.currentlyPlayingText = null;
  }

  /** True if `text` has a cached player ready to play. */
  isPreloaded(text: string): boolean {
    return this.clips.has(text);
  }

  /** Releases every cached player. Intended for teardown (e.g. tests). */
  clear(): void {
    for (const clip of this.clips.values()) {
      try {
        clip.player.remove();
      } catch {
        // ignore
      }
    }
    this.clips.clear();
    this.currentlyPlayingText = null;
  }
}

/** App-wide singleton — one shared clip cache, per SPEC.md §5. */
export const audioClipPlayer = new AudioClipPlayer();

export function preload(clips: AudioClip[]): void {
  audioClipPlayer.preload(clips);
}

export function play(text: string): void {
  audioClipPlayer.play(text);
}
