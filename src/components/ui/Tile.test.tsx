/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { Tile, type TileState } from "@/components/ui/Tile";

const STATES: TileState[] = ["default", "selected", "ghost", "correct", "wrong"];

describe("Tile", () => {
  it.each(STATES)("renders without throwing in %s state", async (state) => {
    await expect(
      render(<Tile label="kafa" state={state} onPress={() => {}} />)
    ).resolves.toBeTruthy();
  });

  it("renders with default state when no state prop is passed", async () => {
    await expect(render(<Tile label="kafa" />)).resolves.toBeTruthy();
  });

  it("calls onPress when tapped in the default state", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <Tile label="kafa" state="default" onPress={onPress} />
    );
    fireEvent.press(getByText("kafa"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("calls onAudioTap when provided and tile is pressed", async () => {
    const onAudioTap = jest.fn();
    const { getByText } = await render(
      <Tile label="kafa" state="default" onAudioTap={onAudioTap} />
    );
    fireEvent.press(getByText("kafa"));
    expect(onAudioTap).toHaveBeenCalledTimes(1);
  });

  it("does not throw when onAudioTap is omitted", async () => {
    const { getByText } = await render(<Tile label="kafa" state="default" />);
    expect(() => fireEvent.press(getByText("kafa"))).not.toThrow();
  });

  it("renders the ghost state as non-interactive without invoking onPress", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <Tile label="kafa" state="ghost" onPress={onPress} />
    );
    fireEvent.press(getByText("kafa"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
