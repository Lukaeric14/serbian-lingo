// Maps a lesson's challenges to the exact set of texts their RENDERERS can
// play (autoplay or tap) — used by the lesson host to preload/download only
// the audio the current lesson can actually need, instead of every clip in
// the database.
//
// NOTE this intentionally differs from convex/challengeText.ts's
// requiredAudioTexts (the publishing gate): e.g. translate_bank_reverse's
// renderer plays each wordBank TILE's clip on tap, not the joined
// correctAnswer sentence, and listen_tap's options are text-only tiles.
// This file mirrors what src/components/challenges/* really call play() with.

interface ChallengeLike {
  type: string;
  payload: any;
}

export function audioTextsForChallenge(challenge: ChallengeLike): string[] {
  const { type, payload } = challenge;
  switch (type) {
    case "translate_bank":
      return [payload.promptText];
    case "translate_bank_reverse":
      return [...(payload.wordBank ?? [])];
    case "translate_type":
      return payload.direction === "sr_to_en" ? [payload.promptText] : [];
    case "fill_blank":
      return [payload.fullSentenceAudioText];
    case "complete_translation":
      return [payload.sourceText];
    case "mark_meaning":
      return [payload.promptText];
    case "match_pairs":
      return (payload.pairs ?? []).map((p: any) => p.sr);
    case "complete_chat":
      return (payload.dialogue ?? []).map((d: any) => d.text);
    case "listen_tap":
      return [payload.audioText];
    case "listen_type":
      return [payload.audioText];
    default:
      return [];
  }
}

/** Union of playable texts across a lesson's challenges (deduped, no empties). */
export function audioTextsForChallenges(challenges: ChallengeLike[]): Set<string> {
  const texts = new Set<string>();
  for (const challenge of challenges) {
    for (const text of audioTextsForChallenge(challenge)) {
      if (typeof text === "string" && text.length > 0) texts.add(text);
    }
  }
  return texts;
}
