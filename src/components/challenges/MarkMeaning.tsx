// MarkMeaning — "mark_meaning" challenge renderer.
//
// Shows the Serbian promptText in a SpeechBubble (autoplay + tap-to-replay),
// then 3 English meanings as stacked, single-select OptionCard rows. The
// learner picks one, then presses "Check" to submit. This component only
// collects input — grading, FeedbackSheet, and lesson-level state (streaks,
// XP, queue position) all live one level up in the future Lesson host screen
// (SPEC.md §6, docs/challenge-schema.md `mark_meaning` payload).

import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, ChallengeHeader, OptionCard, SpeechBubble } from "@/components/ui";
import { spacing } from "@/design/tokens";
import { play } from "@/audio/player";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

export interface MarkMeaningProps {
  challenge: Extract<Challenge, { type: "mark_meaning" }>;
  onSubmit: (answer: Extract<ChallengeAnswer, { type: "mark_meaning" }>) => void;
}

export default function MarkMeaning({ challenge, onSubmit }: MarkMeaningProps) {
  const { promptText, options } = challenge.payload;
  const [selectedText, setSelectedText] = useState<string | null>(null);

  // Autoplay the Serbian prompt as soon as this challenge is shown.
  useEffect(() => {
    play(promptText);
    // Only re-autoplay if the prompt itself changes (e.g. next challenge in queue).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptText]);

  const handleReplay = () => {
    play(promptText);
  };

  const handleCheck = () => {
    if (selectedText === null) return;
    onSubmit({ type: "mark_meaning", selected: selectedText });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ChallengeHeader title="Select the correct meaning" />

        <SpeechBubble text={promptText} onAudioTap={handleReplay} />

        <View style={styles.options}>
          {options.map((option) => (
            <OptionCard
              key={option.text}
              label={option.text}
              state={selectedText === option.text ? "selected" : "default"}
              onPress={() => setSelectedText(option.text)}
            />
          ))}
        </View>
      </View>

      <Button
        variant="green"
        label="Check"
        onPress={handleCheck}
        disabled={selectedText === null}
      />
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
    gap: spacing.xl,
  },
  options: {
    gap: spacing.md,
  },
});
