// Shared "how many times must a lesson be completed before the next unlocks" —
// like Duolingo's crown levels, so a single pass through a lesson's ~10 challenges
// isn't enough to move on. Read by both completions.ts (to report round progress)
// and path.ts (to decide when a lesson counts as done for unlock purposes) so they
// can never drift out of sync.
export const LESSON_REQUIRED_ROUNDS = 3;
