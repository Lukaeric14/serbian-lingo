/// <reference types="jest" />
import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import MarkMeaning from "./MarkMeaning";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

// src/audio/player.ts wraps expo-audio's native module, which isn't available
// under plain jest — mock it the same way src/audio/player.test.ts does so
// play() calls triggered by this component (autoplay + tap-to-replay) resolve
// as safe no-ops instead of throwing.
jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(async () => {}),
    replace: jest.fn(),
    remove: jest.fn(),
  })),
}));

const challenge: Extract<Challenge, { type: "mark_meaning" }> = {
  type: "mark_meaning",
  payload: {
    promptText: "Hvala",
    options: [
      { text: "Thank you", correct: true },
      { text: "Goodbye", correct: false },
      { text: "Please", correct: false },
    ],
  },
};

describe("MarkMeaning", () => {
  it("renders the prompt and all options without throwing", async () => {
    const { getByText } = await render(
      <MarkMeaning challenge={challenge} onSubmit={() => {}} />
    );
    expect(getByText("Hvala")).toBeTruthy();
    expect(getByText("Thank you")).toBeTruthy();
    expect(getByText("Goodbye")).toBeTruthy();
    expect(getByText("Please")).toBeTruthy();
  });

  it("selects one option, moves the selection when another is tapped, then submits the last-selected option's text", async () => {
    const onSubmit = jest.fn<void, [Extract<ChallengeAnswer, { type: "mark_meaning" }>]>();
    const { getByText } = await render(
      <MarkMeaning challenge={challenge} onSubmit={onSubmit} />
    );

    // Select the wrong option first...
    await act(async () => {
      fireEvent.press(getByText("Goodbye"));
    });
    // ...then move the selection to a different option.
    await act(async () => {
      fireEvent.press(getByText("Thank you"));
    });

    await act(async () => {
      fireEvent.press(getByText("CHECK"));
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      type: "mark_meaning",
      selected: "Thank you",
    });
  });

  it("does not call onSubmit if Check is pressed before any option is selected", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <MarkMeaning challenge={challenge} onSubmit={onSubmit} />
    );

    await act(async () => {
      fireEvent.press(getByText("CHECK"));
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("replays audio when the speech bubble's audio button is tapped", async () => {
    const { getByLabelText } = await render(
      <MarkMeaning challenge={challenge} onSubmit={() => {}} />
    );

    // Should not throw even though no real audio clip is preloaded (play() is a safe no-op).
    await act(async () => {
      fireEvent.press(getByLabelText("Play audio"));
    });
  });
});
