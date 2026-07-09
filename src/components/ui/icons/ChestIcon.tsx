import React from "react";
import Svg, { Path, Rect } from "react-native-svg";
import { colors } from "@/design/tokens";

export interface IconProps {
  size?: number;
  color?: string;
  /** Forwarded to the underlying Svg element — used by consumers/tests to target a specific icon. */
  testID?: string;
}

// Filled, rounded treasure chest — chest reward node glyph. Simple geometric
// build: a rounded-bottom body, a domed lid, and a small latch square — bold
// blocky shapes rather than ornate detail.
export function ChestIcon({ size = 24, color = colors.background, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" testID={testID}>
      <Path
        d="M4 9.5a4.5 4.5 0 0 1 4.5-4.5h7A4.5 4.5 0 0 1 20 9.5V11H4V9.5Z"
        fill={color}
      />
      <Rect x="3.5" y="11" width="17" height="8.5" rx="2.5" fill={color} />
      <Rect
        x="10.25"
        y="11"
        width="3.5"
        height="3.5"
        rx="1"
        fill={colors.textDark}
        opacity={0.28}
      />
    </Svg>
  );
}

export default ChestIcon;
