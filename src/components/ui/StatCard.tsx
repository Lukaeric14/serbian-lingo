// StatCard — lesson-complete stat card: colored header band + white body.
// Used in the row of 3 stat cards on the "Lesson complete" screen: TOTAL XP
// (gold, BoltIcon), QUICK (blue, ClockIcon), PERFECT!/GREAT (green, TargetIcon).
// See docs/ui-reference.md screen anatomy §9 ("Lesson complete").

import type { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, type } from "@/design/tokens";
import { BoltIcon, ClockIcon, TargetIcon, type IconProps } from "@/components/ui/icons";

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

// Icon color matches each card's own header color so the glyph reads as an
// extension of the colored band, sitting on the white body below it.
const ICON_BY_VARIANT: Record<StatCardVariant, ComponentType<IconProps>> = {
  xp: BoltIcon,
  time: ClockIcon,
  accuracy: TargetIcon,
};

export function StatCard({ variant, label, value }: StatCardProps) {
  const Icon = ICON_BY_VARIANT[variant];
  return (
    <View style={styles.card}>
      <View
        style={[styles.header, { backgroundColor: HEADER_COLOR_BY_VARIANT[variant] }]}
      >
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      </View>
      <View style={styles.body}>
        <Icon size={type.title.fontSize} color={HEADER_COLOR_BY_VARIANT[variant]} />
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
  value: {
    fontFamily: type.title.fontFamily,
    fontSize: type.title.fontSize,
    color: colors.textDark,
  },
});

export default StatCard;
