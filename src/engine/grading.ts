// Grading — SPEC.md §4 ("Grading (typed answers)") + docs/challenge-schema.md payload
// shapes for every challenge type. Pure functions, no I/O.
//
// Typed-answer tolerance rules (translate_type, listen_type, complete_translation and
// fill_blank when the learner types rather than picks):
//   1. Normalize both sides: lowercase, strip punctuation, collapse whitespace.
//   2. Diacritic tolerance: ASCII-folded Serbian (š/ž/č/ć/đ -> s/z/c/c/dj, case-insensitive)
//      is accepted, flagged with a "watch the accents" note.
//   3. Typo tolerance: edit distance 1 on words >= 5 chars is accepted, flagged with a
//      "you have a typo" note (Duolingo behavior).
// Exact match (after normalization) is always correct with no note.

// ---------------------------------------------------------------------------
// Normalization + diacritic folding
// ---------------------------------------------------------------------------

/** Lowercase, strip punctuation, collapse whitespace. Diacritics are preserved here. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .trim()
    // Strip punctuation (keep letters incl. diacritics, digits, and whitespace).
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Serbian diacritic -> ASCII fold. Order matters for the digraph (đ -> dj) vs single
// chars; digraphs are handled as direct char->string replacements so order is irrelevant.
const DIACRITIC_FOLD_MAP: Record<string, string> = {
  š: "s",
  ž: "z",
  č: "c",
  ć: "c",
  đ: "dj",
};

/** Fold Serbian diacritics to their ASCII equivalents (š/ž/č/ć/đ -> s/z/c/c/dj). */
export function foldDiacritics(input: string): string {
  return input.replace(/[šžčćđ]/g, (ch) => DIACRITIC_FOLD_MAP[ch] ?? ch);
}

/**
 * Diacritic-tolerant equality check.
 *
 * š/ž/č/ć fold 1-for-1 onto a single ASCII char, so folding both sides and comparing
 * is enough. đ is special: SPEC's canonical fold is the digraph "dj", but plenty of
 * everyday ASCII typing drops it to a bare "d" instead (e.g. "dete" for "đete"). Both
 * are diacritic slips, not typos, so treat a folded-side match against EITHER the
 * "dj" or bare-"d" rendering of đ as a diacritic-tolerant match.
 */
