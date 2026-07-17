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

import { createAudioPlayer, type AudioPlayer } from "expo-audio";

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
      const existing = this.clips.get(clip.text);
      if (existing) {
        existing.player.replace({ uri: clip.uri });
        existing.uri = clip.uri;
        continue;
      }
      this.clips.set(clip.text, { player: createAudioPlayer({ uri: clip.uri }), uri: clip.uri });
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
   * No-ops (silently) if `text` was never preloaded, so a stray tap can't
   * crash the app.
   */
  play(text: string): void {
    const clip = this.clips.get(text);
    if (!clip) return;

    // Stop any other clip that's mid-playback so plays never overlap. Best-effort:
    // if that other native player has already gone stale, swallow and move on —
    // this call's own job is playing `text`, not that one.
    if (this.currentlyPlayingText && this.currentlyPlayingText !== text) {
      try {
        this.clips.get(this.currentlyPlayingText)?.player.pause();
      } catch {
        // ignore — see the retry comment below for why a native player can die.
      }
    }

    try {
      this.replay(clip.player);
    } catch {
      // The native player can go stale (e.g. "Server was dead when activation
      // request was made") across a JS reload or the app being backgrounded
      // long enough for iOS to tear down the audio session. Recreate once
      // from the same source and retry, rather than crashing or going silent
      // for the rest of the session.
      const fresh = createAudioPlayer({ uri: clip.uri });
      this.clips.set(text, { player: fresh, uri: clip.uri });
      this.replay(fresh);
    }

    this.currentlyPlayingText = text;
  }

  /** Stops whatever's currently playing, if anything. */
  stop(): void {
    if (!this.currentlyPlayingText) return;
    try {
      this.clips.get(this.currentlyPlayingText)?.player.pause();
    } catch {
      // Best-effort — see play()'s retry comment.
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
      clip.player.remove();
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
