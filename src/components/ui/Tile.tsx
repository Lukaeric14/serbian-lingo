import { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
} from "react-native";

import { colors, fonts, pressDepth, radii, spacing, type } from "@/design/tokens";

// Word-bank / option chip. Tile does NOT own audio playback — it only calls
// onAudioTap when provided, leaving the actual playback wiring to item 10.
export type TileState = "default" | "selected" | "ghost" | "correct" | "wrong";

export type TileProps = {
  label: string;
  state?: TileState;
  onPress?: (event: GestureResponderEvent) => void;
  onAudioTap?: () => void;
};

const FILL_BY_STATE: Record<TileState, string> = {
  default: colors.background,
  selected: colors.blue,
  ghost: colors.backgroundGray,
  correct: colors.green,
  wrong: colors.red,
};

const BORDER_BY_STATE: Record<TileState, string> = {
  default: colors.border,
  selected: colors.blueDark,
  ghost: colors.border,
  correct: colors.greenDark,
  wrong: colors.redDark,
};

const EDGE_BY_STATE: Record<TileState, string> = {
  default: colors.borderDark,
  selected: colors.blueDark,
  ghost: colors.border,
  correct: colors.greenDark,
  wrong: colors.redDark,
};

const TEXT_BY_STATE: Record<TileState, string> = {
  default: colors.textDark,
  selected: colors.background,
  ghost: colors.background,
  correct: colors.background,
  wrong: colors.background,
};

// A ghost tile is a flat, low-opacity, non-interactive placeholder left
// behind after its word has been used elsewhere in the answer area.
const GHOST_OPACITY = 0.4;
const TILE_EDGE_HEIGHT = pressDepth.edgeHeight - 1;

export function Tile({ label, state = "default", onPress, onAudioTap }: TileProps) {
  const isGhost = state === "ghost";
  const isFlash = state === "correct" || state === "wrong";
  const isDisabled = isGhost || isFlash;

  const translateY = useRef(new Animated.Value(0)).current;
  const edgeHeight = useRef(new Animated.Value(TILE_EDGE_HEIGHT)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === "wrong") {
      shakeX.setValue(0);
      Animated.sequence([
        Animated.timing(shakeX, { toValue: -6, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 6, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -4, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 4, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [state, shakeX]);

  const handlePressIn = () => {
    if (isDisabled) return;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: pressDepth.pressedTranslateY - 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(edgeHeight, {
        toValue: 0,
        duration: 50,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (isDisabled) return;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(edgeHeight, {
        toValue: TILE_EDGE_HEIGHT,
        duration: 70,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (isDisabled) return;
    onAudioTap?.();
    onPress?.(event);
  };

  return (
    <Animated.View
      style={[
        styles.edge,
        {
          backgroundColor: EDGE_BY_STATE[state],
          paddingBottom: isDisabled ? 0 : edgeHeight,
          opacity: isGhost ? GHOST_OPACITY : 1,
        },
      ]}
    >
      <Animated.View
        style={{
          transform: [
            { translateY: isDisabled ? 0 : translateY },
            { translateX: shakeX },
          ],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled, selected: state === "selected" }}
          disabled={isDisabled}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.tile,
            {
              backgroundColor: FILL_BY_STATE[state],
              borderColor: BORDER_BY_STATE[state],
            },
          ]}
        >
          <Text style={[styles.label, { color: TEXT_BY_STATE[state] }]}>{label}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  edge: {
    borderRadius: radii.md,
    alignSelf: "flex-start",
  },
  tile: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: type.body.fontSize,
  },
});

export default Tile;
