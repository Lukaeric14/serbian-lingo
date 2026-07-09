import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { play } from "@/audio/player";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";
import ListenType from "./ListenType";

jest.mock("@/audio/player", () => ({
  play: jest.fn(),
}));

const mockedPlay = play as jest.Mock;

const fakeChallenge: Extract<Challenge, { type: "listen_type" }> = {
  type: "listen_type",
  payload: {
    audioText: "zdravo",
    correctAnswer: "zdravo",
  },
};

describe("ListenType", () => {
  beforeEach(() => {
    mockedPlay.mockReset();
  });

  it("auto-plays the audio clip on mount", async () => {
    await render(<ListenType challenge={fakeChallenge} onSubmit={() => {}} />);
    expect(mockedPlay).toHaveBeenCalledWith("zdravo");
  });

  it("replays audio when the speaker button is tapped", async () => {
    const { getByLabelText } = await render(
      <ListenType challenge={fakeChallenge} onSubmit={() => {}} />,
    );
    mockedPlay.mockClear();
    await fireEvent.press(getByLabelText("Play audio"));
    expect(mockedPlay).toHaveBeenCalledWith("zdravo");
  });

  it("calls onSubmit with the typed answer when Check is pressed", async () => {
    const onSubmit = jest.fn<(answer: Extract<ChallengeAnswer, { type: "listen_type" }>) => void>();
    const { getByLabelText, getByText } = await render(
      <ListenType challenge={fakeChallenge} onSubmit={onSubmit} />,
    );

    await fireEvent.changeText(getByLabelText("Typed answer"), "zdravo");
    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ type: "listen_type", text: "zdravo" });
  });

  it("submits whatever text was typed, even if it doesn't match (grading happens elsewhere)", async () => {
    const onSubmit = jest.fn<(answer: Extract<ChallengeAnswer, { type: "listen_type" }>) => void>();
    const { getByLabelText, getByText } = await render(
      <ListenType challenge={fakeChallenge} onSubmit={onSubmit} />,
    );

    await fireEvent.changeText(getByLabelText("Typed answer"), "zdravoo");
    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledWith({ type: "listen_type", text: "zdravoo" });
  });
});
