// Content data for fill_blank/complete_translation doesn't reliably carry
// spacing around the blank (some challenges have it, most don't — inconsistent
// at the content layer, e.g. "Ti" + "student." with zero embedded space).
// Rather than regenerate 150+ challenges to enforce a data convention, the
// renderer normalizes spacing itself: always exactly one space before a blank
// (unless it's the very start of the sentence), and exactly one space after —
// UNLESS the following text is punctuation that should attach directly to the
// blank (e.g. "?", "!", ", Wieslaw!"), which must NOT get a leading space.

const LEADING_PUNCTUATION = /^[.,!?;:)]/;

export function padBeforeBlank(before: string): string {
  if (before.length === 0) return before;
  return /\s$/.test(before) ? before : `${before} `;
}

export function padAfterBlank(after: string): string {
  if (after.length === 0) return after;
  if (/^\s/.test(after)) return after;
  if (LEADING_PUNCTUATION.test(after)) return after;
  return ` ${after}`;
}
