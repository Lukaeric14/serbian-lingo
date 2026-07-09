import {
  Challenge,
  editDistance,
  foldDiacritics,
  gradeChallenge,
  gradeTypedAnswer,
  normalize,
} from "./grading";

describe("normalize", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalize("  Zdravo,   svete!! ")).toBe("zdravo svete");
  });

  it("leaves diacritics untouched", () => {
    expect(normalize("Šta ćeš?")).toBe("šta ćeš");
  });
});

describe("foldDiacritics", () => {
  it("folds š ž č ć đ to their ASCII equivalents", () => {
    expect(foldDiacritics("šžčćđ")).toBe("szccdj");
  });

  it("leaves non-diacritic text unchanged", () => {
    expect(foldDiacritics("zdravo svete")).toBe("zdravo svete");
  });
});

describe("editDistance", () => {
  it("is 0 for identical strings", () => {
    expect(editDistance("hvala", "hvala")).toBe(0);
  });

  it("counts a single substitution as distance 1", () => {
    expect(editDistance("hvala", "hvalo")).toBe(1);
  });

  it("counts a single insertion/deletion as distance 1", () => {
    expect(editDistance("hvala", "hval")).toBe(1);
    expect(editDistance("hval", "hvala")).toBe(1);
  });

  it("counts multiple edits correctly", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
  });
});

describe("gradeTypedAnswer", () => {
  it("accepts an exact match with no note", () => {
    const result = gradeTypedAnswer("hvala", ["hvala"]);
    expect(result).toEqual({ correct: true, note: null, matchedAnswer: "hvala" });
  });

  it("accepts an exact match after normalization (case/punctuation/whitespace)", () => {
    const result = gradeTypedAnswer("  HVALA!! ", ["hvala"]);
    expect(result.correct).toBe(true);
    expect(result.note).toBeNull();
  });

  it("accepts ASCII-folded diacritics as correct with a diacritics note", () => {
    // "čaša" (cup/glass) typed without diacritics as "casa".
    const result = gradeTypedAnswer("casa", ["čaša"]);
    expect(result.correct).toBe(true);
    expect(result.note).toBe("diacritics");
  });

  it("accepts the đ -> dj digraph fold", () => {
    const result = gradeTypedAnswer("dete", ["đete"]);
    expect(result.correct).toBe(true);
    expect(result.note).toBe("diacritics");
  });

  it("accepts a single-character typo on a word >= 5 chars with a typo note", () => {
    // "hvala" (5 chars) mistyped with one substitution.
    const result = gradeTypedAnswer("hvalo", ["hvala"]);
    expect(result.correct).toBe(true);
    expect(result.note).toBe("typo");
  });

  it("rejects a typo on a word shorter than 5 chars (too short for typo tolerance)", () => {
    // "da" (yes) -> "de" is edit distance 1 but only 2 chars long.
    const result = gradeTypedAnswer("de", ["da"]);
    expect(result.correct).toBe(false);
  });

  it("rejects an answer that is too different (edit distance > 1) even on a long word", () => {
    const result = gradeTypedAnswer("banana", ["hvala"]);
    expect(result.correct).toBe(false);
    expect(result.note).toBeNull();
  });

  it("rejects an edit-distance-2 typo on a >= 5 char word", () => {
    // "hvala" -> "hxylz": distance well beyond 1.
    const result = gradeTypedAnswer("hxylz", ["hvala"]);
    expect(result.correct).toBe(false);
  });

  it("matches against any accepted answer in the list", () => {
    const result = gradeTypedAnswer("zdravo", ["cao", "zdravo", "hej"]);
    expect(result.correct).toBe(true);
    expect(result.note).toBeNull();
  });

  it("prefers an exact match over a tolerant match when both are available", () => {
    const result = gradeTypedAnswer("hvala", ["hvalo", "hvala"]);
    expect(result.correct).toBe(true);
    expect(result.note).toBeNull();
  });
});

