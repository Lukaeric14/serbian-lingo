// TranslateBank — word-bank translate challenge renderer (SR -> EN).
// docs/challenge-schema.md: payload { promptText, correctAnswer, wordBank }.
//
// This component ONLY collects input and calls onSubmit when the learner is
// done. It does not grade the answer, does not show FeedbackSheet, and does
// not know about lesson-level state (streaks, XP, queue position) — that
// lives one level up in the future Lesson host screen.

import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AnswerLines, Button, ChallengeHeader, SpeechBubble, Tile } from "@/components/ui";
import { layout, spacing } from "@/design/tokens";
import { play } from "@/audio/player";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

export type TranslateBankProps = {
  challenge: Extract<Challenge, { type: "translate_bank" }>;
  onSubmit: (answer: Extract<ChallengeAnswer, { type: "translate_bank" }>) => void;
};

// Each bank word gets a stable per-slot id (index into the original
// wordBank) so duplicate words (e.g. two "the"s) can be tapped/removed
// independently without ambiguity.
type BankSlot = { id: number; label: string };

export default function TranslateBank({ challenge, onSubmit }: TranslateBankProps) {
  const { promptText, wordBank } = challenge.payload;

  // Order in which bank slot ids have been picked into the answer area.
  const [pickedIds, setPickedIds] = useState<number[]>([]);

  const bankSlots: BankSlot[] = wordBank.map((label, id) => ({ id, label }));
  const pickedSet = new Set(pickedIds);

  useEffect(() => {
    play(promptText);
    // Autoplay once per mount / new prompt only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptText]);

  const handleReplay = () => {
    play(promptText);
  };

  const handleBankTap = (id: number) => {
    if (pickedSet.has(id)) return;
    setPickedIds((prev) => [...prev, id]);
  };

  const handleAnswerTap = (id: number) => {
    setPickedIds((prev) => prev.filter((pickedId) => pickedId !== id));
  };

  const handleSubmit = () => {
    const orderedWords = pickedIds.map(
      (id) => bankSlots.find((slot) => slot.id === id)?.label ?? "",
    );
    onSubmit({ type: "translate_bank", orderedWords });
  };

  const canSubmit = pickedIds.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ChallengeHeader title="Translate this sentence" />

        <SpeechBubble text={promptText} onAudioTap={handleReplay} />

        <View style={styles.answerWrap}>
          <AnswerLines count={2} style={styles.answerLines} />
          <View style={styles.answerArea} testID="translate-bank-answer-area">
            {pickedIds.map((id) => {
              const slot = bankSlots.find((s) => s.id === id);
              if (!slot) return null;
              return (
                <Tile
                  key={slot.id}
                  label={slot.label}
                  state="selected"
                  onPress={() => handleAnswerTap(slot.id)}
                />
              );
            })}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.bankArea} testID="translate-bank-word-bank">
          {bankSlots.map((slot) => (
            <Tile
              key={slot.id}
              label={slot.label}
              state={pickedSet.has(slot.id) ? "ghost" : "default"}
              onPress={() => handleBankTap(slot.id)}
            />
          ))}
        </ScrollView>
      </View>

      <Button variant="green" label="Check" onPress={handleSubmit} disabled={!canSubmit} />
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
    paddingHorizontal: layout.screenPaddingH,
  },
  answerWrap: {
    justifyContent: "center",
  },
  answerLines: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  answerArea: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    minHeight: 48,
  },
  bankArea: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
