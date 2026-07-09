import { render } from "@testing-library/react-native";

import { PillLabel, type PillLabelVariant } from "@/components/ui/PillLabel";

describe("PillLabel", () => {
  const variants: PillLabelVariant[] = ["new-word", "hard-exercise"];

  it.each(variants)("renders the %s variant without throwing", async (variant) => {
    await expect(render(<PillLabel variant={variant} />)).resolves.toBeTruthy();
  });

  it("shows the NEW WORD label for the new-word variant", async () => {
    const { getByText } = await render(<PillLabel variant="new-word" />);
    expect(getByText("NEW WORD")).toBeTruthy();
  });

  it("shows the HARD EXERCISE label for the hard-exercise variant", async () => {
    const { getByText } = await render(<PillLabel variant="hard-exercise" />);
    expect(getByText("HARD EXERCISE")).toBeTruthy();
  });
});
