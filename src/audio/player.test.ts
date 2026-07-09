import { createAudioPlayer } from "expo-audio";
import { AudioClipPlayer } from "./player";

// Fake player object standing in for expo-audio's native AudioPlayer.
// Mirrors just the surface AudioClipPlayer touches: play/pause/seekTo/replace/remove.
function makeFakePlayer(initialUri: string) {
  return {
    uri: initialUri,
    playing: false,
    play: jest.fn(function (this: any) {
      this.playing = true;
    }),
    pause: jest.fn(function (this: any) {
      this.playing = false;
    }),
    seekTo: jest.fn(async () => {}),
    replace: jest.fn(function (this: any, source: { uri: string }) {
      this.uri = source.uri;
    }),
    remove: jest.fn(),
  };
}

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(),
}));

const mockedCreateAudioPlayer = createAudioPlayer as jest.Mock;

describe("AudioClipPlayer", () => {
  beforeEach(() => {
    mockedCreateAudioPlayer.mockReset();
    // Each call to createAudioPlayer returns a fresh fake player tied to the source uri.
    mockedCreateAudioPlayer.mockImplementation((source: { uri: string }) =>
      makeFakePlayer(source.uri),
    );
  });

  it("preload registers all clips as players, one per text", () => {
    const player = new AudioClipPlayer();

    player.preload([
      { text: "zdravo", uri: "file://zdravo.mp3" },
      { text: "hvala", uri: "file://hvala.mp3" },
    ]);

    expect(mockedCreateAudioPlayer).toHaveBeenCalledTimes(2);
    expect(mockedCreateAudioPlayer).toHaveBeenCalledWith({ uri: "file://zdravo.mp3" });
    expect(mockedCreateAudioPlayer).toHaveBeenCalledWith({ uri: "file://hvala.mp3" });
    expect(player.isPreloaded("zdravo")).toBe(true);
    expect(player.isPreloaded("hvala")).toBe(true);
    expect(player.isPreloaded("nonexistent")).toBe(false);
  });

  it("preloading the same text twice replaces the source instead of creating a duplicate player", () => {
    const player = new AudioClipPlayer();

    player.preload([{ text: "zdravo", uri: "file://zdravo-v1.mp3" }]);
    expect(mockedCreateAudioPlayer).toHaveBeenCalledTimes(1);

    player.preload([{ text: "zdravo", uri: "file://zdravo-v2.mp3" }]);

    // Still only one underlying player created for "zdravo".
    expect(mockedCreateAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it("play() triggers playback for the right clip", () => {
    const player = new AudioClipPlayer();
    player.preload([
      { text: "zdravo", uri: "file://zdravo.mp3" },
      { text: "hvala", uri: "file://hvala.mp3" },
    ]);

    const zdravoPlayer = mockedCreateAudioPlayer.mock.results[0].value;
    const hvalaPlayer = mockedCreateAudioPlayer.mock.results[1].value;

    player.play("hvala");

    expect(hvalaPlayer.play).toHaveBeenCalledTimes(1);
    expect(zdravoPlayer.play).not.toHaveBeenCalled();
  });

  it("play() on an unregistered text is a silent no-op, not a throw", () => {
    const player = new AudioClipPlayer();
    player.preload([{ text: "zdravo", uri: "file://zdravo.mp3" }]);

    expect(() => player.play("never-preloaded")).not.toThrow();
  });

  it("rapid repeated play() calls on the same text restart rather than stack", () => {
    const player = new AudioClipPlayer();
    player.preload([{ text: "zdravo", uri: "file://zdravo.mp3" }]);
    const fakePlayer = mockedCreateAudioPlayer.mock.results[0].value;

    player.play("zdravo");
    player.play("zdravo");
    player.play("zdravo");

    // Each tap seeks back to 0 and (re)plays — never throws, never lets
    // multiple independent play calls run concurrently on one instance.
    expect(fakePlayer.seekTo).toHaveBeenCalledTimes(3);
    expect(fakePlayer.seekTo).toHaveBeenCalledWith(0);
    expect(fakePlayer.play).toHaveBeenCalledTimes(3);
    // pause() is called before each restart to cut off any in-flight playback.
    expect(fakePlayer.pause.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("playing a new clip stops the previously playing clip instead of overlapping", () => {
    const player = new AudioClipPlayer();
    player.preload([
      { text: "zdravo", uri: "file://zdravo.mp3" },
      { text: "hvala", uri: "file://hvala.mp3" },
    ]);
    const zdravoPlayer = mockedCreateAudioPlayer.mock.results[0].value;
    const hvalaPlayer = mockedCreateAudioPlayer.mock.results[1].value;

    player.play("zdravo");
    expect(zdravoPlayer.play).toHaveBeenCalledTimes(1);

    player.play("hvala");

    // The previously-playing clip gets paused before the new one starts.
    expect(zdravoPlayer.pause).toHaveBeenCalled();
    expect(hvalaPlayer.play).toHaveBeenCalledTimes(1);
  });

  it("stop() pauses the currently playing clip and clears playing state", () => {
    const player = new AudioClipPlayer();
    player.preload([{ text: "zdravo", uri: "file://zdravo.mp3" }]);
    const fakePlayer = mockedCreateAudioPlayer.mock.results[0].value;

    player.play("zdravo");
    player.stop();

    expect(fakePlayer.pause).toHaveBeenCalled();

    // A subsequent stop() with nothing playing must not throw.
    expect(() => player.stop()).not.toThrow();
  });

  it("clear() removes every cached player and resets state", () => {
    const player = new AudioClipPlayer();
    player.preload([
      { text: "zdravo", uri: "file://zdravo.mp3" },
      { text: "hvala", uri: "file://hvala.mp3" },
    ]);
    const zdravoPlayer = mockedCreateAudioPlayer.mock.results[0].value;
    const hvalaPlayer = mockedCreateAudioPlayer.mock.results[1].value;

    player.clear();

    expect(zdravoPlayer.remove).toHaveBeenCalled();
    expect(hvalaPlayer.remove).toHaveBeenCalled();
    expect(player.isPreloaded("zdravo")).toBe(false);
  });
});
