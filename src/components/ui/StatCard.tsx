// StatCard — lesson-complete stat card: colored header band + white body.
// Used in the row of 3 stat cards on the "Lesson complete" screen: TOTAL XP
// (gold, ⚡), QUICK (blue, time), PERFECT!/GREAT (green, accuracy %).
// See docs/ui-reference.md screen anatomy §9 ("Lesson complete").

import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, type } from "@/design/tokens";

export type StatCardVariant = "xp" | "time" | "accuracy";

export interface StatCardProps {
  variant: StatCardVariant;
  label: string;
  value: string;
}

const HEADER_COLOR_BY_VARIANT: Record<StatCardVariant, string> = {
  xp: colors.gold,
  time: colors.blue,
  accuracy: colors.green,
};

const ICON_BY_VARIANT: Record<StatCardVariant, string> = {
  xp: "⚡",
  time: "🕐",
  accuracy: "🎯",
};

export function StatCard({ variant, label, value }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View
        style={[styles.header, { backgroundColor: HEADER_COLOR_BY_VARIANT[variant] }]}
      >
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.icon}>{ICON_BY_VARIANT[variant]}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  header: {
    paddingVertical: spacing.xs,
    alignItems: "center",
  },
  label: {
    fontFamily: type.caption.fontFamily,
    fontSize: type.caption.fontSize,
    letterSpacing: type.caption.letterSpacing,
    color: colors.background,
  },
  body: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  icon: {
    fontSize: type.title.fontSize,
  },
  value: {
    fontFamily: type.title.fontFamily,
    fontSize: type.title.fontSize,
    color: colors.textDark,
  },
});

export default StatCard;
