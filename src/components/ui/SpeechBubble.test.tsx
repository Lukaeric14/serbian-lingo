/// <reference types="jest" />
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { SpeechBubble } from "@/components/ui/SpeechBubble";

describe("SpeechBubble", () => {
  it("renders with text only (no avatar, no audio button)", async () => {
    const { getByText, queryByTestId } = await render(
      <SpeechBubble text="Dobar dan!" />
    );
    expect(getByText("Dobar dan!")).toBeTruthy();
    expect(queryByTestId("speech-bubble-avatar")).toBeNull();
    expect(queryByTestId("speech-bubble-audio-button")).toBeNull();
  });

  it("renders with an avatar when avatarInitials is provided", async () => {
    const { getByText, getByTestId } = await render(
      <SpeechBubble text="Kako si?" avatarInitials="SM" />
    );
    expect(getByText("Kako si?")).toBeTruthy();
    expect(getByTestId("speech-bubble-avatar")).toBeTruthy();
    expect(getByText("SM")).toBeTruthy();
  });

  it("renders the audio tap target when onAudioTap is provided", async () => {
    const onAudioTap = jest.fn();
    const { getByTestId } = await render(
      <SpeechBubble text="Hvala" onAudioTap={onAudioTap} />
    );
    expect(getByTestId("speech-bubble-audio-button")).toBeTruthy();
  });

  it("calls onAudioTap when the audio button is pressed", async () => {
    const onAudioTap = jest.fn();
    const { getByTestId } = await render(
      <SpeechBubble text="Hvala" onAudioTap={onAudioTap} />
    );
    fireEvent.press(getByTestId("speech-bubble-audio-button"));
    expect(onAudioTap).toHaveBeenCalledTimes(1);
  });

  it("renders with both avatar and audio button together", async () => {
    const onAudioTap = jest.fn();
    const { getByText, getByTestId } = await render(
      <SpeechBubble
        text="Prijatno!"
        avatarInitials="AN"
        onAudioTap={onAudioTap}
      />
    );
    expect(getByText("Prijatno!")).toBeTruthy();
    expect(getByTestId("speech-bubble-avatar")).toBeTruthy();
    expect(getByTestId("speech-bubble-audio-button")).toBeTruthy();
  });

  it("renders with a custom style override applied", async () => {
    const { getByText } = await render(
      <SpeechBubble text="Doviđenja" style={{ marginTop: 10 }} />
    );
    expect(getByText("Doviđenja")).toBeTruthy();
  });

  it("does not throw with a long sentence wrapping across lines", async () => {
    const longText =
      "Ovo je veoma duga rečenica koja bi trebalo da se prelomi u više redova unutar oblačića za govor.";
    const { getByText } = await render(
      <SpeechBubble text={longText} avatarInitials="LX" onAudioTap={() => {}} />
    );
    expect(getByText(longText)).toBeTruthy();
  });
});
