import React from "react";
import Svg, { Path } from "react-native-svg";
import { colors } from "@/design/tokens";

export interface IconProps {
  size?: number;
  color?: string;
  /** Forwarded to the underlying Svg element — used by consumers/tests to target a specific icon. */
  testID?: string;
}

// Bold rounded checkmark — completed lesson node glyph. Thick stroke with
// round caps/joins so it reads as a solid chunky mark, not a thin tick.
export function CheckIcon({ size = 24, color = colors.background, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" testID={testID}>
      <Path
        d="M5 12.5 9.75 17 19 6.5"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export default CheckIcon;
