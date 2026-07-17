// Proves convex/path.ts's getPath query: lessons unlock strictly sequentially in
// GLOBAL order across all units, gated on LESSON_REQUIRED_ROUNDS completions rows per
// lesson (crown-level-style repetition — one pass through a lesson isn't enough to
// unlock the next one). Follows the same convex-test + hand-built `modules` map
// pattern as convex/units.test.ts (see that file's header comment for why:
// import.meta.glob isn't available under Jest/Babel).

import { anyApi } from "convex/server";
import schema from "./schema";
import { LESSON_REQUIRED_ROUNDS } from "./progression";
import { loadConvexTest } from "./loadConvexTest";

// convex-test is loaded via loadConvexTest() to bypass Jest's Babel transform — SDK 54's
// babel-preset-expo hard-throws parsing convex-test's dist/index.js. See that file's
// header comment for the full explanation.
const { convexTest } = loadConvexTest();

const api = anyApi as unknown as {
  path: {
    getPath: any;
  };
};

const modules = {
  "schema.ts": () => Promise.resolve(require("./schema")),
  "challengeText.ts": () => Promise.resolve(require("./challengeText")),
  "progression.ts": () => Promise.resolve(require("./progression")),
  "path.ts": () => Promise.resolve(require("./path")),
  "_generated/server.js": () => Promise.resolve(require("./_generated/server")),
};

function makeT() {
  return convexTest(schema, modules);
}

// ---------------------------------------------------------------------------
// Fixture: two units, two lessons each, seeded directly via ctx.db.insert (this
// module only reads — there's no path.ts mutation to seed through, and mirroring
// units.test.ts's own db.insert seeding keeps this test independent of units.ts).
// ---------------------------------------------------------------------------

async function makeProfile(t: ReturnType<typeof makeT>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("profiles", {
      name: "Test Profile",
      dailyGoalXp: 20,
      xpTotal: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
  });
}

async function seedUnitsAndLessons(t: ReturnType<typeof makeT>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("units", {
      slug: "u1",
      order: 1,
      title: "Use basic phrases",
      objective: "Greet people.",
      sectionTitle: "Section 1, Unit 1",
      color: "#58CC02",
    });
    await ctx.db.insert("units", {
      slug: "u2",
      order: 2,
      title: "Talk about family",
      objective: "Introduce family members.",
      sectionTitle: "Section 1, Unit 2",
      color: "#1CB0F6",
    });

    await ctx.db.insert("lessons", { slug: "u1-l1", unitSlug: "u1", order: 1, kind: "lesson" });
    await ctx.db.insert("lessons", { slug: "u1-l2", unitSlug: "u1", order: 2, kind: "lesson" });
    await ctx.db.insert("lessons", { slug: "u2-l1", unitSlug: "u2", order: 1, kind: "lesson" });
    await ctx.db.insert("lessons", { slug: "u2-l2", unitSlug: "u2", order: 2, kind: "lesson" });
  });
}

/** Inserts one completions row (one round) for lessonSlug, at the next round number. */
async function insertRound(
  t: ReturnType<typeof makeT>,
  profileId: any,
  lessonSlug: string,
  round: number,
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("completions", {
      profileId,
      lessonSlug,
      round,
      xpEarned: 10,
      accuracy: 1,
      durationSec: 60,
      day: "2026-07-09",
    });
  });
}

/** Inserts LESSON_REQUIRED_ROUNDS rows for lessonSlug — fully completes it. */
async function completeLesson(t: ReturnType<typeof makeT>, profileId: any, lessonSlug: string) {
  for (let round = 1; round <= LESSON_REQUIRED_ROUNDS; round++) {
    await insertRound(t, profileId, lessonSlug, round);
  }
}

// ---------------------------------------------------------------------------
// 1. Zero completions: the very first lesson (global order) is "active", every
//    other lesson (in this unit and later units) is "locked".
// ---------------------------------------------------------------------------

test("with zero completions, the first lesson is active and the rest are locked", async () => {
  const t = makeT();
  await seedUnitsAndLessons(t);
  const profileId = await makeProfile(t);

  const path = await t.query(api.path.getPath, { profileId });

  expect(path).toHaveLength(2);
  expect(path[0].slug).toBe("u1");
  expect(path[1].slug).toBe("u2");

  const allLessons = path.flatMap((u: any) => u.lessons);
  expect(allLessons).toHaveLength(4);

  expect(allLessons[0]).toMatchObject({ slug: "u1-l1", status: "active", roundsCompleted: 0 });
  expect(allLessons[1]).toMatchObject({ slug: "u1-l2", status: "locked" });
  expect(allLessons[2]).toMatchObject({ slug: "u2-l1", status: "locked" });
  expect(allLessons[3]).toMatchObject({ slug: "u2-l2", status: "locked" });
  expect(allLessons.every((l: any) => l.roundsRequired === LESSON_REQUIRED_ROUNDS)).toBe(true);
});

