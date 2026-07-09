// Proves the recordCompletion contract (see coordinating loop's shared-contract spec):
// idempotent per profileId+lessonSlug, correct XP accumulation, correct streak state
// transitions (first-ever, same-day replay, consecutive-day, gap). Uses convex-test's
// in-memory backend — same pattern as convex/units.test.ts (see that file's header
// comment for why `modules` is hand-built and `anyApi` is used instead of the
// checked-in, possibly-stale convex/_generated/api.ts).

import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

const api = anyApi as unknown as {
  completions: {
    recordCompletion: any;
  };
};

const modules = {
  "schema.ts": () => Promise.resolve(require("./schema")),
  "challengeText.ts": () => Promise.resolve(require("./challengeText")),
  "units.ts": () => Promise.resolve(require("./units")),
  "completions.ts": () => Promise.resolve(require("./completions")),
  "_generated/server.js": () => Promise.resolve(require("./_generated/server")),
};

function makeT() {
  return convexTest(schema, modules);
}

async function insertProfile(
  t: ReturnType<typeof makeT>,
  overrides: Partial<{
    name: string;
    dailyGoalXp: number;
    xpTotal: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDay: string | undefined;
  }> = {},
): Promise<Id<"profiles">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("profiles", {
      name: overrides.name ?? "Test Profile",
      dailyGoalXp: overrides.dailyGoalXp ?? 20,
      xpTotal: overrides.xpTotal ?? 0,
      currentStreak: overrides.currentStreak ?? 0,
      longestStreak: overrides.longestStreak ?? 0,
      lastActiveDay: overrides.lastActiveDay,
    });
  });
}

async function getProfile(t: ReturnType<typeof makeT>, profileId: Id<"profiles">) {
  return await t.run(async (ctx) => await ctx.db.get(profileId));
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// 1. First completion ever: currentStreak=1, streakIsNew=true.
// ---------------------------------------------------------------------------

test("first completion sets currentStreak=1 and streakIsNew=true", async () => {
  const t = makeT();
  const profileId = await insertProfile(t); // lastActiveDay undefined

  const result = await t.mutation(api.completions.recordCompletion, {
    profileId,
    lessonSlug: "u1-l1",
    xpEarned: 10,
    accuracy: 1,
    durationSec: 120,
  });

  expect(result.newStreak).toBe(1);
  expect(result.streakIsNew).toBe(true);
  expect(result.xpEarned).toBe(10);

  const profile = await getProfile(t, profileId);
  expect(profile!.currentStreak).toBe(1);
  expect(profile!.longestStreak).toBe(1);
  expect(profile!.lastActiveDay).toBe(todayString());
  expect(profile!.xpTotal).toBe(10);
});

// ---------------------------------------------------------------------------
// 2. A second completion the SAME day: streak unchanged, streakIsNew=false.
// ---------------------------------------------------------------------------

test("a second completion the same day leaves streak unchanged and streakIsNew=false", async () => {
  const t = makeT();
  const profileId = await insertProfile(t, {
    currentStreak: 1,
    longestStreak: 1,
    lastActiveDay: todayString(),
  });

  const result = await t.mutation(api.completions.recordCompletion, {
    profileId,
    lessonSlug: "u1-l2",
    xpEarned: 10,
    accuracy: 1,
    durationSec: 90,
  });

  expect(result.newStreak).toBe(1);
  expect(result.streakIsNew).toBe(false);

  const profile = await getProfile(t, profileId);
  expect(profile!.currentStreak).toBe(1);
  expect(profile!.lastActiveDay).toBe(todayString());
});

// ---------------------------------------------------------------------------
// 3. A completion the day AFTER lastActiveDay: increments currentStreak, streakIsNew=true.
// ---------------------------------------------------------------------------

test("a completion the day after lastActiveDay increments currentStreak and sets streakIsNew=true", async () => {
  const t = makeT();
  const profileId = await insertProfile(t, {
    currentStreak: 3,
    longestStreak: 5,
    lastActiveDay: daysAgo(1), // yesterday
  });

  const result = await t.mutation(api.completions.recordCompletion, {
    profileId,
    lessonSlug: "u2-l1",
    xpEarned: 15,
    accuracy: 0.9,
    durationSec: 150,
  });

  expect(result.newStreak).toBe(4);
  expect(result.streakIsNew).toBe(true);

  const profile = await getProfile(t, profileId);
  expect(profile!.currentStreak).toBe(4);
  expect(profile!.longestStreak).toBe(5); // unchanged, still higher than 4
  expect(profile!.lastActiveDay).toBe(todayString());
});

// ---------------------------------------------------------------------------
// 4. A completion with a >1-day gap resets currentStreak to 1.
// ---------------------------------------------------------------------------

test("a completion with a >1-day gap resets currentStreak to 1", async () => {
  const t = makeT();
  const profileId = await insertProfile(t, {
    currentStreak: 10,
    longestStreak: 10,
    lastActiveDay: daysAgo(5),
  });

  const result = await t.mutation(api.completions.recordCompletion, {
    profileId,
    lessonSlug: "u3-l1",
    xpEarned: 10,
    accuracy: 1,
    durationSec: 100,
  });

  expect(result.newStreak).toBe(1);
  expect(result.streakIsNew).toBe(true);

  const profile = await getProfile(t, profileId);
  expect(profile!.currentStreak).toBe(1);
  expect(profile!.longestStreak).toBe(10); // longest is preserved, not reset
});

// ---------------------------------------------------------------------------
// 5. xpTotal accumulates correctly across multiple calls.
// ---------------------------------------------------------------------------

test("xpTotal accumulates correctly across calls", async () => {
  const t = makeT();
  const profileId = await insertProfile(t, { xpTotal: 5 });

  await t.mutation(api.completions.recordCompletion, {
    profileId,
    lessonSlug: "u1-l1",
    xpEarned: 10,
    accuracy: 1,
    durationSec: 100,
  });
  await t.mutation(api.completions.recordCompletion, {
    profileId,
    lessonSlug: "u1-l2",
    xpEarned: 15,
    accuracy: 0.8,
    durationSec: 110,
  });

  const profile = await getProfile(t, profileId);
  expect(profile!.xpTotal).toBe(5 + 10 + 15);
});

// ---------------------------------------------------------------------------
// 6. Calling twice with the same profileId+lessonSlug only inserts one completions
//    row and does not double-add XP.
// ---------------------------------------------------------------------------

test("calling recordCompletion twice with the same profileId+lessonSlug is idempotent", async () => {
  const t = makeT();
  const profileId = await insertProfile(t);

  const first = await t.mutation(api.completions.recordCompletion, {
    profileId,
    lessonSlug: "u1-l1",
    xpEarned: 10,
    accuracy: 1,
    durationSec: 100,
  });
  expect(first.xpEarned).toBe(10);
  expect(first.streakIsNew).toBe(true);

  const second = await t.mutation(api.completions.recordCompletion, {
    profileId,
    lessonSlug: "u1-l1", // same lesson
    xpEarned: 10,
    accuracy: 1,
    durationSec: 100,
  });
  // Replay: no XP re-added, no streak re-trigger.
  expect(second.xpEarned).toBe(0);
  expect(second.streakIsNew).toBe(false);

  const profile = await getProfile(t, profileId);
  expect(profile!.xpTotal).toBe(10); // not 20

  const completions = await t.run(async (ctx) => {
    return await ctx.db
      .query("completions")
      .withIndex("by_profile_lesson", (q) =>
        q.eq("profileId", profileId).eq("lessonSlug", "u1-l1"),
      )
      .collect();
  });
  expect(completions.length).toBe(1);
});
