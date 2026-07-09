/// <reference types="jest" />
import React from "react";
import { render } from "@testing-library/react-native";
import { PathNode, type PathNodeKind, type PathNodeState } from "./PathNode";
import { colors } from "@/design/tokens";

const states: PathNodeState[] = ["active", "completed", "locked"];
const kinds: PathNodeKind[] = ["lesson", "chest", "practice"];

describe("PathNode", () => {
  it.each(states.flatMap((state) => kinds.map((kind) => [state, kind] as const)))(
    "renders without throwing for state=%s kind=%s",
    async (state, kind) => {
      await expect(
        render(<PathNode state={state} kind={kind} color={colors.blue} onPress={() => {}} />)
      ).resolves.toBeDefined();
    }
  );

  it("renders with no color prop (default fallback)", async () => {
    await expect(render(<PathNode state="active" kind="lesson" />)).resolves.toBeDefined();
  });

  it("renders with no onPress handler", async () => {
    await expect(render(<PathNode state="locked" kind="lesson" />)).resolves.toBeDefined();
  });

  it("shows the pulsing ring only when active", async () => {
    const activeResult = await render(
      <PathNode state="active" kind="lesson" color={colors.green} />
    );
    expect(activeResult.getByTestId("path-node-pulse-ring")).toBeTruthy();

    const completedResult = await render(
      <PathNode state="completed" kind="lesson" color={colors.green} />
    );
    expect(completedResult.queryByTestId("path-node-pulse-ring")).toBeNull();

    const lockedResult = await render(<PathNode state="locked" kind="lesson" />);
    expect(lockedResult.queryByTestId("path-node-pulse-ring")).toBeNull();
  });

  it("marks locked nodes as disabled via accessibility state", async () => {
    const { getByRole } = await render(<PathNode state="locked" kind="lesson" />);
    const button = getByRole("button");
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it("does not disable active/completed nodes", async () => {
    const { getByRole } = await render(
      <PathNode state="completed" kind="chest" color={colors.purple} />
    );
    const button = getByRole("button");
    expect(button.props.accessibilityState?.disabled).toBeFalsy();
  });
});
