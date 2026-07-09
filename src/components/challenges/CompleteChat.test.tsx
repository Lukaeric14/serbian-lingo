/// <reference types="jest" />
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import CompleteChat from "@/components/challenges/CompleteChat";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

// CompleteChat calls the real src/audio/player.ts play() for every audio tap.
// That module imports expo-audio, whose native module isn't available under
// jest — mock it the same way src/audio/player.test.ts does so play() is a
// harmless no-op here (no clips are preloaded in this test anyway).
jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(async () => {}),
    replace: jest.fn(),
    remove: jest.fn(),
  })),
}));

const challenge: Extract<Challenge, { type: "complete_chat" }> = {
  type: "complete_chat",
  payload: {
    dialogue: [
      { speaker: "Marko", text: "Kako si danas?" },
      { speaker: "Ana", text: "Dobro sam, hvala. A ti?" },
    ],
    promptQuestion: "How does Ana say she's doing?",
    options: ["She is fine", "She is tired", "She is late"],
    correctAnswer: "She is fine",
  },
};

describe("CompleteChat", () => {
  it("renders both dialogue bubbles with correct avatar initials", async () => {
    const { getByText, getAllByTestId } = await render(
      <CompleteChat challenge={challenge} onSubmit={() => {}} />
    );
    expect(getByText("Kako si danas?")).toBeTruthy();
    expect(getByText("Dobro sam, hvala. A ti?")).toBeTruthy();
    expect(getByText("MA")).toBeTruthy();
    expect(getByText("AN")).toBeTruthy();
    expect(getAllByTestId("speech-bubble-audio-button")).toHaveLength(2);
  });

  it("renders the prompt question and all options", async () => {
    const { getByText } = await render(
      <CompleteChat challenge={challenge} onSubmit={() => {}} />
    );
    expect(getByText("How does Ana say she's doing?")).toBeTruthy();
    for (const option of challenge.payload.options) {
      expect(getByText(option)).toBeTruthy();
    }
  });

  it("plays dialogue audio when a speech bubble's audio button is tapped", async () => {
    const { getAllByTestId } = await render(
      <CompleteChat challenge={challenge} onSubmit={() => {}} />
    );
    const audioButtons = getAllByTestId("speech-bubble-audio-button");
    // Should not throw — play() is a safe no-op without preloaded clips.
    expect(() => fireEvent.press(audioButtons[0])).not.toThrow();
  });

  it("does not call onSubmit before an option is selected", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <CompleteChat challenge={challenge} onSubmit={onSubmit} />
    );
    await fireEvent.press(getByText("CHECK"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("selects an option then submits with the correctly-shaped answer", async () => {
    const onSubmit = jest.fn<void, [Extract<ChallengeAnswer, { type: "complete_chat" }>]>();
    const { getByText } = await render(
      <CompleteChat challenge={challenge} onSubmit={onSubmit} />
    );

    await fireEvent.press(getByText("She is fine"));
    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      type: "complete_chat",
      selected: "She is fine",
    });
  });

  it("submits whichever option was selected last when the learner changes their mind", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <CompleteChat challenge={challenge} onSubmit={onSubmit} />
    );

    await fireEvent.press(getByText("She is tired"));
    await fireEvent.press(getByText("She is late"));
    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledWith({
      type: "complete_chat",
      selected: "She is late",
    });
  });
});
