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

/**
 * Caches one AudioPlayer per clip text and exposes play-by-text semantics.
 * A single instance is meant to be used as a module-level singleton (see the
 * default export below) so the whole app shares one cache.
 */
export class AudioClipPlayer {
  private players = new Map<string, AudioPlayer>();
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
      const existing = this.players.get(clip.text);
      if (existing) {
        existing.replace({ uri: clip.uri });
        continue;
      }
      this.players.set(clip.text, createAudioPlayer({ uri: clip.uri }));
    }
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
    const player = this.players.get(text);
    if (!player) return;

    // Stop any other clip that's mid-playback so plays never overlap.
    if (this.currentlyPlayingText && this.currentlyPlayingText !== text) {
      const other = this.players.get(this.currentlyPlayingText);
      other?.pause();
    }

    // Restart from the top even on a repeated tap of the same clip, rather
    // than letting a second play() stack on an already-playing instance.
    player.pause();
    void player.seekTo(0);
    player.play();

    this.currentlyPlayingText = text;
  }

  /** Stops whatever's currently playing, if anything. */
  stop(): void {
    if (!this.currentlyPlayingText) return;
    const player = this.players.get(this.currentlyPlayingText);
    player?.pause();
    this.currentlyPlayingText = null;
  }

  /** True if `text` has a cached player ready to play. */
  isPreloaded(text: string): boolean {
    return this.players.has(text);
  }

  /** Releases every cached player. Intended for teardown (e.g. tests). */
  clear(): void {
    for (const player of this.players.values()) {
      player.remove();
    }
    this.players.clear();
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
