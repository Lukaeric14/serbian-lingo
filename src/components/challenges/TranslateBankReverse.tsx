// translate_bank_reverse — "HARD EXERCISE" direction: EN prompt, learner builds the SR
// answer by tapping word-bank tiles (each tile plays its own SR audio on tap). See
// docs/challenge-schema.md for the payload shape and docs/ui-reference.md §2 for anatomy.
//
// This component ONLY collects input and calls onSubmit — it does not grade, does not
// show feedback, and knows nothing about lesson-level state (that lives in the future
// Lesson host screen).

import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Challenge, ChallengeAnswer } from "@/engine/grading";
import { play } from "@/audio/player";
import { AnswerLines, Button, ChallengeHeader, Tile } from "@/components/ui";
import { colors, layout, spacing, type } from "@/design/tokens";

export type TranslateBankReverseChallenge = Extract<
  Challenge,
  { type: "translate_bank_reverse" }
>;
export type TranslateBankReverseAnswer = Extract<
  ChallengeAnswer,
  { type: "translate_bank_reverse" }
>;

export type TranslateBankReverseProps = {
  challenge: TranslateBankReverseChallenge;
  onSubmit: (answer: TranslateBankReverseAnswer) => void;
};

// Each word-bank tile needs a stable identity independent of its text, since the same
// SR word can legitimately appear twice in a wordBank (e.g. distractor repeats a word).
interface BankItem {
  id: number;
  word: string;
}

export default function TranslateBankReverse({ challenge, onSubmit }: TranslateBankReverseProps) {
  const { promptText, wordBank } = challenge.payload;

  const bankItems = useMemo<BankItem[]>(
    () => wordBank.map((word, id) => ({ id, word })),
    [wordBank],
  );

  // Ordered list of bank item ids the learner has tapped, in tap order — this doubles
  // as both the built answer and the set of tiles to render as "ghost" in the bank.
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const selectedItems = selectedIds
    .map((id) => bankItems.find((item) => item.id === id))
    .filter((item): item is BankItem => item !== undefined);

  const handleBankTap = (item: BankItem) => {
    play(item.word);
    if (selectedIds.includes(item.id)) return;
    setSelectedIds((prev) => [...prev, item.id]);
  };

  const handleAnswerTap = (id: number) => {
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
  };

  const handleSubmit = () => {
    onSubmit({
      type: "translate_bank_reverse",
      orderedWords: selectedItems.map((item) => item.word),
    });
  };

  const canSubmit = selectedItems.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ChallengeHeader title="Translate this sentence" pill="hard-exercise" />

        <Text style={styles.prompt}>{promptText}</Text>

        <View style={styles.answerWrap}>
          <AnswerLines count={2} style={styles.answerLines} />
          <View style={styles.answerArea} testID="answer-area">
            {selectedItems.map((item) => (
              <Tile
                key={item.id}
                label={item.word}
                state="selected"
                onPress={() => handleAnswerTap(item.id)}
                onAudioTap={() => play(item.word)}
              />
            ))}
          </View>
        </View>

        <View style={styles.wordBank} testID="word-bank">
          {bankItems.map((item) => {
            const isUsed = selectedIds.includes(item.id);
            return (
              <Tile
                key={item.id}
                label={item.word}
                state={isUsed ? "ghost" : "default"}
                onPress={() => handleBankTap(item)}
                onAudioTap={() => play(item.word)}
              />
            );
          })}
        </View>
      </View>

      <Button
        variant={canSubmit ? "green" : "disabled"}
        label="Check"
        disabled={!canSubmit}
        onPress={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: layout.screenPaddingH,
  },
  prompt: {
    fontFamily: type.title.fontFamily,
    fontSize: type.title.fontSize,
    color: colors.textDark,
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  wordBank: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
