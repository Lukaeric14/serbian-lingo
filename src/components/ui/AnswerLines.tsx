import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors, spacing } from "@/design/tokens";

export interface AnswerLinesProps {
  /** How many ruled lines to show. Default 2 — matches real Duolingo's answer-area convention. */
  count?: number;
  style?: ViewStyle;
}

/**
 * Decorative ruled lines marking where a built/typed answer will appear —
 * the visual cue real Duolingo always shows (docs/ui-reference.md: "Answer
 * area: 2–3 horizontal ruled lines where picked tiles land"), currently
 * missing from every renderer (answers just appeared in blank space).
 *
 * Purely a backdrop: render this first, then your tiles/TextInput on top —
 * it does not manage layout for its children, just draws the lines.
 */
export function AnswerLines({ count = 2, style }: AnswerLinesProps) {
  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.line} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  line: {
    height: 1,
    backgroundColor: colors.border,
  },
});
