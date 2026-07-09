// OptionCard — taller rounded card variant of Tile.
// Used by match-pairs, listening grids, and stacked fill-in-blank/complete-chat
// choices. See docs/ui-reference.md sections 4-8 for the visual reference.
//
// States:
//  - default: white fill, light-gray border, subtle darker bottom edge (3D-press tile look)
//  - selected: light-blue fill/border (match-pairs "selected" state)
//  - correct: green fill/border + a brief sparkle-style opacity/scale flash
//  - wrong: red fill/border + a brief shake

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, radii, spacing, type as typeScale } from "@/design/tokens";

export type OptionCardState = "default" | "selected" | "correct" | "wrong";

export interface OptionCardProps {
  label: string;
  state?: OptionCardState;
  onPress?: () => void;
  onAudioTap?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const SHAKE_SEQUENCE = [10, -10, 8, -8, 4, -4, 0];

export function OptionCard({
  label,
  state = "default",
  onPress,
  onAudioTap,
  disabled = false,
  style,
  testID,
}: OptionCardProps) {
  const shakeX = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === "wrong") {
      shakeX.setValue(0);
      Animated.sequence(
        SHAKE_SEQUENCE.map((toValue) =>
          Animated.timing(shakeX, {
            toValue,
            duration: 40,
            useNativeDriver: true,
          })
        )
      ).start();
    }
  }, [state, shakeX]);

  useEffect(() => {
    if (state === "correct") {
      sparkle.setValue(0);
      Animated.sequence([
        Animated.timing(sparkle, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(sparkle, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [state, sparkle]);

  const cardStateStyle = STATE_STYLES[state];
  const isInteractive = !disabled && state === "default";

  const sparkleOpacity = sparkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const sparkleScale = sparkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.4],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ translateX: shakeX }] },
        style,
      ]}
    >
      <Pressable
        testID={testID}
        onPress={isInteractive ? onPress : undefined}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled, selected: state === "selected" }}
        style={({ pressed }) => [
          styles.card,
          cardStateStyle.card,
          pressed && isInteractive ? styles.cardPressed : null,
        ]}
      >
        <Text style={[styles.label, cardStateStyle.label]} numberOfLines={2}>
          {label}
        </Text>

        {onAudioTap ? (
          <Pressable
            testID={testID ? `${testID}-audio` : undefined}
            onPress={onAudioTap}
            hitSlop={spacing.sm}
            style={styles.audioButton}
            accessibilityRole="button"
            accessibilityLabel="Play audio"
          >
            <View style={styles.audioIcon} />
          </Pressable>
        ) : null}

        {state === "correct" ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sparkle,
              {
                opacity: sparkleOpacity,
                transform: [{ scale: sparkleScale }],
              },
            ]}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  card: {
    minHeight: 64,
    borderRadius: radii.md,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  cardPressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: typeScale.body.fontFamily,
    fontSize: typeScale.body.fontSize,
    color: colors.textDark,
    textAlign: "center",
    flexShrink: 1,
  },
  audioButton: {
    marginLeft: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  audioIcon: {
    width: 10,
    height: 10,
    borderRadius: radii.sm / 2,
    backgroundColor: colors.background,
  },
  sparkle: {
    position: "absolute",
    top: -spacing.sm,
    right: -spacing.sm,
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.gold,
  },
});

const stateSheet = StyleSheet.create({
  defaultCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  selectedCard: {
    // No dedicated "light blue fill" token exists yet — use the white card
    // background with a blue border + blue label, the lightest blue
    // treatment expressible from src/design/tokens.ts today.
    backgroundColor: colors.background,
    borderColor: colors.blue,
  },
  correctCard: {
    backgroundColor: colors.green,
    borderColor: colors.greenDark,
  },
  wrongCard: {
    backgroundColor: colors.red,
    borderColor: colors.redDark,
  },
  defaultLabel: { color: colors.textDark },
  selectedLabel: { color: colors.blueDark },
  correctLabel: { color: colors.background },
  wrongLabel: { color: colors.background },
});

const STATE_STYLES: Record<
  OptionCardState,
  { card: ViewStyle; label: { color: string } }
> = {
  default: { card: stateSheet.defaultCard, label: stateSheet.defaultLabel },
  selected: { card: stateSheet.selectedCard, label: stateSheet.selectedLabel },
  correct: { card: stateSheet.correctCard, label: stateSheet.correctLabel },
  wrong: { card: stateSheet.wrongCard, label: stateSheet.wrongLabel },
};
