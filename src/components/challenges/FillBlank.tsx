// FillBlank challenge renderer — docs/challenge-schema.md "fill_blank" payload.
//
// Renders sentenceBefore + a blank slot + sentenceAfter as one flowing line of text
// with a small inline SpeakerButton that plays the full sentence audio. The learner
// taps one of the option Tiles to fill the blank, then taps "Check" to submit.
//
// This component ONLY collects input and calls onSubmit — it does not grade the
// answer, does not show feedback, and knows nothing about lesson-level state
// (streaks, XP, queue position). That lives one level up in the Lesson host screen.

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing, type } from "@/design/tokens";
import { Button } from "@/components/ui/Button";
import { SpeakerButton } from "@/components/ui/SpeakerButton";
import { Tile } from "@/components/ui/Tile";
import { play } from "@/audio/player";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

export type FillBlankChallenge = Extract<Challenge, { type: "fill_blank" }>;
export type FillBlankAnswer = Extract<ChallengeAnswer, { type: "fill_blank" }>;

export interface FillBlankProps {
  challenge: FillBlankChallenge;
  onSubmit: (answer: FillBlankAnswer) => void;
}

export default function FillBlank({ challenge, onSubmit }: FillBlankProps) {
  const { sentenceBefore, sentenceAfter, fullSentenceAudioText, options } = challenge.payload;
  const [selected, setSelected] = useState<string | null>(null);

  const handleOptionPress = (option: string) => {
    setSelected(option);
  };

  const handleCheck = () => {
    if (selected === null) return;
    onSubmit({ type: "fill_blank", selected });
  };

  return (
    <View style={styles.container}>
      <View style={styles.sentenceRow}>
        <SpeakerButton
          size="small"
          onPress={() => play(fullSentenceAudioText)}
          style={styles.speaker}
        />
        <Text style={styles.sentenceText}>
          {sentenceBefore}
          <Text style={styles.blank}>{selected ?? "____"}</Text>
          {sentenceAfter}
        </Text>
      </View>

      <View style={styles.optionsRow}>
        {options.map((option) => (
          <Tile
            key={option}
            label={option}
            state={selected === option ? "selected" : "default"}
            onPress={() => handleOptionPress(option)}
          />
        ))}
      </View>

      <Button
        variant="green"
        label="Check"
        onPress={handleCheck}
        disabled={selected === null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  sentenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  speaker: {
    flexShrink: 0,
  },
  sentenceText: {
    flex: 1,
    flexWrap: "wrap",
    fontFamily: fonts.semiBold,
    fontSize: type.body.fontSize,
    color: colors.textDark,
  },
  blank: {
    fontFamily: fonts.bold,
    color: colors.blueDark,
    borderBottomWidth: 2,
    borderBottomColor: colors.blueDark,
    borderRadius: radii.sm,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
