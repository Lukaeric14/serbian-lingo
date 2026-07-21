import { audioTextsForChallenges } from "./lessonAudioTexts";

// Mirrors what each renderer actually calls play() with — see the module's
// header for why this differs from convex/challengeText.ts's publishing gate.
describe("audioTextsForChallenges", () => {
  it("collects renderer-playable texts per challenge type", () => {
    const texts = audioTextsForChallenges([
      { type: "translate_bank", payload: { promptText: "Zdravo!" } },
      { type: "translate_bank_reverse", payload: { wordBank: ["Ja", "sam", "ovde"] } },
      { type: "translate_type", payload: { direction: "sr_to_en", promptText: "Hvala." } },
      { type: "translate_type", payload: { direction: "en_to_sr", promptText: "Thanks." } },
      { type: "fill_blank", payload: { fullSentenceAudioText: "Ti si student." } },
      { type: "complete_translation", payload: { sourceText: "Ja sam Dominika." } },
      { type: "mark_meaning", payload: { promptText: "voda" } },
      { type: "match_pairs", payload: { pairs: [{ sr: "hleb", en: "bread" }, { sr: "voda", en: "water" }] } },
      { type: "complete_chat", payload: { dialogue: [{ speaker: "A", text: "Laku noć!" }, { speaker: "B", text: "___" }] } },
      { type: "listen_tap", payload: { audioText: "žena", options: ["žena", "čovek"] } },
      { type: "listen_type", payload: { audioText: "student" } },
    ]);

    expect(texts).toEqual(
      new Set([
        "Zdravo!",
        "Ja", "sam", "ovde",
        "Hvala.", // sr_to_en prompt only — the en_to_sr English prompt is excluded
        "Ti si student.",
        "Ja sam Dominika.",
        "voda",
        "hleb",
        "Laku noć!", "___",
        "žena", // listen_tap options are text tiles, never audio
        "student",
      ]),
    );
  });

  it("tolerates unknown types and missing payload fields", () => {
    const texts = audioTextsForChallenges([
      { type: "future_type", payload: {} },
      { type: "translate_bank_reverse", payload: {} },
      { type: "match_pairs", payload: {} },
      { type: "complete_chat", payload: {} },
    ]);
    expect(texts.size).toBe(0);
  });
});
