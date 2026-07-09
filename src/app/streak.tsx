// Streak celebration — shown after the FIRST lesson completion of the day (lesson-
// complete.tsx routes here only when streakIsNew==="true"). Reads the streak count
// from expo-router params (forwarded by lesson-complete.tsx as `streak`, sourced
// from recordCompletion's `newStreak`). Hero flame is FlameIcon with a gold glow —
// this is the celebratory moment on this screen.
//
// See docs/ui-reference.md screen anatomy §10 ("Streak screen"): huge flame + day
// count + "day streak!", encouragement line, blue CONTINUE button.

import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button, ScreenContainer } from "@/components/ui";
import { FlameIcon } from "@/components/ui/icons";
import { colors, glow, layout, spacing, type } from "@/design/tokens";

export default function StreakScreen() {
  const params = useLocalSearchParams<{ streak?: string }>();
  const streakCount = Number(params.streak ?? 1);

  const handleContinue = () => {
    router.replace("/path");
  };

  return (
    <ScreenContainer padded={false} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.celebration}>
          <View style={styles.flameGlow}>
            <FlameIcon size={96} />
          </View>
          <Text style={styles.count}>{streakCount}</Text>
          <Text style={styles.label}>day streak!</Text>
          <Text style={styles.encouragement}>You're on a roll — keep it up!</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button variant="blue" label="Continue" onPress={handleContinue} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: spacing.xxl,
    justifyContent: "space-between",
  },
  content: {
    paddingHorizontal: layout.screenPaddingH,
  },
  celebration: {
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xxl * 2,
  },
  flameGlow: {
    ...glow.gold,
  },
  count: {
    fontFamily: type.heading.fontFamily,
    fontSize: 56,
    color: colors.orange,
  },
  label: {
    fontFamily: type.heading.fontFamily,
    fontSize: type.heading.fontSize,
    color: colors.textDark,
  },
  encouragement: {
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    color: colors.textMedium,
    marginTop: spacing.md,
    textAlign: "center",
  },
  footer: {
    marginTop: spacing.xl,
    paddingHorizontal: layout.screenPaddingH,
  },
});
