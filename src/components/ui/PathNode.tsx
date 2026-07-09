import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, fonts, radii } from "@/design/tokens";

export type PathNodeState = "active" | "completed" | "locked";
export type PathNodeKind = "lesson" | "chest" | "practice";

export interface PathNodeProps {
  /** Progress state of the node — drives fill color, glyph, and the pulse ring. */
  state: PathNodeState;
  /** What kind of node this is — lesson (star), treasure chest, or practice (dumbbell). */
  kind?: PathNodeKind;
  /** Unit accent color, used for the fill when active/completed. Falls back to tokens.colors.green. */
  color?: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  /** Accessible label override; defaults to a sensible description built from state/kind. */
  accessibilityLabel?: string;
}

const NODE_SIZE = 70;
const RING_SIZE = NODE_SIZE + 16;

function glyphFor(kind: PathNodeKind, state: PathNodeState): string {
  if (state === "locked") {
    return "🔒";
  }
  if (kind === "chest") {
    return "🎁";
  }
  if (kind === "practice") {
    return "💪";
  }
  // lesson
  return state === "completed" ? "✓" : "★";
}

function fillColorFor(state: PathNodeState, kind: PathNodeKind, color?: string): string {
  if (state === "locked") {
    return colors.disabledFill;
  }
  if (state === "completed" && kind === "lesson") {
    return colors.gold;
  }
  return color ?? colors.green;
}

function edgeColorFor(fill: string, state: PathNodeState): string {
  if (state === "locked") {
    return colors.borderDark;
  }
  // Reuse the gold/green darker tones when they match tokens; otherwise a
  // simple darkening isn't available from tokens, so pick the closest dark
  // token for known unit colors, falling back to a neutral dark border.
  switch (fill) {
    case colors.green:
      return colors.greenDark;
    case colors.blue:
      return colors.blueDark;
    case colors.orange:
      return colors.orangeDark;
    case colors.gold:
      return colors.goldDark;
    case colors.red:
      return colors.redDark;
    case colors.purple:
      return colors.purpleDark;
    default:
      return colors.borderDark;
  }
}

export function PathNode({
  state,
  kind = "lesson",
  color,
  onPress,
  style,
  accessibilityLabel,
}: PathNodeProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state !== "active") {
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [state, pulse]);

  const fill = fillColorFor(state, kind, color);
  const edge = edgeColorFor(fill, state);
  const glyph = glyphFor(kind, state);
  const disabled = state === "locked";

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  const label =
    accessibilityLabel ?? `${kind} node, ${state}${disabled ? ", locked" : ""}`;

  return (
    <View style={[styles.wrapper, style]}>
      {state === "active" ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            {
              borderColor: fill,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
          testID="path-node-pulse-ring"
        />
      ) : null}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        hitSlop={spacingHitSlop}
        style={({ pressed }) => [
          styles.node,
          {
            backgroundColor: fill,
            borderBottomColor: edge,
          },
          pressed && !disabled ? styles.pressed : null,
        ]}
      >
        <Text style={styles.glyph}>{glyph}</Text>
      </Pressable>
    </View>
  );
}

const spacingHitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  wrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 6,
  },
  pressed: {
    transform: [{ translateY: 3 }],
    borderBottomWidth: 3,
  },
  pulseRing: {
    position: "absolute",
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: radii.pill,
    borderWidth: 3,
  },
  glyph: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    color: colors.background,
  },
});

export default PathNode;
