// SpeakerButton — rounded-square blue "play audio" button (see docs/ui-reference.md
// §5 Listening: "Big blue rounded-square speaker button (~120px) centered" and
// §2 word bank: "blue speaker icon (autoplays on load, tap replays)").
//
// Two sizes:
//   - "large": the ~120px listening-screen hero button.
//   - "small": the ~40px inline tap-to-hear glyph next to a sentence/word.
//
// Uses the same chunky "3D press" treatment as other buttons (tokens.pressDepth):
// a darker bottom edge that collapses when pressed.

import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, pressDepth, radii } from "@/design/tokens";

export type SpeakerButtonSize = "large" | "small";

export interface SpeakerButtonProps {
  /** "large" for listening screens (~120px), "small" for inline tap-to-hear (~40px). */
  size: SpeakerButtonSize;
  onPress: () => void;
  /** Optional visual pulse/active state while audio is playing. */
  isPlaying?: boolean;
  disabled?: boolean;
  /** Accessibility label; defaults to a sensible "Play audio" string. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const DIMENSIONS: Record<SpeakerButtonSize, number> = {
  large: 120,
  small: 40,
};

const GLYPH_FONT_SIZE: Record<SpeakerButtonSize, number> = {
  large: 52,
  small: 18,
};

export function SpeakerButton({
  size,
  onPress,
  isPlaying = false,
  disabled = false,
  accessibilityLabel,
  style,
}: SpeakerButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const dimension = DIMENSIONS[size];
  const borderRadius = size === "large" ? radii.lg : radii.md;
  const isDown = isPressed && !disabled;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? "Play audio"}
      accessibilityState={{ disabled, busy: isPlaying }}
      style={style}
    >
      <View
        style={[
          styles.edge,
          {
            width: dimension,
            height: dimension + pressDepth.edgeHeight,
            borderRadius,
            backgroundColor: disabled ? colors.disabledText : colors.blueDark,
          },
        ]}
      >
        <View
          style={[
            styles.face,
            {
              width: dimension,
              height: dimension,
              borderRadius,
              backgroundColor: disabled ? colors.disabledFill : colors.blue,
              transform: [
                { translateY: isDown ? pressDepth.pressedTranslateY : 0 },
              ],
            },
            isPlaying ? styles.pulsing : null,
          ]}
        >
          <Text
            style={[
              styles.glyph,
              { fontSize: GLYPH_FONT_SIZE[size] },
              disabled ? styles.glyphDisabled : null,
            ]}
          >
            {"\u{1F50A}"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  edge: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  face: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulsing: {
    opacity: 0.85,
  },
  glyph: {
    color: colors.background,
  },
  glyphDisabled: {
    color: colors.disabledText,
  },
});

export default SpeakerButton;
