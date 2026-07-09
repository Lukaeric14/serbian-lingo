/// <reference types="jest" />
import React from "react";
import { render } from "@testing-library/react-native";
import { PathNode, type PathNodeKind, type PathNodeState } from "./PathNode";
import { colors, glow } from "@/design/tokens";

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

  it("renders a real SVG icon, never emoji/text glyphs, for every state/kind", async () => {
    const cases: Array<{
      state: PathNodeState;
      kind: PathNodeKind;
      testID: string;
    }> = [
      { state: "locked", kind: "lesson", testID: "path-node-icon-lock" },
      { state: "locked", kind: "chest", testID: "path-node-icon-lock" },
      { state: "locked", kind: "practice", testID: "path-node-icon-lock" },
      { state: "active", kind: "lesson", testID: "path-node-icon-star" },
      { state: "completed", kind: "lesson", testID: "path-node-icon-check" },
      { state: "active", kind: "chest", testID: "path-node-icon-chest" },
      { state: "completed", kind: "chest", testID: "path-node-icon-chest" },
      { state: "active", kind: "practice", testID: "path-node-icon-dumbbell" },
      { state: "completed", kind: "practice", testID: "path-node-icon-dumbbell" },
    ];

    for (const { state, kind, testID } of cases) {
      const { getByTestId, queryAllByText } = await render(
        <PathNode state={state} kind={kind} color={colors.blue} />
      );
      expect(getByTestId(testID)).toBeTruthy();
      // No leftover emoji/text glyphs (🔒 🎁 💪 ✓ ★) should ever render.
      expect(queryAllByText(/[🔒🎁💪✓★🔥⚡]/u)).toHaveLength(0);
    }
  });

  it("applies a gold glow wrapper style when completed", async () => {
    const { getByTestId } = await render(
      <PathNode state="completed" kind="lesson" color={colors.green} />
    );
    const wrapper = getByTestId("path-node-wrapper");
    const flatStyle = Array.isArray(wrapper.props.style)
      ? Object.assign({}, ...wrapper.props.style.flat(Infinity).filter(Boolean))
      : wrapper.props.style;
    expect(flatStyle.shadowColor).toBe(glow.gold.shadowColor);
  });

  it("applies a green glow wrapper style when active", async () => {
    const { getByTestId } = await render(
      <PathNode state="active" kind="lesson" color={colors.green} />
    );
    const wrapper = getByTestId("path-node-wrapper");
    const flatStyle = Array.isArray(wrapper.props.style)
      ? Object.assign({}, ...wrapper.props.style.flat(Infinity).filter(Boolean))
      : wrapper.props.style;
    expect(flatStyle.shadowColor).toBe(glow.green.shadowColor);
  });

  // --- Crown-level-style round progress pips ---

  it("renders round-progress pips for an active lesson node with roundsRequired > 1", async () => {
    const { getByTestId } = await render(
      <PathNode
        state="active"
        kind="lesson"
        color={colors.green}
        roundsCompleted={1}
        roundsRequired={3}
      />
    );
    expect(getByTestId("path-node-pips")).toBeTruthy();
  });

  it("does not render pips when roundsRequired is 1 (or absent)", async () => {
    const withOneRequired = await render(
      <PathNode state="active" kind="lesson" color={colors.green} roundsCompleted={0} roundsRequired={1} />
    );
    expect(withOneRequired.queryByTestId("path-node-pips")).toBeNull();

    const withoutProps = await render(<PathNode state="active" kind="lesson" color={colors.green} />);
    expect(withoutProps.queryByTestId("path-node-pips")).toBeNull();
  });

  it("does not render pips on completed or locked nodes, even with roundsRequired > 1", async () => {
    const completed = await render(
      <PathNode state="completed" kind="lesson" color={colors.green} roundsCompleted={3} roundsRequired={3} />
    );
    expect(completed.queryByTestId("path-node-pips")).toBeNull();

    const locked = await render(
      <PathNode state="locked" kind="lesson" roundsCompleted={0} roundsRequired={3} />
    );
    expect(locked.queryByTestId("path-node-pips")).toBeNull();
  });

  it("does not render pips on non-lesson kinds (chest/practice)", async () => {
    const chest = await render(
      <PathNode state="active" kind="chest" color={colors.purple} roundsCompleted={1} roundsRequired={3} />
    );
    expect(chest.queryByTestId("path-node-pips")).toBeNull();

    const practice = await render(
      <PathNode state="active" kind="practice" color={colors.blue} roundsCompleted={1} roundsRequired={3} />
    );
    expect(practice.queryByTestId("path-node-pips")).toBeNull();
  });

  it("renders exactly roundsRequired pips", async () => {
    const { getByTestId } = await render(
      <PathNode state="active" kind="lesson" color={colors.green} roundsCompleted={2} roundsRequired={5} />
    );
    const pipsRow = getByTestId("path-node-pips");
    expect(pipsRow.children).toHaveLength(5);
  });
});
