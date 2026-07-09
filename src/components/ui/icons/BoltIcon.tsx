import React from "react";
import Svg, { Path } from "react-native-svg";
import { colors } from "@/design/tokens";

export interface IconProps {
  size?: number;
  color?: string;
  /** Forwarded to the underlying Svg element — used by consumers/tests to target a specific icon. */
  testID?: string;
}

// Filled, rounded lightning bolt — XP glyph. Defaults to tokens.colors.gold
// (the XP color) since this is used standalone in stat bars, not inside a
// colored node. Chunky offset-zigzag with rounded joins, not a thin outline.
export function BoltIcon({ size = 24, color = colors.gold, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" testID={testID}>
      <Path
        d="M13.4 2.1c.5-.16 1.02.14 1.14.65.03.14.03.28 0 .42l-1.5 7.1h5.1c.6 0 1.08.48 1.08 1.08 0 .27-.1.53-.29.73l-9.2 9.75c-.36.38-.97.36-1.32-.04a.94.94 0 0 1-.2-.85l1.5-7.1H4.6a1.08 1.08 0 0 1-.79-1.81l9.2-9.75a1 1 0 0 1 .39-.18Z"
        fill={color}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default BoltIcon;
