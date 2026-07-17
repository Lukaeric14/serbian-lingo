// Configures the app's audio session for lesson playback and keeps it in sync with
// app foreground/background transitions. Call useAudioSession() once, at the app root.
//
// Two real bugs found via live device testing (the iOS Simulator never surfaces either,
// since it has no silent switch and never truly backgrounds the app):
//
// 1. Word/sentence audio is core lesson content, not a notification sound — it must
//    play even with the phone's physical silent switch on. iOS mutes app audio by
//    default unless playsInSilentMode is explicitly enabled.
// 2. Without reacting to AppState changes, backgrounding the app (locking the phone,
//    switching apps mid-lesson) can leave iOS's native audio session inactive —
//    playback then throws generic native errors ("Session lookup failed", "Server was
//    dead when activation request was made") the next time anything tries to play,
//    even a freshly created player, until the session is explicitly reactivated. This
//    is expo-audio's own documented pattern (setIsAudioActiveAsync's doc example),
//    not a workaround.

import { useEffect } from "react";
import { AppState } from "react-native";
import { setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";

export function useAudioSession(): void {
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    setIsAudioActiveAsync(true).catch(() => {});

    const subscription = AppState.addEventListener("change", (nextState) => {
      setIsAudioActiveAsync(nextState === "active").catch(() => {});
    });

    return () => subscription.remove();
  }, []);
}
