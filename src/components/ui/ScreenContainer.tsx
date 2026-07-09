import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, layout } from "@/design/tokens";

export interface ScreenContainerProps {
  children: ReactNode;
  /** Horizontal-margin content, e.g. a screen title or stat bar. Defaults true. */
  padded?: boolean;
  /** Background color override. Defaults to colors.background. */
  backgroundColor?: string;
  /** Safe-area edges to respect. Defaults to top+bottom (most screens are full-bleed on the sides). */
  edges?: Edge[];
  style?: ViewStyle;
  testID?: string;
}

/**
 * The single source of truth for screen-level spacing (SPEC.md §6 — never
 * inline-duplicate padding per screen). Every screen under src/app/ should
 * render its content inside this rather than a bare View, so margins stay
 * consistent app-wide. Scrollable screens should still use their own
 * ScrollView inside this container (padded=false) with the same
 * layout.screenPaddingH applied to contentContainerStyle, since SafeAreaView
 * + ScrollView padding compose awkwardly otherwise.
 */
export function ScreenContainer({
  children,
  padded = true,
  backgroundColor = colors.background,
  edges = ["top", "bottom"],
  style,
  testID,
}: ScreenContainerProps) {
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.root, { backgroundColor }]}
      testID={testID}
    >
      <View style={[padded ? styles.padded : styles.unpadded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  padded: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: layout.screenPaddingTop,
    paddingBottom: layout.screenPaddingBottom,
  },
  unpadded: {
    flex: 1,
  },
});
