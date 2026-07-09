import { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
} from "react-native";

import { colors, fonts, pressDepth, radii, spacing, type } from "@/design/tokens";

export type ButtonVariant = "green" | "blue" | "red" | "disabled";

export type ButtonProps = {
  variant: ButtonVariant;
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
};

const FILL_BY_VARIANT: Record<ButtonVariant, string> = {
  green: colors.green,
  blue: colors.blue,
  red: colors.red,
  disabled: colors.disabledFill,
};

const EDGE_BY_VARIANT: Record<ButtonVariant, string> = {
  green: colors.greenDark,
  blue: colors.blueDark,
  red: colors.redDark,
  disabled: colors.borderDark,
};

export function Button({ variant, label, onPress, disabled = false }: ButtonProps) {
  const isDisabled = disabled || variant === "disabled";
  const translateY = useRef(new Animated.Value(0)).current;
  const edgeHeight = useRef(new Animated.Value(pressDepth.edgeHeight)).current;

  const handlePressIn = () => {
    if (isDisabled) return;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: pressDepth.pressedTranslateY,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(edgeHeight, {
        toValue: 0,
        duration: 60,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (isDisabled) return;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(edgeHeight, {
        toValue: pressDepth.edgeHeight,
        duration: 80,
        useNativeDriver: false,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        styles.edge,
        {
          backgroundColor: EDGE_BY_VARIANT[variant],
          paddingBottom: isDisabled ? 0 : edgeHeight,
        },
      ]}
    >
      <Animated.View
        style={{
          transform: [{ translateY: isDisabled ? 0 : translateY }],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled }}
          disabled={isDisabled}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.button,
            { backgroundColor: FILL_BY_VARIANT[variant] },
          ]}
        >
          <Text
            style={[
              styles.label,
              { color: isDisabled ? colors.disabledText : colors.background },
            ]}
          >
            {label.toUpperCase()}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  edge: {
    borderRadius: radii.lg,
    alignSelf: "stretch",
  },
  button: {
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fonts.extraBold,
    fontSize: type.button.fontSize,
    letterSpacing: type.button.letterSpacing,
  },
});

export default Button;
