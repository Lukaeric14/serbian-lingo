import React from "react";
import Svg, { Circle } from "react-native-svg";
import { colors } from "@/design/tokens";

export interface IconProps {
  size?: number;
  color?: string;
  /** Forwarded to the underlying Svg element — used by consumers/tests to target a specific icon. */
  testID?: string;
}

// Filled, rounded bullseye — "accuracy" glyph (StatCard `accuracy` variant).
// Three concentric rings (solid color / white / solid color) rather than a
// stroked outline, keeping the same bold filled-icon weight as the rest of
// the set.
export function TargetIcon({ size = 24, color = colors.green, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" testID={testID}>
      <Circle cx="12" cy="12" r="9.5" fill={color} />
      <Circle cx="12" cy="12" r="6.25" fill={colors.background} />
      <Circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
  );
}

export default TargetIcon;
