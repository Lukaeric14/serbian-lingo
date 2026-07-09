// MatchPairs — match_pairs challenge renderer (docs/challenge-schema.md).
//
// Two columns of OptionCard: left = shuffled SR words (tap-to-hear), right = shuffled
// EN words. Tapping one tile per column attempts a match; a correct pair locks both
// tiles green, a wrong pair flashes red then resets. Once all 5 pairs are matched,
// onSubmit fires automatically — this component only collects input, it never grades
// or shows feedback (that lives in the future Lesson host screen).

import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ChallengeHeader, OptionCard, type OptionCardState } from "@/components/ui";
import { layout, spacing } from "@/design/tokens";
import { play } from "@/audio/player";
import { shuffle } from "@/lib/shuffle";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

export type MatchPairsChallenge = Extract<Challenge, { type: "match_pairs" }>;
export type MatchPairsAnswer = Extract<ChallengeAnswer, { type: "match_pairs" }>;

export interface MatchPairsProps {
  challenge: MatchPairsChallenge;
  onSubmit: (answer: MatchPairsAnswer) => void;
}

// How long a wrong pair stays flashed red before resetting to default.
const WRONG_FLASH_MS = 500;

interface Tile {
  /** Index into challenge.payload.pairs — identifies which pair this tile belongs to. */
  pairIndex: number;
  label: string;
}

export default function MatchPairs({ challenge, onSubmit }: MatchPairsProps) {
  const { pairs } = challenge.payload;

  const leftTiles = useMemo<Tile[]>(
    () => shuffle(pairs.map((pair, pairIndex) => ({ pairIndex, label: pair.sr }))),
    [pairs],
  );
  const rightTiles = useMemo<Tile[]>(
    () => shuffle(pairs.map((pair, pairIndex) => ({ pairIndex, label: pair.en }))),
    [pairs],
  );

  // pairIndex of the currently-selected tile in each column, if any.
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  // pairIndexes that have been locked in as correctly matched.
  const [matched, setMatched] = useState<Set<number>>(new Set());
  // pairIndexes currently flashing wrong (both the left and right tile of a bad guess).
  const [wrongLeft, setWrongLeft] = useState<number | null>(null);
  const [wrongRight, setWrongRight] = useState<number | null>(null);
  // Ignore taps while a wrong-match flash is resolving.
  const [isResolving, setIsResolving] = useState(false);
  const hasSubmittedRef = useRef(false);

  // Mirrors selectedLeft/selectedRight/matched/isResolving for synchronous reads inside
  // press handlers. Two presses (one per column) can land before React flushes the state
  // update from the first, so reading React state directly here would risk resolving an
  // attempt against a stale "no selection yet" snapshot — the refs are always current.
  const selectedLeftRef = useRef<number | null>(null);
  const selectedRightRef = useRef<number | null>(null);
  const matchedRef = useRef<Set<number>>(new Set());
  const isResolvingRef = useRef(false);

  function stateFor(pairIndex: number, side: "left" | "right"): OptionCardState {
    if (matched.has(pairIndex)) return "correct";
    if (side === "left" && wrongLeft === pairIndex) return "wrong";
    if (side === "right" && wrongRight === pairIndex) return "wrong";
    if (side === "left" && selectedLeft === pairIndex) return "selected";
    if (side === "right" && selectedRight === pairIndex) return "selected";
    return "default";
  }

  function handleLeftPress(pairIndex: number) {
    if (isResolvingRef.current || matchedRef.current.has(pairIndex)) return;
    play(pairs[pairIndex].sr);
    selectedLeftRef.current = pairIndex;
    setSelectedLeft(pairIndex);
    if (selectedRightRef.current !== null) {
      resolveAttempt(pairIndex, selectedRightRef.current);
    }
  }

  function handleRightPress(pairIndex: number) {
    if (isResolvingRef.current || matchedRef.current.has(pairIndex)) return;
    selectedRightRef.current = pairIndex;
    setSelectedRight(pairIndex);
    if (selectedLeftRef.current !== null) {
      resolveAttempt(selectedLeftRef.current, pairIndex);
    }
  }

  function resolveAttempt(leftPairIndex: number, rightPairIndex: number) {
    if (leftPairIndex === rightPairIndex) {
      // Correct match — lock both tiles.
      const nextMatched = new Set(matchedRef.current);
      nextMatched.add(leftPairIndex);
      matchedRef.current = nextMatched;
      setMatched(nextMatched);
      selectedLeftRef.current = null;
      selectedRightRef.current = null;
      setSelectedLeft(null);
      setSelectedRight(null);

      if (nextMatched.size === pairs.length && !hasSubmittedRef.current) {
        hasSubmittedRef.current = true;
        onSubmit({ type: "match_pairs", matchedPairs: pairs });
      }
      return;
    }

    // Wrong match — flash both tiles red briefly, then reset to default.
    isResolvingRef.current = true;
    setIsResolving(true);
    setWrongLeft(leftPairIndex);
    setWrongRight(rightPairIndex);
    setTimeout(() => {
      setWrongLeft(null);
      setWrongRight(null);
      selectedLeftRef.current = null;
      selectedRightRef.current = null;
      setSelectedLeft(null);
      setSelectedRight(null);
      isResolvingRef.current = false;
      setIsResolving(false);
    }, WRONG_FLASH_MS);
  }

  return (
    <View style={styles.container} testID="match-pairs">
      <ChallengeHeader title="Tap the matching pairs" />

      <View style={styles.row}>
        <View style={styles.column}>
          {leftTiles.map((tile) => (
            <OptionCard
              key={`left-${tile.pairIndex}`}
              testID={`match-pairs-left-tile-${tile.label}`}
              label={tile.label}
              state={stateFor(tile.pairIndex, "left")}
              disabled={matched.has(tile.pairIndex)}
              onPress={() => handleLeftPress(tile.pairIndex)}
              onAudioTap={() => play(pairs[tile.pairIndex].sr)}
              style={styles.tile}
            />
          ))}
        </View>
        <View style={styles.column}>
          {rightTiles.map((tile) => (
            <OptionCard
              key={`right-${tile.pairIndex}`}
              testID={`match-pairs-right-tile-${tile.label}`}
              label={tile.label}
              state={stateFor(tile.pairIndex, "right")}
              disabled={matched.has(tile.pairIndex)}
              onPress={() => handleRightPress(tile.pairIndex)}
              style={styles.tile}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
    paddingHorizontal: layout.screenPaddingH,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  column: {
    flex: 1,
    gap: spacing.sm,
  },
  tile: {
    marginBottom: spacing.sm,
  },
});
