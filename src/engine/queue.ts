// Lesson challenge queue — SPEC.md §4.
//
// Mechanics: a lesson holds an ordered list of challenges. The learner is shown the
// challenge at the front of the queue. A correct answer removes it for good. A wrong
// answer sends it to the BACK of the queue (not immediately after) so the learner sees
// other material before retrying it. The lesson is complete only once every distinct
// challenge has been answered correctly at least once.
//
// This module is pure: no I/O, no React, no Convex — just state transitions over an
// array of challenge ids, so it's trivial to unit test and safe to call from any host
// (screen component, test, future non-RN client).

export type ChallengeId = string;

export interface QueueState {
  /** Ids still pending, in the order they'll be presented. Index 0 is "current". */
  readonly queue: readonly ChallengeId[];
  /** Ids answered correctly at least once. */
  readonly completed: readonly ChallengeId[];
  /** Total number of distinct challenges in the lesson (for progress-bar denominator). */
  readonly totalCount: number;
}

export class EmptyQueueError extends Error {
  constructor() {
    super("LessonQueue: cannot start with zero challenges.");
    this.name = "EmptyQueueError";
  }
}

export class DuplicateChallengeIdError extends Error {
  constructor(id: ChallengeId) {
    super(`LessonQueue: duplicate challenge id "${id}" in initial challenge list.`);
    this.name = "DuplicateChallengeIdError";
  }
}

/**
 * Manages a single lesson's challenge queue.
 *
 * Usage:
 *   const q = new LessonQueue(challenges.map(c => c.slug));
 *   q.current();           // -> current challenge id, or null once complete
 *   q.submit(true|false);  // advance: correct removes it, wrong re-queues to the end
 *   q.isComplete();
 *   q.progress();          // { correctCount, totalCount } for the progress bar
 */
export class LessonQueue {
  private queue: ChallengeId[];
  private completed: Set<ChallengeId>;
  private readonly total: number;

  constructor(challengeIds: readonly ChallengeId[]) {
    if (challengeIds.length === 0) {
      throw new EmptyQueueError();
    }
    const seen = new Set<ChallengeId>();
    for (const id of challengeIds) {
      if (seen.has(id)) {
        throw new DuplicateChallengeIdError(id);
      }
      seen.add(id);
    }
    this.queue = [...challengeIds];
    this.completed = new Set();
    this.total = challengeIds.length;
  }

  /** The challenge currently up next, or null if the lesson is complete. */
  current(): ChallengeId | null {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  /**
   * Record the answer for the current challenge.
   * - Correct: challenge is removed from the queue and marked completed.
   * - Wrong: challenge is moved to the END of the queue (progress bar does not advance).
   *
   * Throws if called with no current challenge (lesson already complete).
   */
  submit(correct: boolean): void {
    if (this.queue.length === 0) {
      throw new Error("LessonQueue: no current challenge — lesson is already complete.");
    }
    const id = this.queue.shift() as ChallengeId;
    if (correct) {
      this.completed.add(id);
    } else {
      this.queue.push(id);
    }
  }

  /** True once every distinct challenge has been answered correctly at least once. */
  isComplete(): boolean {
    return this.queue.length === 0;
  }

  /** Progress-bar data: correct answers advance it, re-queued wrong answers don't. */
  progress(): { correctCount: number; totalCount: number } {
    return { correctCount: this.completed.size, totalCount: this.total };
  }

  /** Immutable snapshot of internal state, e.g. for persistence/debugging. */
  getState(): QueueState {
    return {
      queue: [...this.queue],
      completed: [...this.completed],
      totalCount: this.total,
    };
  }
}
