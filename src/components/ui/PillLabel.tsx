// PillLabel — small rounded pill with ALL-CAPS bold text, used above exercise
// titles to flag a new word (purple) or a hard/reverse exercise (red).
// See docs/ui-reference.md screen anatomy §2 ("Translate sentence — word bank").

import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, type } from "@/design/tokens";

export type PillLabelVariant = "new-word" | "hard-exercise";

export interface PillLabelProps {
  variant: PillLabelVariant;
}

const VARIANT_LABEL: Record<PillLabelVariant, string> = {
  "new-word": "NEW WORD",
  "hard-exercise": "HARD EXERCISE",
};

export function PillLabel({ variant }: PillLabelProps) {
  const isNewWord = variant === "new-word";

  return (
    <View
      style={[
        styles.pill,
        isNewWord ? styles.pillNewWord : styles.pillHardExercise,
      ]}
    >
      <Text
        style={[
          styles.label,
          isNewWord ? styles.labelNewWord : styles.labelHardExercise,
        ]}
      >
        {VARIANT_LABEL[variant]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  pillNewWord: {
    backgroundColor: colors.purple,
  },
  pillHardExercise: {
    backgroundColor: colors.red,
  },
  label: {
    fontFamily: type.caption.fontFamily,
    fontSize: type.caption.fontSize,
    letterSpacing: type.caption.letterSpacing,
    textTransform: "uppercase",
  },
  labelNewWord: {
    color: colors.background,
  },
  labelHardExercise: {
    color: colors.background,
  },
});
