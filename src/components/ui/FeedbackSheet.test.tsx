/// <reference types="jest" />
import React from "react";
import { render } from "@testing-library/react-native";
import { FeedbackSheet } from "./FeedbackSheet";

describe("FeedbackSheet", () => {
  it("renders the correct variant without throwing", () => {
    expect(() =>
      render(
        <FeedbackSheet
          variant="correct"
          heading="Nicely done!"
          onPrimaryPress={() => {}}
        />
      )
    ).not.toThrow();
  });

  it("renders the wrong variant with correct answer + meaning without throwing", () => {
    expect(() =>
      render(
        <FeedbackSheet
          variant="wrong"
          heading="Incorrect"
          correctAnswerText="Zdravo"
          meaningText="Hello"
          onPrimaryPress={() => {}}
        />
      )
    ).not.toThrow();
  });

  it("renders the wrong variant with no correctAnswerText/meaningText without throwing", () => {
    expect(() =>
      render(
        <FeedbackSheet variant="wrong" heading="Incorrect" onPrimaryPress={() => {}} />
      )
    ).not.toThrow();
  });

  it("renders the wrong variant with only correctAnswerText (no meaning) without throwing", () => {
    expect(() =>
      render(
        <FeedbackSheet
          variant="wrong"
          heading="Incorrect"
          correctAnswerText="Zdravo"
          onPrimaryPress={() => {}}
        />
      )
    ).not.toThrow();
  });
});
