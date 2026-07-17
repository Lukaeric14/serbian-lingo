import { createAudioPlayer } from "expo-audio";
import { reviveAudioSession } from "./audioSession";
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

jest.mock("./audioSession", () => ({
  reviveAudioSession: jest.fn(async () => {}),
}));

const mockedCreateAudioPlayer = createAudioPlayer as jest.Mock;
const mockedReviveAudioSession = reviveAudioSession as jest.Mock;

/** Lets the async recovery path (chime failure -> revive -> recreate -> replay) settle. */
async function flushRecovery() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("FeedbackSoundPlayer", () => {
  beforeEach(() => {
    mockedCreateAudioPlayer.mockReset();
    mockedReviveAudioSession.mockClear();
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

  // --- Stale native player/session recovery (the very first on-device crash
  // was playCorrect throwing "Server was dead when activation request was
  // made" straight into handleSubmit) ---

  it("a stale chime player revives the session, recreates, and retries — without throwing", async () => {
    const player = new FeedbackSoundPlayer();

    player.playCorrect();
    const stalePlayer = mockedCreateAudioPlayer.mock.results[0].value;
    stalePlayer.play.mockImplementationOnce(() => {
      throw new Error("Server was dead when activation request was made");
    });

    expect(() => player.playCorrect()).not.toThrow();
    await flushRecovery();

    expect(mockedReviveAudioSession).toHaveBeenCalled();
    expect(mockedCreateAudioPlayer).toHaveBeenCalledTimes(2);
    const freshPlayer = mockedCreateAudioPlayer.mock.results[1].value;
    expect(freshPlayer.play).toHaveBeenCalledTimes(1);

    // The recreated player is cached for subsequent chimes.
    player.playCorrect();
    expect(mockedCreateAudioPlayer).toHaveBeenCalledTimes(2);
    expect(freshPlayer.play).toHaveBeenCalledTimes(2);
  });

  it("stays silent (no throw) when even the recovery attempt fails", async () => {
    const player = new FeedbackSoundPlayer();

    player.playIncorrect();
    const stalePlayer = mockedCreateAudioPlayer.mock.results[0].value;
    stalePlayer.play.mockImplementation(() => {
      throw new Error("Session lookup failed");
    });
    mockedCreateAudioPlayer.mockImplementation(() => {
      const p = makeFakePlayer();
      p.play.mockImplementation(() => {
        throw new Error("Session lookup failed");
      });
      return p;
    });

    expect(() => player.playIncorrect()).not.toThrow();
    await expect(flushRecovery()).resolves.not.toThrow();
  });
});
