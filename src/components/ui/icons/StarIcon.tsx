import React from "react";
import Svg, { Path } from "react-native-svg";
import { colors } from "@/design/tokens";

export interface IconProps {
  size?: number;
  color?: string;
  /** Forwarded to the underlying Svg element — used by consumers/tests to target a specific icon. */
  testID?: string;
}

// Bold, rounded 5-point star — active lesson node glyph. Points are kept
// short/chunky (not spiky) and corners rounded via strokeLinejoin, matching
// Duolingo's filled-icon weight rather than a literal geometric star.
export function StarIcon({ size = 24, color = colors.background, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" testID={testID}>
      <Path
        d="M12 2.5c.52 0 .99.3 1.2.77l2.1 4.55 4.95.6c.53.06.97.42 1.14.92.17.5.03 1.05-.35 1.42l-3.66 3.53 1 4.96c.1.52-.1 1.06-.53 1.37-.43.31-1 .34-1.46.08L12 17.9l-4.39 2.8c-.46.26-1.03.23-1.46-.08-.43-.31-.63-.85-.53-1.37l1-4.96-3.66-3.53a1.35 1.35 0 0 1-.35-1.42c.17-.5.61-.86 1.14-.92l4.95-.6 2.1-4.55c.21-.47.68-.77 1.2-.77Z"
        fill={color}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default StarIcon;
