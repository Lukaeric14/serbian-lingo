// Configures the app's audio session for lesson playback and keeps it alive.
// Call useAudioSession() once, at the app root; call reviveAudioSession() from
// any play path that hits a native audio failure.
//
// Hard-won device lessons (none of these reproduce in the iOS Simulator, which
// has no silent switch and fakes AVAudioSession):
//
// 1. Word/sentence audio is core lesson content, not a notification sound — it
//    must play even with the phone's physical silent switch on. iOS mutes app
//    audio by default unless playsInSilentMode is explicitly enabled.
// 2. iOS can tear down the app's native audio session at any time — app
//    backgrounded/locked, a call or Siri interruption, another app grabbing
//    audio focus. Playback afterward throws generic native errors ("Session
//    lookup failed", "Server was dead when activation request was made") until
//    the session is explicitly re-activated. So: re-activate on every
//    foreground transition AND expose reviveAudioSession() so the players can
//    self-heal at the moment a play actually fails, whatever the cause.
// 3. We deliberately never call setIsAudioActiveAsync(false) on background —
//    an earlier version did, and a deactivation the OS is simultaneously doing
//    its own teardown around is one more way to wedge the session on a real
//    device. iOS reclaims audio from a backgrounded app by itself; there's
//    nothing for us to release.

import { useEffect } from "react";
import { AppState } from "react-native";
import { setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";

/**
 * (Re-)activates the app's native audio session and playback mode. Safe to
 * call repeatedly; never throws (a failure here just means the next play
 * attempt fails, which its caller already tolerates).
 */
export async function reviveAudioSession(): Promise<void> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    await setIsAudioActiveAsync(true);
  } catch {
    // Best-effort — see doc comment.
  }
}

export function useAudioSession(): void {
  useEffect(() => {
    void reviveAudioSession();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void reviveAudioSession();
      }
    });

    return () => subscription.remove();
  }, []);
}