// ---------------------------------------------------------------------------
// 2. A lesson with SOME but not all required rounds stays "active" (not
//    "completed", not "locked"), reporting how many rounds are done so far.
// ---------------------------------------------------------------------------

test("a lesson with fewer than the required rounds stays active, not completed", async () => {
  const t = makeT();
  await seedUnitsAndLessons(t);
  const profileId = await makeProfile(t);

  // One round short of LESSON_REQUIRED_ROUNDS.
  for (let round = 1; round < LESSON_REQUIRED_ROUNDS; round++) {
    await insertRound(t, profileId, "u1-l1", round);
  }

  const path = await t.query(api.path.getPath, { profileId });
  const allLessons = path.flatMap((u: any) => u.lessons);

  expect(allLessons[0]).toMatchObject({
    slug: "u1-l1",
    status: "active",
    roundsCompleted: LESSON_REQUIRED_ROUNDS - 1,
  });
  // The next lesson must stay locked — u1-l1 hasn't unlocked it yet.
  expect(allLessons[1]).toMatchObject({ slug: "u1-l2", status: "locked" });
});

// ---------------------------------------------------------------------------
// 3. Reaching LESSON_REQUIRED_ROUNDS on a lesson unlocks the next lesson in
//    global order — including crossing a unit boundary.
// ---------------------------------------------------------------------------

test("reaching the required rounds unlocks the next lesson in global order, across unit boundaries", async () => {
  const t = makeT();
  await seedUnitsAndLessons(t);
  const profileId = await makeProfile(t);

  await completeLesson(t, profileId, "u1-l1");
  await completeLesson(t, profileId, "u1-l2");

  const path = await t.query(api.path.getPath, { profileId });
  const allLessons = path.flatMap((u: any) => u.lessons);

  expect(allLessons[0]).toMatchObject({
    slug: "u1-l1",
    status: "completed",
    roundsCompleted: LESSON_REQUIRED_ROUNDS,
  });
  expect(allLessons[1]).toMatchObject({ slug: "u1-l2", status: "completed" });
  // Crossing into unit 2: the next lesson in global order is now active.
  expect(allLessons[2]).toMatchObject({ slug: "u2-l1", status: "active", roundsCompleted: 0 });
  expect(allLessons[3]).toMatchObject({ slug: "u2-l2", status: "locked" });
});

// ---------------------------------------------------------------------------
// 4. Fully completing every lesson leaves no "active" node (all completed).
// ---------------------------------------------------------------------------

test("fully completing every lesson leaves all lessons completed with no active node", async () => {
  const t = makeT();
  await seedUnitsAndLessons(t);
  const profileId = await makeProfile(t);

  for (const slug of ["u1-l1", "u1-l2", "u2-l1", "u2-l2"]) {
    await completeLesson(t, profileId, slug);
  }

  const path = await t.query(api.path.getPath, { profileId });
  const allLessons = path.flatMap((u: any) => u.lessons);

  expect(allLessons.every((l: any) => l.status === "completed")).toBe(true);
});

// ---------------------------------------------------------------------------
// 5. A different profile's completions don't affect this profile's path (progress
//    is per-profile, not global).
// ---------------------------------------------------------------------------

test("completions are scoped per-profile", async () => {
  const t = makeT();
  await seedUnitsAndLessons(t);
  const profileA = await makeProfile(t);
  const profileB = await makeProfile(t);

  await completeLesson(t, profileA, "u1-l1");

  const pathA = await t.query(api.path.getPath, { profileId: profileA });
  const pathB = await t.query(api.path.getPath, { profileId: profileB });

  const lessonsA = pathA.flatMap((u: any) => u.lessons);
  const lessonsB = pathB.flatMap((u: any) => u.lessons);

  expect(lessonsA[0]).toMatchObject({ slug: "u1-l1", status: "completed" });
  expect(lessonsA[1]).toMatchObject({ slug: "u1-l2", status: "active" });

  // Profile B has no completions at all — its own first lesson is active.
  expect(lessonsB[0]).toMatchObject({ slug: "u1-l1", status: "active", roundsCompleted: 0 });
  expect(lessonsB[1]).toMatchObject({ slug: "u1-l2", status: "locked" });
});
