import { DuplicateChallengeIdError, EmptyQueueError, LessonQueue } from "./queue";

describe("LessonQueue", () => {
  it("throws when constructed with an empty challenge list", () => {
    expect(() => new LessonQueue([])).toThrow(EmptyQueueError);
  });

  it("throws when constructed with duplicate challenge ids", () => {
    expect(() => new LessonQueue(["a", "b", "a"])).toThrow(DuplicateChallengeIdError);
  });

  it("starts with the first challenge as current", () => {
    const q = new LessonQueue(["a", "b", "c"]);
    expect(q.current()).toBe("a");
    expect(q.isComplete()).toBe(false);
  });

  it("removes a challenge for good on a correct answer", () => {
    const q = new LessonQueue(["a", "b", "c"]);
    q.submit(true);
    expect(q.current()).toBe("b");
    expect(q.progress()).toEqual({ correctCount: 1, totalCount: 3 });
  });

  it("re-queues a challenge to the END (not immediately after) on a wrong answer", () => {
    const q = new LessonQueue(["a", "b", "c"]);
    q.submit(false); // wrong on "a"
    // "a" must go to the back, not reappear next — "b" is current now.
    expect(q.current()).toBe("b");
    expect(q.getState().queue).toEqual(["b", "c", "a"]);
    // Progress bar does not advance on a wrong answer.
    expect(q.progress()).toEqual({ correctCount: 0, totalCount: 3 });
  });

  it("keeps a re-queued challenge behind challenges answered in between", () => {
    const q = new LessonQueue(["a", "b", "c"]);
    q.submit(false); // a -> requeued: [b, c, a]
    q.submit(true); // b correct: [c, a]
    expect(q.getState().queue).toEqual(["c", "a"]);
    expect(q.current()).toBe("c");
  });

  it("is not complete until every distinct challenge has been answered correctly at least once", () => {
    const q = new LessonQueue(["a", "b"]);
    q.submit(false); // a wrong -> [b, a]
    expect(q.isComplete()).toBe(false);
    q.submit(true); // b correct -> [a]
    expect(q.isComplete()).toBe(false);
    q.submit(true); // a correct (second attempt) -> []
    expect(q.isComplete()).toBe(true);
    expect(q.current()).toBeNull();
  });

  it("only marks a challenge completed once it is eventually answered correctly, however many times it was missed", () => {
    const q = new LessonQueue(["a", "b"]);
    q.submit(false); // a -> [b, a]
    q.submit(false); // b -> [a, b]
    q.submit(false); // a -> [b, a]
    expect(q.progress()).toEqual({ correctCount: 0, totalCount: 2 });
    q.submit(true); // b correct -> [a]
    q.submit(true); // a correct -> []
    expect(q.isComplete()).toBe(true);
    expect(q.progress()).toEqual({ correctCount: 2, totalCount: 2 });
  });

  it("throws when submit is called after the lesson is already complete", () => {
    const q = new LessonQueue(["a"]);
    q.submit(true);
    expect(q.isComplete()).toBe(true);
    expect(() => q.submit(true)).toThrow();
  });

  it("getState returns an immutable snapshot that does not mutate on further submits", () => {
    const q = new LessonQueue(["a", "b"]);
    const snapshotBefore = q.getState();
    q.submit(true);
    expect(snapshotBefore.queue).toEqual(["a", "b"]);
    expect(snapshotBefore.completed).toEqual([]);
  });

  it("handles a full lesson-shaped run (12 challenges) where every even-indexed one is missed once", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `c${i}`);
    const q = new LessonQueue(ids);
    const alreadyFailed = new Set<string>();
    let safety = 0;

    while (!q.isComplete()) {
      const current = q.current();
      if (current === null) break;
      const isEvenIndexed = Number(current.slice(1)) % 2 === 0;
      const shouldFailThisAttempt = isEvenIndexed && !alreadyFailed.has(current);
      if (shouldFailThisAttempt) {
        alreadyFailed.add(current);
        q.submit(false);
      } else {
        q.submit(true);
      }
      safety++;
      if (safety > 1000) throw new Error("runaway loop — re-queue logic likely broken");
    }

    expect(q.isComplete()).toBe(true);
    expect(q.progress()).toEqual({ correctCount: 12, totalCount: 12 });
    // Every even-indexed challenge was actually missed at least once along the way.
    expect(alreadyFailed.size).toBe(6);
  });
});
