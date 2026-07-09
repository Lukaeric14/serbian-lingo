/// <reference types="jest" />
import React from "react";
import { render, fireEvent, cleanup, act } from "@testing-library/react-native";
import MatchPairs from "./MatchPairs";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";

jest.mock("@/audio/player", () => ({
  play: jest.fn(),
}));

const { play } = jest.requireMock("@/audio/player") as { play: jest.Mock };

afterEach(async () => {
  await cleanup();
});

const challenge: Extract<Challenge, { type: "match_pairs" }> = {
  type: "match_pairs",
  payload: {
    pairs: [
      { sr: "zdravo", en: "hello" },
      { sr: "hvala", en: "thank you" },
      { sr: "da", en: "yes" },
      { sr: "ne", en: "no" },
      { sr: "voda", en: "water" },
    ],
  },
};

type RenderResult = Awaited<ReturnType<typeof render>>;

/** fireEvent.press wrapped in act() so each press's state updates are fully
 * flushed/committed before the next press fires — required because MatchPairs
 * resolves a match on the second press of a pair, and firing both presses
 * back-to-back without flushing in between can race React's update batching. */
async function press(view: RenderResult, testID: string): Promise<void> {
  await act(async () => {
    fireEvent.press(view.getByTestId(testID));
  });
}

/** Taps the left tile for `sr` and the right tile for `en`, in that order. */
async function matchPair(view: RenderResult, sr: string, en: string): Promise<void> {
  await press(view, `match-pairs-left-tile-${sr}`);
  await press(view, `match-pairs-right-tile-${en}`);
}

describe("MatchPairs", () => {
  beforeEach(() => {
    play.mockClear();
  });

  it("renders all 5 SR tiles and all 5 EN tiles", async () => {
    const view = await render(<MatchPairs challenge={challenge} onSubmit={() => {}} />);

    for (const pair of challenge.payload.pairs) {
      expect(view.getByTestId(`match-pairs-left-tile-${pair.sr}`)).toBeTruthy();
      expect(view.getByTestId(`match-pairs-right-tile-${pair.en}`)).toBeTruthy();
    }
  });

  it("tapping a left tile plays its Serbian audio", async () => {
    const view = await render(<MatchPairs challenge={challenge} onSubmit={() => {}} />);

    await press(view, "match-pairs-left-tile-zdravo");

    expect(play).toHaveBeenCalledWith("zdravo");
  });

  it("calls onSubmit with all matched pairs once every pair has been matched correctly", async () => {
    const onSubmit = jest.fn();
    const view = await render(<MatchPairs challenge={challenge} onSubmit={onSubmit} />);

    for (const pair of challenge.payload.pairs) {
      await matchPair(view, pair.sr, pair.en);
    }

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const answer = onSubmit.mock.calls[0][0] as Extract<
      ChallengeAnswer,
      { type: "match_pairs" }
    >;
    expect(answer.type).toBe("match_pairs");
    expect(answer.matchedPairs).toHaveLength(5);
    for (const pair of challenge.payload.pairs) {
      expect(answer.matchedPairs).toContainEqual(pair);
    }
  });

  it("does not call onSubmit before all pairs are matched", async () => {
    const onSubmit = jest.fn();
    const view = await render(<MatchPairs challenge={challenge} onSubmit={onSubmit} />);

    await matchPair(view, "zdravo", "hello");
    await matchPair(view, "hvala", "thank you");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("a wrong match does not call onSubmit and tiles remain available to retry", async () => {
    const onSubmit = jest.fn();
    const view = await render(<MatchPairs challenge={challenge} onSubmit={onSubmit} />);

    // Mismatch: "zdravo" (hello) tapped with "no" -> wrong pair.
    await press(view, "match-pairs-left-tile-zdravo");
    await press(view, "match-pairs-right-tile-no");

    expect(onSubmit).not.toHaveBeenCalled();

    // Let the wrong-flash timeout resolve back to default.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    // Now match all 5 correctly and confirm submission still works after a miss.
    for (const pair of challenge.payload.pairs) {
      await matchPair(view, pair.sr, pair.en);
    }

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(
      (onSubmit.mock.calls[0][0] as Extract<ChallengeAnswer, { type: "match_pairs" }>)
        .matchedPairs,
    ).toHaveLength(5);
  });
});