describe("gradeChallenge dispatcher", () => {
  it("grades translate_bank by exact word-order match", () => {
    const challenge: Challenge = {
      type: "translate_bank",
      payload: {
        promptText: "Ja jedem hleb.",
        correctAnswer: "I eat bread",
        wordBank: ["I", "eat", "bread", "milk", "drink"],
      },
    };
    expect(
      gradeChallenge(challenge, { type: "translate_bank", orderedWords: ["I", "eat", "bread"] }),
    ).toEqual({ correct: true, note: null });
    expect(
      gradeChallenge(challenge, { type: "translate_bank", orderedWords: ["I", "bread", "eat"] }),
    ).toEqual({ correct: false, note: null });
  });

  it("grades translate_bank_reverse by exact word-order match", () => {
    const challenge: Challenge = {
      type: "translate_bank_reverse",
      payload: {
        promptText: "I eat bread.",
        correctAnswer: "Ja jedem hleb",
        wordBank: ["Ja", "jedem", "hleb", "mleko", "pijem"],
      },
    };
    expect(
      gradeChallenge(challenge, {
        type: "translate_bank_reverse",
        orderedWords: ["Ja", "jedem", "hleb"],
      }),
    ).toEqual({ correct: true, note: null });
    expect(
      gradeChallenge(challenge, {
        type: "translate_bank_reverse",
        orderedWords: ["Ja", "pijem", "mleko"],
      }),
    ).toEqual({ correct: false, note: null });
  });

  it("grades translate_type with full typed tolerance (diacritics)", () => {
    const challenge: Challenge = {
      type: "translate_type",
      payload: {
        promptText: "čaša",
        direction: "sr_to_en",
        correctAnswers: ["cup", "glass"],
      },
    };
    expect(
      gradeChallenge(challenge, { type: "translate_type", text: "glass" }),
    ).toEqual({ correct: true, note: null });
    expect(
      gradeChallenge(challenge, { type: "translate_type", text: "table" }),
    ).toEqual({ correct: false, note: null });
  });

  it("grades fill_blank by selection", () => {
    const challenge: Challenge = {
      type: "fill_blank",
      payload: {
        sentenceBefore: "Ja pijem",
        sentenceAfter: ".",
        fullSentenceAudioText: "Ja pijem vodu.",
        correctAnswer: "vodu",
        options: ["vodu", "hleb", "mleko"],
      },
    };
    expect(
      gradeChallenge(challenge, { type: "fill_blank", selected: "vodu" }),
    ).toEqual({ correct: true, note: null });
    expect(
      gradeChallenge(challenge, { type: "fill_blank", selected: "hleb" }),
    ).toEqual({ correct: false, note: null });
  });

  it("grades fill_blank by typed input with tolerance (typo)", () => {
    const challenge: Challenge = {
      type: "fill_blank",
      payload: {
        sentenceBefore: "Ja pijem",
        sentenceAfter: ".",
        fullSentenceAudioText: "Ja pijem vodu.",
        correctAnswer: "vodu",
        options: ["vodu", "hleb", "mleko"],
      },
    };
    // "vodu" is only 4 chars, so use a longer example for the typo path.
    const longerChallenge: Challenge = {
      ...challenge,
      payload: { ...challenge.payload, correctAnswer: "hvala" },
    };
    expect(
      gradeChallenge(longerChallenge, { type: "fill_blank", typed: "hvalo" }),
    ).toEqual({ correct: true, note: "typo" });
    expect(
      gradeChallenge(challenge, { type: "fill_blank", typed: "vodu" }),
    ).toEqual({ correct: true, note: null });
  });

  it("grades complete_translation by selection", () => {
    const challenge: Challenge = {
      type: "complete_translation",
      payload: {
        sourceText: "Ja jedem hleb.",
        targetTemplate: "I eat ___.",
        correctAnswer: "bread",
        options: ["bread", "milk", "water"],
      },
    };
    expect(
      gradeChallenge(challenge, { type: "complete_translation", selected: "bread" }),
    ).toEqual({ correct: true, note: null });
    expect(
      gradeChallenge(challenge, { type: "complete_translation", selected: "milk" }),
    ).toEqual({ correct: false, note: null });
  });

  it("grades complete_translation by typed input with diacritic tolerance", () => {
    const challenge: Challenge = {
      type: "complete_translation",
      payload: {
        sourceText: "Ja želim čaj.",
        targetTemplate: "Ja ___ čaj.",
        correctAnswer: "želim",
        options: ["želim", "jedem", "pijem"],
      },
    };
    expect(
      gradeChallenge(challenge, { type: "complete_translation", typed: "zelim" }),
    ).toEqual({ correct: true, note: "diacritics" });
  });

  it("grades mark_meaning by matching the option flagged correct: true", () => {
    const challenge: Challenge = {
      type: "mark_meaning",
      payload: {
        promptText: "hleb",
        options: [
          { text: "bread", correct: true },
          { text: "water", correct: false },
          { text: "milk", correct: false },
        ],
      },
    };
    expect(
      gradeChallenge(challenge, { type: "mark_meaning", selected: "bread" }),
    ).toEqual({ correct: true, note: null });
    expect(
      gradeChallenge(challenge, { type: "mark_meaning", selected: "water" }),
    ).toEqual({ correct: false, note: null });
  });

  it("grades match_pairs requiring every pair to be matched correctly", () => {
    const challenge: Challenge = {
      type: "match_pairs",
      payload: {
        pairs: [
          { sr: "hleb", en: "bread" },
          { sr: "voda", en: "water" },
          { sr: "mleko", en: "milk" },
          { sr: "jaje", en: "egg" },
          { sr: "sir", en: "cheese" },
        ],
      },
    };
    const correctMatches = challenge.payload.pairs;
    expect(
      gradeChallenge(challenge, { type: "match_pairs", matchedPairs: correctMatches }),
    ).toEqual({ correct: true, note: null });

    const wrongMatches = [
      ...correctMatches.slice(0, 4),
      { sr: "sir", en: "water" }, // mismatched
    ];
    expect(
      gradeChallenge(challenge, { type: "match_pairs", matchedPairs: wrongMatches }),
    ).toEqual({ correct: false, note: null });
  });

  it("grades complete_chat by matching the selected reply", () => {
    const challenge: Challenge = {
      type: "complete_chat",
      payload: {
        dialogue: [
          { speaker: "Ana", text: "Kako si?" },
          { speaker: "Marko", text: "Dobro sam, hvala." },
        ],
        promptQuestion: "How are you?",
        options: ["I'm fine, thanks.", "I'm hungry.", "Goodbye."],
        correctAnswer: "I'm fine, thanks.",
      },
    };
    expect(
      gradeChallenge(challenge, { type: "complete_chat", selected: "I'm fine, thanks." }),
    ).toEqual({ correct: true, note: null });
    expect(
      gradeChallenge(challenge, { type: "complete_chat", selected: "Goodbye." }),
    ).toEqual({ correct: false, note: null });
  });

  it("grades listen_tap by matching the selected word against audioText", () => {
    const challenge: Challenge = {
      type: "listen_tap",
      payload: {
        audioText: "voda",
        options: ["voda", "vatra", "vino", "veče"],
      },
    };
    expect(
      gradeChallenge(challenge, { type: "listen_tap", selected: "voda" }),
    ).toEqual({ correct: true, note: null });
    expect(
      gradeChallenge(challenge, { type: "listen_tap", selected: "vatra" }),
    ).toEqual({ correct: false, note: null });
  });

  it("grades listen_type with full typed tolerance (typo)", () => {
    const challenge: Challenge = {
      type: "listen_type",
      payload: { audioText: "hvala", correctAnswer: "hvala" },
    };
    expect(
      gradeChallenge(challenge, { type: "listen_type", text: "hvala" }),
    ).toEqual({ correct: true, note: null });
    expect(
      gradeChallenge(challenge, { type: "listen_type", text: "hvalo" }),
    ).toEqual({ correct: true, note: "typo" });
    expect(
      gradeChallenge(challenge, { type: "listen_type", text: "zdravo" }),
    ).toEqual({ correct: false, note: null });
  });

  it("throws if the answer type does not match the challenge type", () => {
    const challenge: Challenge = {
      type: "listen_type",
      payload: { audioText: "hvala", correctAnswer: "hvala" },
    };
    expect(() =>
      gradeChallenge(challenge, { type: "listen_tap", selected: "hvala" }),
    ).toThrow();
  });
});