function diacriticFoldsMatch(normalizedUser: string, normalizedAccepted: string): boolean {
  const foldedUser = foldDiacritics(normalizedUser);
  const foldedAccepted = foldDiacritics(normalizedAccepted);
  if (foldedUser === foldedAccepted) return true;

  // Also accept đ folded to bare "d" (only relevant when the accepted answer contains đ).
  if (/đ/.test(normalizedAccepted)) {
    const bareDFolded = normalizedAccepted.replace(/đ/g, "d").replace(/[šžčć]/g, (ch) => DIACRITIC_FOLD_MAP[ch] ?? ch);
    if (foldedUser === bareDFolded) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Edit distance (Levenshtein), used for typo tolerance
// ---------------------------------------------------------------------------

/** Classic Levenshtein edit distance between two strings. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// ---------------------------------------------------------------------------
// Typed-answer grading
// ---------------------------------------------------------------------------

export type GradeNote = "diacritics" | "typo" | null;

export interface TypedGradeResult {
  correct: boolean;
  /** Non-null only when correct: which tolerance, if any, was applied. */
  note: GradeNote;
  /** The accepted answer (post-normalization) that matched, if correct. */
  matchedAnswer?: string;
}

const MIN_WORD_LENGTH_FOR_TYPO_TOLERANCE = 5;

/**
 * Compare a single normalized user word/phrase against a single normalized accepted
 * answer, applying diacritic tolerance then typo tolerance. Both inputs must already
 * be run through `normalize`.
 */
function compareNormalized(userAnswer: string, accepted: string): TypedGradeResult {
  if (userAnswer === accepted) {
    return { correct: true, note: null, matchedAnswer: accepted };
  }

  // Diacritic tolerance: fold both sides (including the đ -> bare "d" everyday variant)
  // and compare. This is what makes ASCII-typed answers missing accents count as
  // correct-with-a-note rather than wrong.
  if (diacriticFoldsMatch(userAnswer, accepted)) {
    return { correct: true, note: "diacritics", matchedAnswer: accepted };
  }

  // Typo tolerance: edit distance 1, only for whole answers/words of length >= 5,
  // measured on the diacritic-folded forms so a missed accent isn't double-counted
  // as a typo on top of being a diacritic slip.
  const foldedUser = foldDiacritics(userAnswer);
  const foldedAccepted = foldDiacritics(accepted);
  if (
    foldedAccepted.length >= MIN_WORD_LENGTH_FOR_TYPO_TOLERANCE &&
    editDistance(foldedUser, foldedAccepted) === 1
  ) {
    return { correct: true, note: "typo", matchedAnswer: accepted };
  }

  return { correct: false, note: null };
}

/**
 * Grade a typed answer against a list of accepted answers, picking the best (most
 * lenient tolerance wins over rejection, exact match wins over any tolerance).
 */
export function gradeTypedAnswer(
  userInput: string,
  acceptedAnswers: readonly string[],
): TypedGradeResult {
  const normalizedUser = normalize(userInput);

  let best: TypedGradeResult = { correct: false, note: null };
  for (const accepted of acceptedAnswers) {
    const normalizedAccepted = normalize(accepted);
    const result = compareNormalized(normalizedUser, normalizedAccepted);
    if (!result.correct) continue;
    if (result.note === null) return result; // exact match — can't do better
    if (best.correct === false) {
      best = result;
    } else if (best.note === "typo" && result.note === "diacritics") {
      // Prefer the gentler "watch the accents" note over "you have a typo" if both apply
      // across different accepted answers.
      best = result;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Challenge payload shapes (docs/challenge-schema.md) — minimal typing needed for grading.
// ---------------------------------------------------------------------------

export interface TranslateBankChallenge {
  type: "translate_bank";
  payload: { promptText: string; correctAnswer: string; wordBank: string[] };
}

export interface TranslateBankReverseChallenge {
  type: "translate_bank_reverse";
  payload: { promptText: string; correctAnswer: string; wordBank: string[] };
}

export interface TranslateTypeChallenge {
  type: "translate_type";
  payload: {
    promptText: string;
    direction: "sr_to_en" | "en_to_sr";
    correctAnswers: string[];
  };
}

export interface FillBlankChallenge {
  type: "fill_blank";
  payload: {
    sentenceBefore: string;
    sentenceAfter: string;
    fullSentenceAudioText: string;
    correctAnswer: string;
    options: string[];
  };
}

export interface CompleteTranslationChallenge {
  type: "complete_translation";
  payload: {
    sourceText: string;
    targetTemplate: string;
    correctAnswer: string;
    options: string[];
  };
}

export interface MarkMeaningChallenge {
  type: "mark_meaning";
  payload: { promptText: string; options: { text: string; correct: boolean }[] };
}

export interface MatchPairsChallenge {
  type: "match_pairs";
  payload: { pairs: { sr: string; en: string }[] };
}

export interface CompleteChatChallenge {
  type: "complete_chat";
  payload: {
    dialogue: { speaker: string; text: string }[];
    promptQuestion: string;
    options: string[];
    correctAnswer: string;
  };
}

export interface ListenTapChallenge {
  type: "listen_tap";
  payload: { audioText: string; options: string[] };
}

export interface ListenTypeChallenge {
  type: "listen_type";
  payload: { audioText: string; correctAnswer: string };
}

export type Challenge =
  | TranslateBankChallenge
  | TranslateBankReverseChallenge
  | TranslateTypeChallenge
  | FillBlankChallenge
  | CompleteTranslationChallenge
  | MarkMeaningChallenge
  | MatchPairsChallenge
  | CompleteChatChallenge
  | ListenTapChallenge
  | ListenTypeChallenge;

// ---------------------------------------------------------------------------
// Per-type answer shapes + grading dispatcher
// ---------------------------------------------------------------------------

/**
 * The learner's answer, shaped per challenge type. Selection-style challenges submit
 * the chosen string(s); typed-style challenges submit raw typed text.
 */
export type ChallengeAnswer =
  | { type: "translate_bank"; orderedWords: string[] }
  | { type: "translate_bank_reverse"; orderedWords: string[] }
  | { type: "translate_type"; text: string }
  | { type: "fill_blank"; selected: string }
  | { type: "fill_blank"; typed: string }
  | { type: "complete_translation"; selected: string }
  | { type: "complete_translation"; typed: string }
  | { type: "mark_meaning"; selected: string }
  | { type: "match_pairs"; matchedPairs: { sr: string; en: string }[] }
  | { type: "complete_chat"; selected: string }
  | { type: "listen_tap"; selected: string }
  | { type: "listen_type"; text: string };

export interface GradeResult {
  correct: boolean;
  note: GradeNote;
}

const noNoteCorrect: GradeResult = { correct: true, note: null };
const incorrect: GradeResult = { correct: false, note: null };

/**
 * Route a challenge + answer to the right correctness check, per docs/challenge-schema.md.
 * Typed-style types (translate_type, listen_type, complete_translation/fill_blank when
 * typed) get normalize + diacritic + typo tolerance via `gradeTypedAnswer`; every other
 * type is a simple equality/selection check against its payload.
 */
export function gradeChallenge(challenge: Challenge, answer: ChallengeAnswer): GradeResult {
  if (challenge.type !== answer.type) {
    throw new Error(
      `gradeChallenge: challenge type "${challenge.type}" does not match answer type "${answer.type}".`,
    );
  }

  switch (challenge.type) {
    case "translate_bank":
    case "translate_bank_reverse": {
      const a = answer as Extract<ChallengeAnswer, { type: typeof challenge.type }>;
      const correctWords = challenge.payload.correctAnswer.trim().split(/\s+/);
      const submittedWords = a.orderedWords.map((w) => w.trim()).filter((w) => w.length > 0);
      const isMatch =
        correctWords.length === submittedWords.length &&
        correctWords.every(
          (word, i) => normalize(word) === normalize(submittedWords[i] ?? ""),
        );
      return isMatch ? noNoteCorrect : incorrect;
    }

    case "translate_type": {
      const a = answer as Extract<ChallengeAnswer, { type: "translate_type" }>;
      const result = gradeTypedAnswer(a.text, challenge.payload.correctAnswers);
      return { correct: result.correct, note: result.note };
    }

    case "fill_blank": {
      const a = answer as Extract<ChallengeAnswer, { type: "fill_blank" }>;
      if ("selected" in a) {
        return normalize(a.selected) === normalize(challenge.payload.correctAnswer)
          ? noNoteCorrect
          : incorrect;
      }
      // Typed variant: apply full typed-answer tolerance (SPEC §4).
      const result = gradeTypedAnswer(a.typed, [challenge.payload.correctAnswer]);
      return { correct: result.correct, note: result.note };
    }

    case "complete_translation": {
      const a = answer as Extract<ChallengeAnswer, { type: "complete_translation" }>;
      if ("selected" in a) {
        return normalize(a.selected) === normalize(challenge.payload.correctAnswer)
          ? noNoteCorrect
          : incorrect;
      }
      const result = gradeTypedAnswer(a.typed, [challenge.payload.correctAnswer]);
      return { correct: result.correct, note: result.note };
    }

    case "mark_meaning": {
      const a = answer as Extract<ChallengeAnswer, { type: "mark_meaning" }>;
      const correctOption = challenge.payload.options.find((o) => o.correct);
      return correctOption && normalize(a.selected) === normalize(correctOption.text)
        ? noNoteCorrect
        : incorrect;
    }

    case "match_pairs": {
      const a = answer as Extract<ChallengeAnswer, { type: "match_pairs" }>;
      const expected = challenge.payload.pairs;
      if (a.matchedPairs.length !== expected.length) return incorrect;
      const isMatch = expected.every((pair) =>
        a.matchedPairs.some(
          (m) => normalize(m.sr) === normalize(pair.sr) && normalize(m.en) === normalize(pair.en),
        ),
      );
      return isMatch ? noNoteCorrect : incorrect;
    }

    case "complete_chat": {
      const a = answer as Extract<ChallengeAnswer, { type: "complete_chat" }>;
      return normalize(a.selected) === normalize(challenge.payload.correctAnswer)
        ? noNoteCorrect
        : incorrect;
    }

    case "listen_tap": {
      const a = answer as Extract<ChallengeAnswer, { type: "listen_tap" }>;
      return normalize(a.selected) === normalize(challenge.payload.audioText)
        ? noNoteCorrect
        : incorrect;
    }

    case "listen_type": {
      const a = answer as Extract<ChallengeAnswer, { type: "listen_type" }>;
      const result = gradeTypedAnswer(a.text, [challenge.payload.correctAnswer]);
      return { correct: result.correct, note: result.note };
    }

    default: {
      const _exhaustive: never = challenge;
      throw new Error(`gradeChallenge: unhandled challenge type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
