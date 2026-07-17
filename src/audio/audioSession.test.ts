import { renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import { setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";
import { useAudioSession } from "./audioSession";

jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn(async () => {}),
  setIsAudioActiveAsync: jest.fn(async () => {}),
}));

const mockedSetAudioModeAsync = setAudioModeAsync as jest.Mock;
const mockedSetIsAudioActiveAsync = setIsAudioActiveAsync as jest.Mock;

describe("useAudioSession", () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeSpy: jest.Mock;

  beforeEach(() => {
    mockedSetAudioModeAsync.mockClear();
    mockedSetIsAudioActiveAsync.mockClear();
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

  it("enables silent-mode playback and activates the audio session on mount", async () => {
    await renderHook(() => useAudioSession());

    expect(mockedSetAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: true });
    expect(mockedSetIsAudioActiveAsync).toHaveBeenCalledWith(true);
  });

  it("deactivates the audio session when the app backgrounds, reactivates when it foregrounds", async () => {
    await renderHook(() => useAudioSession());
    mockedSetIsAudioActiveAsync.mockClear();

    const listener = addEventListenerSpy.mock.calls[0][1] as (state: string) => void;

    listener("background");
    expect(mockedSetIsAudioActiveAsync).toHaveBeenCalledWith(false);

    listener("active");
    expect(mockedSetIsAudioActiveAsync).toHaveBeenCalledWith(true);
  });

  it("removes the AppState subscription on unmount", async () => {
    const { unmount } = await renderHook(() => useAudioSession());
    await unmount();

    expect(removeSpy).toHaveBeenCalled();
  });
});
