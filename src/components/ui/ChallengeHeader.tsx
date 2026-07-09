import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "@/design/tokens";
import { PillLabel, type PillLabelVariant } from "./PillLabel";

export interface ChallengeHeaderProps {
  /** e.g. "Translate this sentence", "Tap the matching pairs" — docs/ui-reference.md's per-type titles. */
  title: string;
  /** Shows a PillLabel above the title when set (e.g. "hard-exercise" for EN->SR direction). */
  pill?: PillLabelVariant;
}

/**
 * The instructional header every challenge screen shows at the top, telling
 * the learner what to do before they see the prompt/options — matches real
 * Duolingo's convention (see docs/ui-reference.md) of a bold task title, not
 * just diving straight into content.
 */
export function ChallengeHeader({ title, pill }: ChallengeHeaderProps) {
  return (
    <View style={styles.container}>
      {pill ? (
        <View style={styles.pillRow}>
          <PillLabel variant={pill} />
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  pillRow: {
    flexDirection: "row",
  },
  title: {
    fontFamily: type.title.fontFamily,
    fontSize: type.title.fontSize,
    color: colors.textDark,
  },
});
