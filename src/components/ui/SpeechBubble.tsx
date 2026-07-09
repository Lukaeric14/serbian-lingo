// SpeechBubble — rounded speech-bubble with a small tail, used next to the
// lesson character to present a source sentence (see docs/ui-reference.md,
// screen anatomy §2/§6: "Character + speech bubble ... blue speaker icon").
//
// v1 has no real character art: avatarInitials renders a colored circle with
// initials instead. The audio tap target is an inlined minimal equivalent of
// the SpeakerButton primitive (that component may not exist yet in this
// worktree) — do not import it from elsewhere.

import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, fonts, radii, spacing, type } from "@/design/tokens";

export interface SpeechBubbleProps {
  /** Sentence/text shown inside the bubble. */
  text: string;
  /** Initials for the circular avatar placeholder, e.g. "SM". Omit to hide the avatar. */
  avatarInitials?: string;
  /** Called when the embedded audio tap target is pressed. Omit to hide the audio button. */
  onAudioTap?: () => void;
  /** Optional style override for the outer row container. */
  style?: StyleProp<ViewStyle>;
}

export function SpeechBubble({
  text,
  avatarInitials,
  onAudioTap,
  style,
}: SpeechBubbleProps) {
  return (
    <View style={[styles.row, style]}>
      {avatarInitials ? (
        <View style={styles.avatar} testID="speech-bubble-avatar">
          <Text style={styles.avatarText}>{avatarInitials}</Text>
        </View>
      ) : null}

      <View style={styles.bubbleWrap}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{text}</Text>

          {onAudioTap ? (
            <Pressable
              onPress={onAudioTap}
              hitSlop={spacing.sm}
              accessibilityRole="button"
              accessibilityLabel="Play audio"
              style={({ pressed }) => [
                styles.audioButton,
                pressed && styles.audioButtonPressed,
              ]}
              testID="speech-bubble-audio-button"
            >
              <SpeakerIcon />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.tail} />
      </View>
    </View>
  );
}

// Minimal inline speaker glyph — three stacked bars fanning out from a dot,
// avoids depending on an icon library or the (possibly not-yet-built)
// SpeakerButton component.
function SpeakerIcon() {
  return (
    <View style={styles.speakerIcon}>
      <View style={styles.speakerBody} />
      <View style={[styles.speakerWave, styles.speakerWaveSmall]} />
      <View style={[styles.speakerWave, styles.speakerWaveLarge]} />
    </View>
  );
}

const AVATAR_SIZE = 48;
const TAIL_SIZE = 10;
const SPEAKER_SIZE = 28;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.extraBold,
    fontSize: type.body.fontSize,
    color: colors.background,
  },
  bubbleWrap: {
    flexShrink: 1,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  bubbleText: {
    flexShrink: 1,
    fontFamily: fonts.semiBold,
    fontSize: type.body.fontSize,
    color: colors.textDark,
  },
  tail: {
    position: "absolute",
    bottom: spacing.md,
    left: -TAIL_SIZE / 2,
    width: TAIL_SIZE,
    height: TAIL_SIZE,
    backgroundColor: colors.background,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: "45deg" }],
  },
  audioButton: {
    width: SPEAKER_SIZE,
    height: SPEAKER_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  audioButtonPressed: {
    backgroundColor: colors.blueDark,
  },
  speakerIcon: {
    width: 14,
    height: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  speakerBody: {
    width: 5,
    height: 8,
    backgroundColor: colors.background,
    borderTopLeftRadius: 1,
    borderBottomLeftRadius: 1,
  },
  speakerWave: {
    borderColor: colors.background,
    borderRightWidth: 0,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderLeftWidth: 0,
    borderStyle: "solid",
  },
  speakerWaveSmall: {
    width: 3,
    height: 6,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 1.5,
    borderLeftWidth: 0,
    marginLeft: 1,
  },
  speakerWaveLarge: {
    width: 5,
    height: 10,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 1.5,
    borderLeftWidth: 0,
    marginLeft: 1,
  },
});

export default SpeechBubble;
