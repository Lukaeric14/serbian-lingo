// FeedbackSheet — bottom sheet shown after answering an exercise.
// See docs/ui-reference.md §3 "Answer feedback" for the visual reference
// (Duolingo iOS correct/wrong feedback sheets, Mobbin screenshots linked there).

import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { colors, radii, spacing, type, pressDepth } from "@/design/tokens";

export type FeedbackSheetVariant = "correct" | "wrong";

export interface FeedbackSheetProps {
  /** Which visual treatment to render. */
  variant: FeedbackSheetVariant;
  /** Headline text, e.g. "Nicely done!" (correct) or "Incorrect" (wrong). */
  heading: string;
  /** Wrong-only: the correct answer to display under "Correct Answer:". */
  correctAnswerText?: string;
  /** Wrong-only: optional gloss shown under "Meaning:". */
  meaningText?: string;
  /** Called when the primary button ("CONTINUE" / "GOT IT") is pressed. */
  onPrimaryPress: () => void;
}

export function FeedbackSheet({
  variant,
  heading,
  correctAnswerText,
  meaningText,
  onPrimaryPress,
}: FeedbackSheetProps) {
  const isCorrect = variant === "correct";

  const sheetBg = isCorrect ? colors.feedbackCorrectBg : colors.feedbackWrongBg;
  const accentText = isCorrect ? colors.feedbackCorrectText : colors.feedbackWrongText;
  const buttonFill = isCorrect ? colors.green : colors.red;
  const buttonEdge = isCorrect ? colors.greenDark : colors.redDark;
  const primaryLabel = isCorrect ? "CONTINUE" : "GOT IT";

  return (
    <View
      style={[styles.sheet, { backgroundColor: sheetBg }]}
      testID="feedback-sheet"
      accessibilityRole="alert"
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { borderColor: accentText }]}>
          <Text style={[styles.iconGlyph, { color: accentText }]}>
            {isCorrect ? "✓" : "✕"}
          </Text>
        </View>
        <Text style={[styles.heading, { color: accentText }]}>{heading}</Text>
      </View>

      {!isCorrect && correctAnswerText ? (
        <View style={styles.answerBlock}>
          <Text style={[styles.answerLabel, { color: accentText }]}>
            Correct Answer:
          </Text>
          <Text style={styles.answerText}>{correctAnswerText}</Text>
        </View>
      ) : null}

      {!isCorrect && meaningText ? (
        <View style={styles.answerBlock}>
          <Text style={[styles.answerLabel, { color: accentText }]}>Meaning:</Text>
          <Text style={styles.answerText}>{meaningText}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={onPrimaryPress}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: buttonFill,
            borderBottomColor: buttonEdge,
            borderBottomWidth: pressed
              ? Math.max(pressDepth.edgeHeight - pressDepth.pressedTranslateY, 0)
              : pressDepth.edgeHeight,
            transform: [{ translateY: pressed ? pressDepth.pressedTranslateY : 0 }],
          },
        ]}
      >
        <Text style={styles.buttonLabel}>{primaryLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  iconGlyph: {
    fontFamily: type.title.fontFamily,
    fontSize: 16,
  },
  heading: {
    fontFamily: type.heading.fontFamily,
    fontSize: type.heading.fontSize,
  },
  answerBlock: {
    marginBottom: spacing.md,
  },
  answerLabel: {
    fontFamily: type.caption.fontFamily,
    fontSize: type.caption.fontSize,
    letterSpacing: type.caption.letterSpacing,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  answerText: {
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    color: colors.textDark,
  },
  button: {
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    fontFamily: type.button.fontFamily,
    fontSize: type.button.fontSize,
    letterSpacing: type.button.letterSpacing,
    color: colors.background,
  },
});

export default FeedbackSheet;
