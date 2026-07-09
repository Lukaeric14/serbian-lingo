// CompleteTranslation — "complete_translation" challenge renderer.
// docs/challenge-schema.md: payload { sourceText, targetTemplate, correctAnswer, options }.
//
// Shows the Serbian sourceText in a SpeechBubble (autoplay on mount + tap-to-replay),
// the English targetTemplate with its "___" placeholder rendered as a blank slot that
// fills in with the tapped option, and the options as Tile choices. This component only
// collects input — grading, FeedbackSheet, and lesson-level state all live one level up
// in the future Lesson host screen (per the component contract).

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { play } from "@/audio/player";
import { Button, ChallengeHeader, SpeechBubble, Tile } from "@/components/ui";
import { colors, fonts, spacing, type } from "@/design/tokens";
import { padAfterBlank, padBeforeBlank } from "@/lib/blank-spacing";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

const PLACEHOLDER = "___";

export interface CompleteTranslationProps {
  challenge: Extract<Challenge, { type: "complete_translation" }>;
  onSubmit: (answer: Extract<ChallengeAnswer, { type: "complete_translation" }>) => void;
}

export default function CompleteTranslation({ challenge, onSubmit }: CompleteTranslationProps) {
  const { sourceText, targetTemplate, options } = challenge.payload;
  const [selected, setSelected] = useState<string | null>(null);

  // Autoplay the Serbian source sentence when the challenge is shown.
  useEffect(() => {
    play(sourceText);
    // Re-trigger autoplay if the underlying challenge (and thus sourceText) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceText]);

  const handleReplay = () => {
    play(sourceText);
  };

  const handleSelect = (option: string) => {
    setSelected(option);
  };

  const handleCheck = () => {
    if (selected === null) return;
    onSubmit({ type: "complete_translation", selected });
  };

  const [before, after] = splitTemplate(targetTemplate);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ChallengeHeader title="Complete the translation" />

        <SpeechBubble text={sourceText} onAudioTap={handleReplay} />

        <View style={styles.templateRow}>
          <Text style={styles.templateText}>
            {padBeforeBlank(before)}
            <Text style={styles.blank}>{selected ?? PLACEHOLDER}</Text>
            {padAfterBlank(after)}
          </Text>
        </View>

        <View style={styles.optionsRow}>
          {options.map((option) => (
            <Tile
              key={option}
              label={option}
              state={selected === option ? "selected" : "default"}
              onPress={() => handleSelect(option)}
            />
          ))}
        </View>
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

/** Splits an English target template on the "___" placeholder into [before, after]. */
function splitTemplate(template: string): [string, string] {
  const index = template.indexOf(PLACEHOLDER);
  if (index === -1) return [template, ""];
  return [
    template.slice(0, index),
    template.slice(index + PLACEHOLDER.length),
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.lg,
  },
  content: {
    flex: 1,
    gap: spacing.lg,
  },
  templateRow: {
    paddingHorizontal: spacing.xs,
  },
  templateText: {
    fontFamily: fonts.semiBold,
    fontSize: type.body.fontSize,
    color: colors.textDark,
  },
  blank: {
    fontFamily: fonts.extraBold,
    color: colors.blue,
    textDecorationLine: "underline",
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
