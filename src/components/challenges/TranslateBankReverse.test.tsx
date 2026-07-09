/// <reference types="jest" />

import { act, fireEvent, render } from "@testing-library/react-native";

import type { Challenge } from "@/engine/grading";
import TranslateBankReverse from "@/components/challenges/TranslateBankReverse";

jest.mock("@/audio/player", () => ({
  play: jest.fn(),
}));

import { play } from "@/audio/player";

type TranslateBankReverseChallenge = Extract<Challenge, { type: "translate_bank_reverse" }>;

const FAKE_CHALLENGE: TranslateBankReverseChallenge = {
  type: "translate_bank_reverse",
  payload: {
    promptText: "I drink coffee",
    correctAnswer: "Ja pijem kafu",
    wordBank: ["Ja", "pijem", "kafu", "on", "vodu"],
  },
};

// Tile/Button press handlers kick off Animated.parallel(...).start() alongside the
// onPress callback, so presses must be flushed inside act() for the resulting state
// update to be reflected before the next query runs.
async function press(element: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    fireEvent.press(element);
  });
}

describe("TranslateBankReverse", () => {
  it("renders the EN prompt and the hard-exercise pill", async () => {
    const { getByText } = await render(
      <TranslateBankReverse challenge={FAKE_CHALLENGE} onSubmit={() => {}} />,
    );
    expect(getByText("I drink coffee")).toBeTruthy();
    expect(getByText("HARD EXERCISE")).toBeTruthy();
  });

  it("renders every word-bank word as a tappable tile", async () => {
    const { getByText } = await render(
      <TranslateBankReverse challenge={FAKE_CHALLENGE} onSubmit={() => {}} />,
    );
    for (const word of FAKE_CHALLENGE.payload.wordBank) {
      expect(getByText(word)).toBeTruthy();
    }
  });

  it("plays audio for a word-bank tile on tap", async () => {
    const { getByText } = await render(
      <TranslateBankReverse challenge={FAKE_CHALLENGE} onSubmit={() => {}} />,
    );
    await press(getByText("Ja"));
    expect(play).toHaveBeenCalledWith("Ja");
  });

  it("builds the answer in tap order and submits it via onSubmit", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <TranslateBankReverse challenge={FAKE_CHALLENGE} onSubmit={onSubmit} />,
    );

    await press(getByText("Ja"));
    await press(getByText("pijem"));
    await press(getByText("kafu"));

    await press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      type: "translate_bank_reverse",
      orderedWords: ["Ja", "pijem", "kafu"],
    });
  });

  it("does not allow submit before any word is selected", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <TranslateBankReverse challenge={FAKE_CHALLENGE} onSubmit={onSubmit} />,
    );

    await press(getByText("CHECK"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("removes a word from the answer when its answer-area tile is tapped again", async () => {
    const onSubmit = jest.fn();
    const { getByText, getAllByText } = await render(
      <TranslateBankReverse challenge={FAKE_CHALLENGE} onSubmit={onSubmit} />,
    );

    await press(getByText("Ja"));
    await press(getByText("pijem"));

    // "Ja" now appears twice: once selected in the answer area (rendered first), once
    // ghosted in the bank.
    const jaTiles = getAllByText("Ja");
    expect(jaTiles.length).toBe(2);

    // Tap the answer-area occurrence (the first match) to remove it.
    await press(jaTiles[0]);

    await press(getByText("CHECK"));
    expect(onSubmit).toHaveBeenCalledWith({
      type: "translate_bank_reverse",
      orderedWords: ["pijem"],
    });
  });
});
