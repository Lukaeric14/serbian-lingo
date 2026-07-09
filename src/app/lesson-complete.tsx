// Lesson complete — celebration screen shown after a lesson finishes. The Lesson
// screen navigates here passing xpEarned/durationSec/accuracy/streakIsNew as string
// params (expo-router serializes all params as strings). This screen is purely
// presentational over those params — it does not itself call recordCompletion (the
// Lesson screen/engine host is responsible for that before navigating here).
//
// See docs/ui-reference.md screen anatomy §9 ("Lesson complete"): celebration heading,
// row of 3 StatCards (XP / time / accuracy), blue CONTINUE button.
//
// Margin convention (see src/app/path.tsx / src/app/lesson/[lessonSlug].tsx): content
// (celebration + stat cards) gets horizontal margin via layout.screenPaddingH, but the
// full-width primary CONTINUE button stays full-bleed edge-to-edge — so this screen pads
// its content area directly rather than wrapping the whole thing in ScreenContainer.

import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, StatCard } from "@/components/ui";
import { StarIcon } from "@/components/ui/icons";
import { colors, glow, layout, radii, spacing, type } from "@/design/tokens";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) {
    return `${seconds}s`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function LessonCompleteScreen() {
  const params = useLocalSearchParams<{
    xpEarned?: string;
    durationSec?: string;
    accuracy?: string;
    streakIsNew?: string;
    // Not part of this screen's own required-params contract, but the Lesson screen
    // has the fresh streak count on hand (from recordCompletion's `newStreak`) and
    // the /streak screen needs a count to render — forwarded through if present.
    streak?: string;
    // Crown-level-style repetition (convex/progression.ts): which round of the
    // lesson this was, and whether that was the LAST required round — drives
    // whether the heading reads "lesson complete" or "keep practicing".
    round?: string;
    roundsRequired?: string;
    lessonFullyComplete?: string;
  }>();

  const xpEarned = Number(params.xpEarned ?? 0);
  const durationSec = Number(params.durationSec ?? 0);
  const accuracy = Number(params.accuracy ?? 0);
  const streakIsNew = params.streakIsNew === "true";
  const round = params.round ? Number(params.round) : null;
  const roundsRequired = params.roundsRequired ? Number(params.roundsRequired) : null;
  const lessonFullyComplete = params.lessonFullyComplete !== "false";

  const accuracyPercent = Math.round(
    (accuracy > 1 ? accuracy : accuracy * 100),
  );
  const accuracyLabel = accuracyPercent >= 100 ? "PERFECT!" : "GREAT";

  const heading = lessonFullyComplete
    ? "Lesson complete!"
    : `Nice practice! (${round}/${roundsRequired})`;

  const handleContinue = () => {
    if (streakIsNew) {
      router.push({
        pathname: "/streak",
        params: { streak: params.streak ?? "1" },
      });
    } else {
      router.replace("/path");
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.celebration}>
          <View style={styles.starGlow}>
            <StarIcon size={72} color={colors.gold} />
          </View>
          <Text style={styles.heading}>{heading}</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard variant="xp" label="Total XP" value={`${xpEarned}`} />
          <StatCard variant="time" label="Quick" value={formatDuration(durationSec)} />
          <StatCard variant="accuracy" label={accuracyLabel} value={`${accuracyPercent}%`} />
        </View>
      </View>

      <View style={styles.footer}>
        <Button variant="blue" label="Continue" onPress={handleContinue} />
      </View>
    </SafeAreaView>
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
    gap: spacing.xxl,
  },
  celebration: {
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  starGlow: {
    ...glow.gold,
    borderRadius: radii.pill,
  },
  heading: {
    fontFamily: type.heading.fontFamily,
    fontSize: type.heading.fontSize,
    color: colors.gold,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
