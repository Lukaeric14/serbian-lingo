// CompleteChat — "complete_chat" challenge renderer (docs/challenge-schema.md).
//
// Shows a 2-bubble Serbian dialogue (tap-to-hear on each), an English prompt
// question, and a stacked list of single-select English options (like
// mark_meaning). This component only collects the learner's selection and
// calls onSubmit — it does not grade, does not show feedback, and knows
// nothing about lesson-level state (that lives in the future Lesson host
// screen, per SPEC.md §6).

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, spacing, type as typeScale } from "@/design/tokens";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { OptionCard } from "@/components/ui/OptionCard";
import { Button } from "@/components/ui/Button";
import { play } from "@/audio/player";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

export interface CompleteChatProps {
  challenge: Extract<Challenge, { type: "complete_chat" }>;
  onSubmit: (answer: Extract<ChallengeAnswer, { type: "complete_chat" }>) => void;
}

/** First 1-2 letters of a speaker name, uppercased, for the SpeechBubble avatar. */
function initialsFor(speaker: string): string {
  return speaker.trim().slice(0, 2).toUpperCase();
}

export default function CompleteChat({ challenge, onSubmit }: CompleteChatProps) {
  const { dialogue, promptQuestion, options } = challenge.payload;
  const [selected, setSelected] = useState<string | null>(null);

  const canSubmit = selected !== null;

  const handleSubmit = () => {
    if (selected === null) return;
    onSubmit({ type: "complete_chat", selected });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.dialogue}>
          {dialogue.map((bubble, index) => (
            <SpeechBubble
              key={`${bubble.speaker}-${index}`}
              text={bubble.text}
              avatarInitials={initialsFor(bubble.speaker)}
              onAudioTap={() => play(bubble.text)}
            />
          ))}
        </View>

        <Text style={styles.prompt}>{promptQuestion}</Text>

        <View style={styles.options}>
          {options.map((option) => (
            <OptionCard
              key={option}
              label={option}
              state={selected === option ? "selected" : "default"}
              onPress={() => setSelected(option)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant={canSubmit ? "green" : "disabled"}
          label="Check"
          onPress={canSubmit ? handleSubmit : undefined}
          disabled={!canSubmit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  dialogue: {
    gap: spacing.lg,
  },
  prompt: {
    fontFamily: typeScale.title.fontFamily,
    fontSize: typeScale.title.fontSize,
    color: colors.textDark,
  },
  options: {
    gap: spacing.md,
  },
  footer: {
    padding: spacing.lg,
  },
});
