// ListenType — "listen_type" challenge renderer (docs/challenge-schema.md).
//
// Learner hears a Serbian word/phrase (auto-played on mount, replayable via
// tap) and types what they heard. This component only collects the typed
// answer and calls onSubmit — grading tolerance lives in src/engine/grading.ts
// and is applied one level up by the future Lesson host screen.

import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { play } from "@/audio/player";
import { AnswerLines, Button, ChallengeHeader, SpeakerButton } from "@/components/ui";
import { colors, fonts, radii, spacing, type } from "@/design/tokens";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

export interface ListenTypeProps {
  challenge: Extract<Challenge, { type: "listen_type" }>;
  onSubmit: (answer: Extract<ChallengeAnswer, { type: "listen_type" }>) => void;
}

export default function ListenType({ challenge, onSubmit }: ListenTypeProps) {
  const { audioText } = challenge.payload;
  const [text, setText] = useState("");

  // Auto-play the clip once when the challenge mounts.
  useEffect(() => {
    play(audioText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioText]);

  const handleReplay = () => {
    play(audioText);
  };

  const handleCheck = () => {
    onSubmit({ type: "listen_type", text });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ChallengeHeader title="Type what you hear" />

        <View style={styles.speakerRow}>
          <SpeakerButton
            size="large"
            onPress={handleReplay}
            accessibilityLabel="Play audio"
          />
        </View>
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type what you hear"
            placeholderTextColor={colors.textMedium}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Typed answer"
          />
          <AnswerLines count={1} />
        </View>
      </View>
      <Button variant="green" label="Check" onPress={handleCheck} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.xl,
  },
  speakerRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  inputArea: {
    gap: spacing.sm,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.semiBold,
    fontSize: type.body.fontSize,
    color: colors.textDark,
    backgroundColor: colors.background,
  },
});
