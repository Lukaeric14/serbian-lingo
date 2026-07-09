/// <reference types="jest" />
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import ListenTap from "./ListenTap";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

jest.mock("@/audio/player", () => ({
  play: jest.fn(),
}));

const challenge: Extract<Challenge, { type: "listen_tap" }> = {
  type: "listen_tap",
  payload: {
    audioText: "zdravo",
    options: ["zdravo", "hvala", "molim", "doviđenja"],
  },
};

describe("ListenTap", () => {
  it("auto-plays the audio on mount", async () => {
    const { play } = jest.requireMock("@/audio/player") as { play: jest.Mock };
    play.mockClear();

    await render(<ListenTap challenge={challenge} onSubmit={() => {}} />);

    expect(play).toHaveBeenCalledWith("zdravo");
  });

  it("renders all options from the payload", async () => {
    const { getByText } = await render(
      <ListenTap challenge={challenge} onSubmit={() => {}} />
    );

    for (const option of challenge.payload.options) {
      expect(getByText(option)).toBeTruthy();
    }
  });

  it("selects an option and submits it via onSubmit when Check is pressed", async () => {
    const onSubmit = jest.fn<(answer: Extract<ChallengeAnswer, { type: "listen_tap" }>) => void>();
    const { getByText } = await render(
      <ListenTap challenge={challenge} onSubmit={onSubmit} />
    );

    await fireEvent.press(getByText("hvala"));
    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ type: "listen_tap", selected: "hvala" });
  });

  it("does not submit before an option is selected", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <ListenTap challenge={challenge} onSubmit={onSubmit} />
    );

    await fireEvent.press(getByText("CHECK"));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
