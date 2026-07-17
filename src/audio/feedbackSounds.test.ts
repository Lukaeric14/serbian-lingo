import { createAudioPlayer } from "expo-audio";
import { FeedbackSoundPlayer } from "./feedbackSounds";

// Fake player object standing in for expo-audio's native AudioPlayer.
// Mirrors just the surface FeedbackSoundPlayer touches: play/pause/seekTo.
function makeFakePlayer() {
  return {
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(async () => {}),
  };
}

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(),
}));

const mockedCreateAudioPlayer = createAudioPlayer as jest.Mock;

describe("FeedbackSoundPlayer", () => {
  beforeEach(() => {
    mockedCreateAudioPlayer.mockReset();
    mockedCreateAudioPlayer.mockImplementation(() => makeFakePlayer());
  });

  it("playCorrect() creates the correct-chime player once and plays it", () => {
    const player = new FeedbackSoundPlayer();

    player.playCorrect();
    player.playCorrect();

    // Lazily created once, then reused — not a new player per call.
    expect(mockedCreateAudioPlayer).toHaveBeenCalledTimes(1);
    const fakePlayer = mockedCreateAudioPlayer.mock.results[0].value;
    expect(fakePlayer.play).toHaveBeenCalledTimes(2);
    expect(fakePlayer.seekTo).toHaveBeenCalledWith(0);
  });

  it("playIncorrect() creates the incorrect-buzz player once and plays it", () => {
    const player = new FeedbackSoundPlayer();

    player.playIncorrect();
    player.playIncorrect();
    player.playIncorrect();

    expect(mockedCreateAudioPlayer).toHaveBeenCalledTimes(1);
    const fakePlayer = mockedCreateAudioPlayer.mock.results[0].value;
    expect(fakePlayer.play).toHaveBeenCalledTimes(3);
  });

  it("correct and incorrect sounds use independent players", () => {
    const player = new FeedbackSoundPlayer();

    player.playCorrect();
    player.playIncorrect();

    expect(mockedCreateAudioPlayer).toHaveBeenCalledTimes(2);
  });

  it("rapid repeated calls restart rather than stack (pause + seekTo(0) before each play)", () => {
    const player = new FeedbackSoundPlayer();

    player.playCorrect();
    player.playCorrect();

    const fakePlayer = mockedCreateAudioPlayer.mock.results[0].value;
    expect(fakePlayer.pause).toHaveBeenCalledTimes(2);
    expect(fakePlayer.seekTo).toHaveBeenCalledTimes(2);
    expect(fakePlayer.play).toHaveBeenCalledTimes(2);
  });

  // --- Stale native player recovery (real-world: "Server was dead when
  // activation request was made" — a native AudioPlayer going invalid across
  // a JS reload or the app being backgrounded long enough for iOS to tear
  // down the audio session) ---

  it("playCorrect() recreates and retries once if the cached player has gone stale", () => {
    const player = new FeedbackSoundPlayer();

    player.playCorrect();
    const stalePlayer = mockedCreateAudioPlayer.mock.results[0].value;
    stalePlayer.play.mockImplementationOnce(() => {
      throw new Error("Server was dead when activation request was made");
    });

    expect(() => player.playCorrect()).not.toThrow();

    expect(mockedCreateAudioPlayer).toHaveBeenCalledTimes(2);
    const freshPlayer = mockedCreateAudioPlayer.mock.results[1].value;
    expect(freshPlayer.play).toHaveBeenCalledTimes(1);

    // The recreated player is what's cached now.
    player.playCorrect();
    expect(mockedCreateAudioPlayer).toHaveBeenCalledTimes(2);
    expect(freshPlayer.play).toHaveBeenCalledTimes(2);
  });

  it("playIncorrect() recreates and retries once if the cached player has gone stale", () => {
    const player = new FeedbackSoundPlayer();

    player.playIncorrect();
    const stalePlayer = mockedCreateAudioPlayer.mock.results[0].value;
    stalePlayer.seekTo.mockImplementationOnce(() => {
      throw new Error("Server was dead when activation request was made");
    });

    expect(() => player.playIncorrect()).not.toThrow();

    expect(mockedCreateAudioPlayer).toHaveBeenCalledTimes(2);
    const freshPlayer = mockedCreateAudioPlayer.mock.results[1].value;
    expect(freshPlayer.play).toHaveBeenCalledTimes(1);
  });
});
