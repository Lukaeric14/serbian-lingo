/// <reference types="jest" />
import React from "react";
import { render } from "@testing-library/react-native";
import { OptionCard } from "./OptionCard";

describe("OptionCard", () => {
  it("renders the default state", () => {
    expect(() =>
      render(<OptionCard label="Zdravo" state="default" onPress={() => {}} />)
    ).not.toThrow();
  });

  it("renders the selected state", () => {
    expect(() =>
      render(<OptionCard label="Zdravo" state="selected" onPress={() => {}} />)
    ).not.toThrow();
  });

  it("renders the correct state (green + sparkle flash)", () => {
    expect(() =>
      render(<OptionCard label="Zdravo" state="correct" onPress={() => {}} />)
    ).not.toThrow();
  });

  it("renders the wrong state (red shake)", () => {
    expect(() =>
      render(<OptionCard label="Zdravo" state="wrong" onPress={() => {}} />)
    ).not.toThrow();
  });

  it("renders with an onAudioTap handler (audio button variant)", () => {
    expect(() =>
      render(
        <OptionCard
          label="Hvala"
          state="default"
          onPress={() => {}}
          onAudioTap={() => {}}
        />
      )
    ).not.toThrow();
  });

  it("renders disabled without a state-implied press handler", () => {
    expect(() =>
      render(<OptionCard label="Doviđenja" state="default" disabled />)
    ).not.toThrow();
  });

  it("renders with no optional props at all", () => {
    expect(() => render(<OptionCard label="Da" />)).not.toThrow();
  });
});
