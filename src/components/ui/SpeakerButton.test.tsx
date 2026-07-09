import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { SpeakerButton } from "./SpeakerButton";

describe("SpeakerButton", () => {
  it("renders the large size", async () => {
    await expect(
      render(<SpeakerButton size="large" onPress={() => {}} />)
    ).resolves.toBeDefined();
  });

  it("renders the small size", async () => {
    await expect(
      render(<SpeakerButton size="small" onPress={() => {}} />)
    ).resolves.toBeDefined();
  });

  it("renders large with isPlaying=true (active pulse state)", async () => {
    await expect(
      render(<SpeakerButton size="large" onPress={() => {}} isPlaying />)
    ).resolves.toBeDefined();
  });

  it("renders small with isPlaying=true (active pulse state)", async () => {
    await expect(
      render(<SpeakerButton size="small" onPress={() => {}} isPlaying />)
    ).resolves.toBeDefined();
  });

  it("renders large with isPlaying=false explicitly", async () => {
    await expect(
      render(
        <SpeakerButton size="large" onPress={() => {}} isPlaying={false} />
      )
    ).resolves.toBeDefined();
  });

  it("renders disabled state", async () => {
    await expect(
      render(<SpeakerButton size="large" onPress={() => {}} disabled />)
    ).resolves.toBeDefined();
  });

  it("renders disabled + isPlaying together", async () => {
    await expect(
      render(
        <SpeakerButton size="small" onPress={() => {}} disabled isPlaying />
      )
    ).resolves.toBeDefined();
  });

  it("renders with a custom accessibilityLabel", async () => {
    await expect(
      render(
        <SpeakerButton
          size="large"
          onPress={() => {}}
          accessibilityLabel="Play sentence audio"
        />
      )
    ).resolves.toBeDefined();
  });

  it("calls onPress when tapped (enabled)", async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <SpeakerButton size="large" onPress={onPress} />
    );
    await fireEvent.press(getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <SpeakerButton size="large" onPress={onPress} disabled />
    );
    await fireEvent.press(getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
