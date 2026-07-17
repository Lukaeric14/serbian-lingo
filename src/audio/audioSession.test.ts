import { renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import { setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";
import { reviveAudioSession, useAudioSession } from "./audioSession";

jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn(async () => {}),
  setIsAudioActiveAsync: jest.fn(async () => {}),
}));

const mockedSetAudioModeAsync = setAudioModeAsync as jest.Mock;
const mockedSetIsAudioActiveAsync = setIsAudioActiveAsync as jest.Mock;

describe("reviveAudioSession", () => {
  beforeEach(() => {
    mockedSetAudioModeAsync.mockClear();
    mockedSetIsAudioActiveAsync.mockClear();
    mockedSetAudioModeAsync.mockImplementation(async () => {});
    mockedSetIsAudioActiveAsync.mockImplementation(async () => {});
  });

  it("enables silent-mode playback and activates the session", async () => {
    await reviveAudioSession();

    expect(mockedSetAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: true });
    expect(mockedSetIsAudioActiveAsync).toHaveBeenCalledWith(true);
  });

  it("never throws, even when the native calls fail", async () => {
    mockedSetAudioModeAsync.mockRejectedValueOnce(new Error("Session lookup failed"));

    await expect(reviveAudioSession()).resolves.toBeUndefined();
  });
});

describe("useAudioSession", () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeSpy: jest.Mock;

  beforeEach(() => {
    mockedSetAudioModeAsync.mockClear();
    mockedSetIsAudioActiveAsync.mockClear();
    mockedSetAudioModeAsync.mockImplementation(async () => {});
    mockedSetIsAudioActiveAsync.mockImplementation(async () => {});
    removeSpy = jest.fn();
    // react-native's own jest mock for AppState.addEventListener is a no-op that never
    // actually invokes a listener — spy on it ourselves so we can trigger "change"
    // directly and assert the subscription is torn down on unmount.
    addEventListenerSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockReturnValue({ remove: removeSpy } as ReturnType<typeof AppState.addEventListener>);
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
  });

  it("activates the audio session on mount", async () => {
    await renderHook(() => useAudioSession());

    expect(mockedSetAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: true });
    expect(mockedSetIsAudioActiveAsync).toHaveBeenCalledWith(true);
  });

  it("re-activates on foreground and does NOT deactivate on background", async () => {
    await renderHook(() => useAudioSession());
    mockedSetIsAudioActiveAsync.mockClear();

    const listener = addEventListenerSpy.mock.calls[0][1] as (state: string) => void;

    // Backgrounding must not touch the session (iOS reclaims audio itself;
    // an explicit deactivation was one of the ways the session got wedged
    // on a real device).
    listener("background");
    await Promise.resolve();
    expect(mockedSetIsAudioActiveAsync).not.toHaveBeenCalledWith(false);

    listener("active");
    // reviveAudioSession awaits setAudioModeAsync before setIsAudioActiveAsync.
    await Promise.resolve();
    await Promise.resolve();
    expect(mockedSetIsAudioActiveAsync).toHaveBeenCalledWith(true);
  });

  it("removes the AppState subscription on unmount", async () => {
    const { unmount } = await renderHook(() => useAudioSession());
    await unmount();

    expect(removeSpy).toHaveBeenCalled();
  });
});
