import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { setAudioModeAsync } from "expo-audio";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL ?? "", {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  // Word/sentence audio is core content, not a notification sound — it must play even
  // if the learner's phone has the physical silent switch on (iOS mutes app audio by
  // default otherwise). Only surfaced now testing on a real device; the simulator has
  // no silent switch so this gap was invisible until tonight.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ConvexProvider client={convex}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </ConvexProvider>
  );
}
