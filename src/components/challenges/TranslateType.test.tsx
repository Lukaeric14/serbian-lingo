/// <reference types="jest" />
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { TranslateType } from "@/components/challenges/TranslateType";
import type { Challenge } from "@/engine/grading";

jest.mock("@/audio/player", () => ({
  play: jest.fn(),
}));

import { play } from "@/audio/player";

const srToEnChallenge: Extract<Challenge, { type: "translate_type" }> = {
  type: "translate_type",
  payload: {
    promptText: "Dobar dan",
    direction: "sr_to_en",
    correctAnswers: ["good afternoon", "good day"],
  },
};

const enToSrChallenge: Extract<Challenge, { type: "translate_type" }> = {
  type: "translate_type",
  payload: {
    promptText: "Good morning",
    direction: "en_to_sr",
    correctAnswers: ["dobro jutro"],
  },
};

describe("TranslateType", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the Serbian prompt text and autoplays audio for sr_to_en", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <TranslateType challenge={srToEnChallenge} onSubmit={onSubmit} />
    );

    expect(getByText("Dobar dan")).toBeTruthy();
    expect(play).toHaveBeenCalledWith("Dobar dan");
  });

  it("does not autoplay audio for en_to_sr prompts and hides the audio tap target", async () => {
    const onSubmit = jest.fn();
    const { getByText, queryByTestId } = await render(
      <TranslateType challenge={enToSrChallenge} onSubmit={onSubmit} />
    );

    expect(getByText("Good morning")).toBeTruthy();
    expect(play).not.toHaveBeenCalled();
    expect(queryByTestId("speech-bubble-audio-button")).toBeNull();
  });

  it("replays audio when the speech bubble audio button is tapped (sr_to_en)", async () => {
    const onSubmit = jest.fn();
    const { getByTestId } = await render(
      <TranslateType challenge={srToEnChallenge} onSubmit={onSubmit} />
    );

    (play as jest.Mock).mockClear();
    await fireEvent.press(getByTestId("speech-bubble-audio-button"));
    expect(play).toHaveBeenCalledWith("Dobar dan");
  });

  it("types an answer and submits the raw text on Check press (sr_to_en)", async () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText } = await render(
      <TranslateType challenge={srToEnChallenge} onSubmit={onSubmit} />
    );

    await fireEvent.changeText(getByTestId("translate-type-input"), "good afternoon");
    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      type: "translate_type",
      text: "good afternoon",
    });
  });

  it("types an answer and submits the raw text on Check press (en_to_sr)", async () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText } = await render(
      <TranslateType challenge={enToSrChallenge} onSubmit={onSubmit} />
    );

    await fireEvent.changeText(getByTestId("translate-type-input"), "dobro jutr");
    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      type: "translate_type",
      text: "dobro jutr",
    });
  });

  it("submits an empty string when Check is pressed with no input typed", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <TranslateType challenge={srToEnChallenge} onSubmit={onSubmit} />
    );

    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledWith({ type: "translate_type", text: "" });
  });
});
