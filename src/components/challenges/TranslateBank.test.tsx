/// <reference types="jest" />
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import TranslateBank from "./TranslateBank";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

jest.mock("@/audio/player", () => ({
  play: jest.fn(),
}));

const challenge: Extract<Challenge, { type: "translate_bank" }> = {
  type: "translate_bank",
  payload: {
    promptText: "Ja sam dobro",
    correctAnswer: "I am good",
    wordBank: ["I", "am", "good", "bad", "you"],
  },
};

describe("TranslateBank", () => {
  it("autoplays the prompt audio on mount", async () => {
    const { play } = jest.requireMock("@/audio/player") as { play: jest.Mock };
    play.mockClear();
    await render(<TranslateBank challenge={challenge} onSubmit={() => {}} />);
    expect(play).toHaveBeenCalledWith("Ja sam dobro");
  });

  it("replays audio when the speech bubble audio target is tapped", async () => {
    const { play } = jest.requireMock("@/audio/player") as { play: jest.Mock };
    const { getByTestId } = await render(
      <TranslateBank challenge={challenge} onSubmit={() => {}} />,
    );
    play.mockClear();
    await fireEvent.press(getByTestId("speech-bubble-audio-button"));
    expect(play).toHaveBeenCalledWith("Ja sam dobro");
  });

  it("assembles the answer in tap order and submits it via the Check button", async () => {
    const onSubmit = jest.fn<void, [Extract<ChallengeAnswer, { type: "translate_bank" }>]>();
    const { getByText } = await render(
      <TranslateBank challenge={challenge} onSubmit={onSubmit} />,
    );

    // Tap words out of order to assemble "I am good".
    await fireEvent.press(getByText("I"));
    await fireEvent.press(getByText("am"));
    await fireEvent.press(getByText("good"));

    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      type: "translate_bank",
      orderedWords: ["I", "am", "good"],
    });
  });

  it("removes a tile from the answer area when tapped again, returning it to the bank", async () => {
    const onSubmit = jest.fn();
    const { getAllByText, getByText } = await render(
      <TranslateBank challenge={challenge} onSubmit={onSubmit} />,
    );

    await fireEvent.press(getByText("I"));
    await fireEvent.press(getByText("am"));

    // "I" now appears twice: once (ghosted) in the bank, once in the answer area.
    const iInstances = getAllByText("I");
    expect(iInstances.length).toBe(2);

    // Tap the one in the answer area (first instance) to remove it back to the bank.
    await fireEvent.press(iInstances[0]);
    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledWith({
      type: "translate_bank",
      orderedWords: ["am"],
    });
  });
});
