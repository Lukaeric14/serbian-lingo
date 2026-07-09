import React from "react";
import Svg, { Path } from "react-native-svg";
import { colors } from "@/design/tokens";

export interface IconProps {
  size?: number;
  color?: string;
  /** Forwarded to the underlying Svg element — used by consumers/tests to target a specific icon. */
  testID?: string;
}

// Filled, rounded streak flame. Defaults to tokens.colors.orange (the streak
// color) since this is used standalone in stat bars, not inside a colored
// node — unlike the node glyphs above which default to white-on-fill.
export function FlameIcon({ size = 24, color = colors.orange, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" testID={testID}>
      <Path
        d="M12.6 2.15c.55 2.1-.15 3.5-1.35 4.85-1.5 1.65-3.15 3.4-3.15 6.1a4.9 4.9 0 0 0 4.9 4.9c.42 0 .82-.28.82-.8 0-.32-.16-.53-.35-.78-.5-.66-.87-1.34-.87-2.22 0-1.1.7-1.85 1.4-2.6.28.72.14 1.34-.13 1.97.86-.55 1.53-1.5 1.53-2.87 0-1.5-.72-2.4-1.4-3.28.68.18 1.3.5 1.87.95 1.55 1.23 2.58 3.1 2.58 5.33a5.9 5.9 0 0 1-5.9 5.9 6.4 6.4 0 0 1-6.4-6.4c0-2.75 1.35-4.6 2.75-6.32C10.15 5.3 11.5 3.85 12.6 2.15Z"
        fill={color}
      />
    </Svg>
  );
}

export default FlameIcon;
