import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "@/design/tokens";

export interface IconProps {
  size?: number;
  color?: string;
  /** Forwarded to the underlying Svg element — used by consumers/tests to target a specific icon. */
  testID?: string;
}

// Filled, rounded clock face — "time" glyph (StatCard `time` variant). A solid
// disc with chunky rounded-cap hands set to a jaunty ~10:10, matching the bold
// filled-icon weight of the rest of the set rather than a thin outline clock.
export function ClockIcon({ size = 24, color = colors.blue, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" testID={testID}>
      <Circle cx="12" cy="12" r="9.5" fill={color} />
      <Path
        d="M12 6.75c.55 0 1 .45 1 1v4.05l2.9 1.9a1 1 0 1 1-1.1 1.67l-3.35-2.2a1 1 0 0 1-.45-.84V7.75c0-.55.45-1 1-1Z"
        fill={colors.background}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default ClockIcon;
