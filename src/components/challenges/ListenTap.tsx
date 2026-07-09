// ListenTap — docs/challenge-schema.md `listen_tap` renderer.
//
// payload: { audioText: string /* SR word, audioClips kind:"word" */, options: string[] }
//
// Layout per docs/ui-reference.md §5 Listening: a large centered SpeakerButton that
// autoplays the target word on mount (and replays on tap), with the options rendered
// as a 2-column grid of single-select OptionCard tiles below. This component ONLY
// collects the learner's selection and reports it via onSubmit — grading, feedback,
// and lesson-level state all live one level up in the Lesson host screen.

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, ChallengeHeader, OptionCard, SpeakerButton } from "@/components/ui";
import { spacing } from "@/design/tokens";
import { play } from "@/audio/player";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

export interface ListenTapProps {
  challenge: Extract<Challenge, { type: "listen_tap" }>;
  onSubmit: (answer: Extract<ChallengeAnswer, { type: "listen_tap" }>) => void;
}

export default function ListenTap({ challenge, onSubmit }: ListenTapProps) {
  const { audioText, options } = challenge.payload;
  const [selected, setSelected] = useState<string | null>(null);

  // Auto-play the target word once when the challenge mounts.
  useEffect(() => {
    play(audioText);
    // Intentionally only on mount — re-playing on every audioText identity change
    // isn't needed since a given challenge instance's audioText never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReplay = () => {
    play(audioText);
  };

  const handleCheck = () => {
    if (selected === null) return;
    onSubmit({ type: "listen_tap", selected });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ChallengeHeader title="Tap what you hear" />

        <View style={styles.speakerRow}>
          <SpeakerButton size="large" onPress={handleReplay} />
        </View>

        <View style={styles.grid}>
          {options.map((option) => (
            <View key={option} style={styles.gridItem}>
              <OptionCard
                label={option}
                state={selected === option ? "selected" : "default"}
                onPress={() => setSelected(option)}
              />
            </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
  },
  speakerRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.sm,
  },
  gridItem: {
    width: "50%",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
