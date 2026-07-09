import { computeMissingClips } from "./diff";

describe("computeMissingClips", () => {
  it("returns everything when nothing exists yet", () => {
    const missing = computeMissingClips(
      [
        { text: "zdravo", kind: "word" },
        { text: "Dobro jutro, Dominika.", kind: "sentence" },
      ],
      [],
    );

    expect(missing).toEqual([
      { text: "zdravo", kind: "word" },
      { text: "Dobro jutro, Dominika.", kind: "sentence" },
    ]);
  });

  it("returns nothing when everything already exists", () => {
    const missing = computeMissingClips(
      [
        { text: "zdravo", kind: "word" },
        { text: "hvala", kind: "word" },
      ],
      ["zdravo", "hvala"],
    );

    expect(missing).toEqual([]);
  });

  it("returns only the entries missing on partial overlap", () => {
    const missing = computeMissingClips(
      [
        { text: "zdravo", kind: "word" },
        { text: "hvala", kind: "word" },
        { text: "voda", kind: "word" },
        { text: "vodu", kind: "word" },
      ],
      ["zdravo", "voda"],
    );

    expect(missing).toEqual([
      { text: "hvala", kind: "word" },
      { text: "vodu", kind: "word" },
    ]);
  });

  it("dedupes repeated text within the manifest, keeping first occurrence", () => {
    const missing = computeMissingClips(
      [
        { text: "zdravo", kind: "word" },
        { text: "zdravo", kind: "word" },
        { text: "zdravo", kind: "sentence" }, // same text, different kind — still a dupe by text
      ],
      [],
    );

    expect(missing).toEqual([{ text: "zdravo", kind: "word" }]);
  });

  it("dedupes across multiple manifests worth of entries in one call", () => {
    const missing = computeMissingClips(
      [
        { text: "Dominika voli vodu.", kind: "sentence" },
        { text: "Julia", kind: "word" },
        { text: "Dominika voli vodu.", kind: "sentence" },
        { text: "Agnieszka", kind: "word" },
      ],
      ["Julia"],
    );

    expect(missing).toEqual([
      { text: "Dominika voli vodu.", kind: "sentence" },
      { text: "Agnieszka", kind: "word" },
    ]);
  });

  it("handles empty manifest and empty existing texts", () => {
    expect(computeMissingClips([], [])).toEqual([]);
    expect(computeMissingClips([], ["zdravo"])).toEqual([]);
  });

  it("treats text matching as exact/case-sensitive (surface form, not lemma)", () => {
    // Serbian's 7 cases: "vodu" != "voda" — must not be collapsed.
    const missing = computeMissingClips(
      [
        { text: "voda", kind: "word" },
        { text: "vodu", kind: "word" },
        { text: "Voda", kind: "word" },
      ],
      ["voda"],
    );

    expect(missing).toEqual([
      { text: "vodu", kind: "word" },
      { text: "Voda", kind: "word" },
    ]);
  });

  it("does not mutate its input arrays", () => {
    const manifest = [{ text: "zdravo", kind: "word" as const }];
    const existing = ["zdravo"];
    computeMissingClips(manifest, existing);

    expect(manifest).toEqual([{ text: "zdravo", kind: "word" }]);
    expect(existing).toEqual(["zdravo"]);
  });
});
