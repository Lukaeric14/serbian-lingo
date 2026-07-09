import React from "react";
import Svg, { Path, Rect } from "react-native-svg";
import { colors } from "@/design/tokens";

export interface IconProps {
  size?: number;
  color?: string;
  /** Forwarded to the underlying Svg element — used by consumers/tests to target a specific icon. */
  testID?: string;
}

// Filled, rounded padlock — locked node glyph. Thick shackle + chunky body
// with generous corner radius, no thin outline anywhere.
export function LockIcon({ size = 24, color = colors.background, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" testID={testID}>
      <Path
        d="M7.25 10V8a4.75 4.75 0 1 1 9.5 0v2"
        stroke={color}
        strokeWidth={2.75}
        strokeLinecap="round"
        fill="none"
      />
      <Rect x="4.5" y="9.5" width="15" height="11.5" rx="3.5" fill={color} />
    </Svg>
  );
}

export default LockIcon;
