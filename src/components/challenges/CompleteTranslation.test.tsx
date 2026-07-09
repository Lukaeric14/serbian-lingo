/// <reference types="jest" />
import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import CompleteTranslation from "@/components/challenges/CompleteTranslation";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

jest.mock("@/audio/player", () => ({
  play: jest.fn(),
}));

const { play } = jest.requireMock("@/audio/player") as { play: jest.Mock };

const fakeChallenge: Extract<Challenge, { type: "complete_translation" }> = {
  type: "complete_translation",
  payload: {
    sourceText: "Ja imam mačku.",
    targetTemplate: "I ___ a cat.",
    correctAnswer: "have",
    options: ["have", "has", "having"],
  },
};

describe("CompleteTranslation", () => {
  beforeEach(() => {
    play.mockClear();
  });

  it("renders the Serbian sourceText and the English template with a blank placeholder", async () => {
    const { getByText } = await render(
      <CompleteTranslation challenge={fakeChallenge} onSubmit={() => {}} />
    );
    expect(getByText("Ja imam mačku.")).toBeTruthy();
    expect(getByText(/I\s*___\s*a cat\./)).toBeTruthy();
  });

  it("renders every option as a tappable tile", async () => {
    const { getByText } = await render(
      <CompleteTranslation challenge={fakeChallenge} onSubmit={() => {}} />
    );
    for (const option of fakeChallenge.payload.options) {
      expect(getByText(option)).toBeTruthy();
    }
  });

  it("autoplays the sourceText audio on mount", async () => {
    await render(<CompleteTranslation challenge={fakeChallenge} onSubmit={() => {}} />);
    expect(play).toHaveBeenCalledWith("Ja imam mačku.");
  });

  it("replays the sourceText audio when the speech bubble audio button is tapped", async () => {
    const { getByTestId } = await render(
      <CompleteTranslation challenge={fakeChallenge} onSubmit={() => {}} />
    );
    play.mockClear();
    fireEvent.press(getByTestId("speech-bubble-audio-button"));
    expect(play).toHaveBeenCalledWith("Ja imam mačku.");
  });

  it("fills the blank slot with the tapped option's text", async () => {
    const { getByText, queryByText } = await render(
      <CompleteTranslation challenge={fakeChallenge} onSubmit={() => {}} />
    );
    await act(async () => {
      fireEvent.press(getByText("has"));
    });
    expect(queryByText(/I\s*has\s*a cat\./)).toBeTruthy();
    expect(queryByText(/I\s*___\s*a cat\./)).toBeNull();
  });

  it("calls onSubmit with the correctly-shaped complete_translation answer when Check is tapped", async () => {
    const onSubmit = jest.fn<void, [Extract<ChallengeAnswer, { type: "complete_translation" }>]>();
    const { getByText } = await render(
      <CompleteTranslation challenge={fakeChallenge} onSubmit={onSubmit} />
    );

    await act(async () => {
      fireEvent.press(getByText("have"));
    });
    await act(async () => {
      fireEvent.press(getByText("CHECK"));
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      type: "complete_translation",
      selected: "have",
    });
  });

  it("does not call onSubmit when Check is tapped before any option is selected", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <CompleteTranslation challenge={fakeChallenge} onSubmit={onSubmit} />
    );

    await act(async () => {
      fireEvent.press(getByText("CHECK"));
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not render a FeedbackSheet or grade the answer itself", async () => {
    const onSubmit = jest.fn();
    const { queryByText, getByText } = await render(
      <CompleteTranslation challenge={fakeChallenge} onSubmit={onSubmit} />
    );
    await act(async () => {
      fireEvent.press(getByText("has"));
    });
    await act(async () => {
      fireEvent.press(getByText("CHECK"));
    });
    // Wrong-ish option ("has") is still just passed through untouched — no grading text appears.
    expect(queryByText(/correct/i)).toBeNull();
    expect(queryByText(/incorrect/i)).toBeNull();
    expect(onSubmit).toHaveBeenCalledWith({
      type: "complete_translation",
      selected: "has",
    });
  });
});
