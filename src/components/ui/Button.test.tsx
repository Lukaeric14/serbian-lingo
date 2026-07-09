/// <reference types="jest" />
import { render } from "@testing-library/react-native";

import { Button, type ButtonVariant } from "@/components/ui/Button";

const VARIANTS: ButtonVariant[] = ["green", "blue", "red", "disabled"];

describe("Button", () => {
  it.each(VARIANTS)(
    "renders the %s variant without throwing",
    async (variant: ButtonVariant) => {
      await expect(
        render(<Button variant={variant} label="Continue" onPress={() => {}} />)
      ).resolves.toBeTruthy();
    }
  );

  it("renders with disabled=true on a non-disabled variant without throwing", async () => {
    await expect(
      render(
        <Button variant="green" label="Check" onPress={() => {}} disabled />
      )
    ).resolves.toBeTruthy();
  });

  it("renders without an onPress handler without throwing", async () => {
    await expect(
      render(<Button variant="blue" label="Got it" />)
    ).resolves.toBeTruthy();
  });

  it("renders the ALL CAPS label text for each variant", async () => {
    for (const variant of VARIANTS) {
      const { getByText } = await render(
        <Button variant={variant} label="start" onPress={() => {}} />
      );
      expect(getByText("START")).toBeTruthy();
    }
  });
});
