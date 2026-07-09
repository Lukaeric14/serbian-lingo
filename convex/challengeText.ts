// Shared helper: extract every Serbian surface-form string that must have a matching
// audioClips row for a given challenge's payload. This is the authoritative mapping from
// docs/challenge-schema.md — one place so seedUnit's validation and publishUnit's
// enforcement (and tests) all agree on what "audio-complete" means.
//
// IMPORTANT: this only extracts strings; it does not validate the payload shape itself.
// Malformed payloads (missing fields) will surface as extraction throwing or returning
// nothing useful — schema-shape validation is a separate concern from publishing safety.

export type ChallengeType =
  | "translate_bank"
  | "translate_bank_reverse"
  | "translate_type"
  | "fill_blank"
  | "complete_translation"
  | "mark_meaning"
  | "match_pairs"
  | "complete_chat"
  | "listen_tap"
  | "listen_type";

/**
 * Returns the list of Serbian strings in `payload` (for the given challenge `type`)
 * that must exist in the audioClips table (by exact text) before the unit can publish.
 *
 * Per docs/challenge-schema.md:
 * - translate_bank: promptText (SR)
 * - translate_bank_reverse: correctAnswer (SR, the joined surface forms)
 * - translate_type: promptText if direction === "sr_to_en"; else every entry in
 *   correctAnswers (direction === "en_to_sr")
 * - fill_blank: fullSentenceAudioText (SR, complete sentence w/ correct word)
 * - complete_translation: sourceText (SR)
 * - mark_meaning: promptText (SR)
 * - match_pairs: pairs[].sr (each pair's Serbian side)
 * - complete_chat: dialogue[].text (each bubble's SR text)
 * - listen_tap: audioText (SR word)
 * - listen_type: audioText (SR word)
 */
export function requiredAudioTexts(type: ChallengeType, payload: any): string[] {
  switch (type) {
    case "translate_bank":
      return [payload.promptText];
    case "translate_bank_reverse":
      return [payload.correctAnswer];
    case "translate_type":
      return payload.direction === "sr_to_en"
        ? [payload.promptText]
        : [...(payload.correctAnswers ?? [])];
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
    default: {
      // Exhaustiveness guard: if a new challenge type is added to the schema without
      // updating this switch, fail loudly instead of silently skipping audio validation.
      const _exhaustive: never = type;
      throw new Error(`requiredAudioTexts: unhandled challenge type ${String(_exhaustive)}`);
    }
  }
}
