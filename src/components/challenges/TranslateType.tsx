// TranslateType — docs/challenge-schema.md "translate_type" renderer.
//
// Shows the prompt in a SpeechBubble (Serbian prompts autoplay + are
// tap-to-replay via src/audio/player.ts; English prompts have no audio),
// a TextInput for the typed answer, and a green "Check" button that submits
// the raw text. Grading tolerance (typos/diacritics) lives in
// src/engine/grading.ts — this component only collects input.

import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { play } from "@/audio/player";
import { Button, SpeechBubble } from "@/components/ui";
import { colors, radii, spacing, type } from "@/design/tokens";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

export interface TranslateTypeProps {
  challenge: Extract<Challenge, { type: "translate_type" }>;
  onSubmit: (answer: Extract<ChallengeAnswer, { type: "translate_type" }>) => void;
}

export function TranslateType({ challenge, onSubmit }: TranslateTypeProps) {
  const { promptText, direction } = challenge.payload;
  const isSourceSerbian = direction === "sr_to_en";

  const [text, setText] = useState("");

  // Autoplay the Serbian prompt when the challenge is presented (sr_to_en
  // only — en_to_sr prompts are English and have no audio per the spec).
  useEffect(() => {
    if (isSourceSerbian) {
      play(promptText);
    }
    // Re-run if the underlying challenge (and thus prompt) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptText, isSourceSerbian]);

  const handleAudioTap = () => {
    play(promptText);
  };

  const handleCheck = () => {
    onSubmit({ type: "translate_type", text });
  };

  return (
    <View style={styles.container}>
      <SpeechBubble
        text={promptText}
        onAudioTap={isSourceSerbian ? handleAudioTap : undefined}
      />

      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Type your answer"
        placeholderTextColor={colors.textMedium}
        autoCapitalize="none"
        autoCorrect={false}
        testID="translate-type-input"
      />

      <Button variant="green" label="Check" onPress={handleCheck} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    color: colors.textDark,
  },
});

export default TranslateType;
