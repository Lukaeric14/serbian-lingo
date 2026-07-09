import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { colors, radii, spacing } from "@/design/tokens";

export interface ProgressBarProps {
  /** Progress from 0 (empty) to 1 (full). Values outside this range are clamped. */
  progress: number;
  /** Fill color. Defaults to tokens.colors.green. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Rounded horizontal progress bar — gray track with a colored fill sized by
 * `progress`. Matches the lesson-header progress bar from Duolingo's UI
 * (see docs/ui-reference.md, screen anatomy #2).
 */
export function ProgressBar({ progress, color = colors.green, style }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View style={[styles.track, style]} testID="progress-bar-track">
      <View
        testID="progress-bar-fill"
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    // Bar height isn't its own token; reuse the "md" spacing token so the
    // value still traces back to design/tokens.ts rather than a magic number.
    height: spacing.md,
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.pill,
  },
});
