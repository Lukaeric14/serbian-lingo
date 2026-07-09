/// <reference types="jest" />
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import FillBlank, { type FillBlankChallenge } from "./FillBlank";
import { play } from "@/audio/player";

jest.mock("@/audio/player", () => ({
  play: jest.fn(),
}));

const challenge: FillBlankChallenge = {
  type: "fill_blank",
  payload: {
    sentenceBefore: "Ja ",
    sentenceAfter: " kafu.",
    fullSentenceAudioText: "Ja pijem kafu.",
    correctAnswer: "pijem",
    options: ["pijem", "jedem", "spavam"],
  },
};

describe("FillBlank", () => {
  it("renders without throwing", async () => {
    await expect(
      render(<FillBlank challenge={challenge} onSubmit={() => {}} />)
    ).resolves.toBeTruthy();
  });

  it("renders the sentence halves and options", async () => {
    const { getByText } = await render(
      <FillBlank challenge={challenge} onSubmit={() => {}} />
    );
    expect(getByText(/Ja/)).toBeTruthy();
    expect(getByText("pijem")).toBeTruthy();
    expect(getByText("jedem")).toBeTruthy();
    expect(getByText("spavam")).toBeTruthy();
  });

  it("plays the full sentence audio when the speaker button is tapped", async () => {
    const { getByRole } = await render(
      <FillBlank challenge={challenge} onSubmit={() => {}} />
    );
    await fireEvent.press(getByRole("button", { name: "Play audio" }));
    expect(play).toHaveBeenCalledWith("Ja pijem kafu.");
  });

  it("disables Check until an option is selected", async () => {
    const { getByText } = await render(
      <FillBlank challenge={challenge} onSubmit={() => {}} />
    );
    const checkButton = getByText("CHECK");
    expect(checkButton.props.accessibilityState?.disabled).not.toBe(false);
  });

  it("selecting an option and tapping Check submits the correctly-shaped answer", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <FillBlank challenge={challenge} onSubmit={onSubmit} />
    );

    await fireEvent.press(getByText("pijem"));
    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      type: "fill_blank",
      selected: "pijem",
    });
  });

  it("submits whichever option was most recently tapped", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <FillBlank challenge={challenge} onSubmit={onSubmit} />
    );

    await fireEvent.press(getByText("jedem"));
    await fireEvent.press(getByText("pijem"));
    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledWith({
      type: "fill_blank",
      selected: "pijem",
    });
  });

  it("does not call onSubmit when Check is tapped with nothing selected", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <FillBlank challenge={challenge} onSubmit={onSubmit} />
    );

    await fireEvent.press(getByText("CHECK"));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
