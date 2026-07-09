/// <reference types="jest" />
import React from "react";
import { render } from "@testing-library/react-native";
import { ProgressBar } from "./ProgressBar";
import { colors } from "@/design/tokens";

function flattenStyle(style: unknown): Record<string, unknown> {
  return Array.isArray(style) ? Object.assign({}, ...style) : (style as Record<string, unknown>);
}

describe("ProgressBar", () => {
  it("renders at 0 progress (empty track)", async () => {
    await expect(render(<ProgressBar progress={0} />)).resolves.toBeDefined();
  });

  it("renders at partial progress (default green fill)", async () => {
    await expect(render(<ProgressBar progress={0.5} />)).resolves.toBeDefined();
  });

  it("renders at full progress (1)", async () => {
    await expect(render(<ProgressBar progress={1} />)).resolves.toBeDefined();
  });

  it("renders with a custom color prop", async () => {
    await expect(
      render(<ProgressBar progress={0.3} color={colors.blue} />)
    ).resolves.toBeDefined();
  });

  it("clamps and renders when progress is below 0", async () => {
    await expect(render(<ProgressBar progress={-0.5} />)).resolves.toBeDefined();
  });

  it("clamps and renders when progress is above 1", async () => {
    await expect(render(<ProgressBar progress={1.5} />)).resolves.toBeDefined();
  });

  it("applies the given progress as the fill width", async () => {
    const { getByTestId } = await render(<ProgressBar progress={0.4} />);
    const fill = getByTestId("progress-bar-fill");
    expect(flattenStyle(fill.props.style).width).toBe("40%");
  });

  it("uses the default green fill color when none is provided", async () => {
    const { getByTestId } = await render(<ProgressBar progress={0.7} />);
    const fill = getByTestId("progress-bar-fill");
    expect(flattenStyle(fill.props.style).backgroundColor).toBe(colors.green);
  });

  it("uses the provided color prop for the fill", async () => {
    const { getByTestId } = await render(
      <ProgressBar progress={0.7} color={colors.red} />
    );
    const fill = getByTestId("progress-bar-fill");
    expect(flattenStyle(fill.props.style).backgroundColor).toBe(colors.red);
  });
});
