/// <reference types="jest" />
import { render } from "@testing-library/react-native";

import { StatCard, type StatCardVariant } from "@/components/ui/StatCard";

type Case = { variant: StatCardVariant; label: string; value: string };

const CASES: Case[] = [
  { variant: "xp", label: "Total XP", value: "25" },
  { variant: "time", label: "Quick", value: "1:32" },
  { variant: "accuracy", label: "Perfect!", value: "100%" },
];

describe("StatCard", () => {
  it.each(CASES)(
    "renders the $variant variant without throwing",
    async ({ variant, label, value }: Case) => {
      await expect(
        render(<StatCard variant={variant} label={label} value={value} />)
      ).resolves.toBeTruthy();
    }
  );

  it.each(CASES)(
    "shows the label and value for the $variant variant",
    async ({ variant, label, value }: Case) => {
      const { getByText } = await render(
        <StatCard variant={variant} label={label} value={value} />
      );
      expect(getByText(label.toUpperCase())).toBeTruthy();
      expect(getByText(value)).toBeTruthy();
    }
  );
});
