import React from "react";
import Svg, { Rect } from "react-native-svg";
import { colors } from "@/design/tokens";

export interface IconProps {
  size?: number;
  color?: string;
  /** Forwarded to the underlying Svg element — used by consumers/tests to target a specific icon. */
  testID?: string;
}

// Filled, rounded dumbbell — practice node glyph. A thick center bar with
// two chunky rounded end-weights, all built from rounded rects for a bold
// blocky read at small sizes.
export function DumbbellIcon({ size = 24, color = colors.background, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" testID={testID}>
      <Rect x="3" y="10.25" width="18" height="3.5" rx="1.75" fill={color} />
      <Rect x="1.5" y="7.5" width="4.5" height="9" rx="2.25" fill={color} />
      <Rect x="18" y="7.5" width="4.5" height="9" rx="2.25" fill={color} />
    </Svg>
  );
}

export default DumbbellIcon;
