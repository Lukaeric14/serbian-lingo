// Proves convex/path.ts's getPath query: lessons unlock strictly sequentially in
// GLOBAL order across all units, driven by completions rows. Follows the same
// convex-test + hand-built `modules` map pattern as convex/units.test.ts (see that
// file's header comment for why: import.meta.glob isn't available under Jest/Babel).

import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import schema from "./schema";

const api = anyApi as unknown as {
  path: {
    getPath: any;
  };
};

const modules = {
  "schema.ts": () => Promise.resolve(require("./schema")),
  "challengeText.ts": () => Promise.resolve(require("./challengeText")),
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

async function insertCompletion(
  t: ReturnType<typeof makeT>,
  profileId: any,
  lessonSlug: string,
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("completions", {
      profileId,
      lessonSlug,
      xpEarned: 10,
      accuracy: 1,
      durationSec: 60,
      day: "2026-07-09",
    });
  });
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

  expect(allLessons[0]).toMatchObject({ slug: "u1-l1", status: "active" });
  expect(allLessons[1]).toMatchObject({ slug: "u1-l2", status: "locked" });
  expect(allLessons[2]).toMatchObject({ slug: "u2-l1", status: "locked" });
  expect(allLessons[3]).toMatchObject({ slug: "u2-l2", status: "locked" });
});

// ---------------------------------------------------------------------------
// 2. After recording completions, later lessons unlock in strict global order —
//    including crossing a unit boundary (u1-l2 completed -> u2-l1 becomes active).
// ---------------------------------------------------------------------------

test("completed lessons unlock the next lesson in global order, across unit boundaries", async () => {
  const t = makeT();
  await seedUnitsAndLessons(t);
  const profileId = await makeProfile(t);

  await insertCompletion(t, profileId, "u1-l1");
  await insertCompletion(t, profileId, "u1-l2");

  const path = await t.query(api.path.getPath, { profileId });
  const allLessons = path.flatMap((u: any) => u.lessons);

  expect(allLessons[0]).toMatchObject({ slug: "u1-l1", status: "completed" });
  expect(allLessons[1]).toMatchObject({ slug: "u1-l2", status: "completed" });
  // Crossing into unit 2: the next lesson in global order is now active.
  expect(allLessons[2]).toMatchObject({ slug: "u2-l1", status: "active" });
  expect(allLessons[3]).toMatchObject({ slug: "u2-l2", status: "locked" });
});

// ---------------------------------------------------------------------------
// 3. Completing every lesson leaves no "active" node (all completed).
// ---------------------------------------------------------------------------

test("completing every lesson leaves all lessons completed with no active node", async () => {
  const t = makeT();
  await seedUnitsAndLessons(t);
  const profileId = await makeProfile(t);

  for (const slug of ["u1-l1", "u1-l2", "u2-l1", "u2-l2"]) {
    await insertCompletion(t, profileId, slug);
  }

  const path = await t.query(api.path.getPath, { profileId });
  const allLessons = path.flatMap((u: any) => u.lessons);

  expect(allLessons.every((l: any) => l.status === "completed")).toBe(true);
});

// ---------------------------------------------------------------------------
// 4. A different profile's completions don't affect this profile's path (progress
//    is per-profile, not global).
// ---------------------------------------------------------------------------

test("completions are scoped per-profile", async () => {
  const t = makeT();
  await seedUnitsAndLessons(t);
  const profileA = await makeProfile(t);
  const profileB = await makeProfile(t);

  await insertCompletion(t, profileA, "u1-l1");

  const pathA = await t.query(api.path.getPath, { profileId: profileA });
  const pathB = await t.query(api.path.getPath, { profileId: profileB });

  const lessonsA = pathA.flatMap((u: any) => u.lessons);
  const lessonsB = pathB.flatMap((u: any) => u.lessons);

  expect(lessonsA[0]).toMatchObject({ slug: "u1-l1", status: "completed" });
  expect(lessonsA[1]).toMatchObject({ slug: "u1-l2", status: "active" });

  // Profile B has no completions at all — its own first lesson is active.
  expect(lessonsB[0]).toMatchObject({ slug: "u1-l1", status: "active" });
  expect(lessonsB[1]).toMatchObject({ slug: "u1-l2", status: "locked" });
});
