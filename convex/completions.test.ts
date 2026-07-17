// Proves the recordCompletion contract (see coordinating loop's shared-contract spec,
// extended for crown-level-style repetition): correct XP accumulation, correct streak
// state transitions (first-ever, same-day replay, consecutive-day, gap), and correct
// round counting per profileId+lessonSlug (LESSON_REQUIRED_ROUNDS in convex/progression.ts).
// Uses convex-test's in-memory backend — same pattern as convex/units.test.ts (see that
// file's header comment for why `modules` is hand-built and `anyApi` is used instead of
// the checked-in, possibly-stale convex/_generated/api.ts).
//
// SDK54-DOWNGRADE NOTE: since the project's Expo SDK 57->54 downgrade, jest-expo's babel
// caller always reports `platform: "ios"` (true under both 54 and 57), but SDK 54's
// babel-preset-expo bundles an `import-meta-transform-plugin` that now *throws* instead of
// polyfilling `import.meta` for any non-"web" platform (Hermes safety check). convex-test's
// published dist/index.js contains a single `import.meta.glob(...)` expression, used only
// as a fallback default for its `modules` argument -- a branch this suite never actually
// takes, since (like units.test.ts) `modules` is always hand-built below. But babel parses
// the whole file at transform time regardless of which branches execute at runtime, so the
// mere presence of that syntax anywhere in the file aborts the transform before any test
// code runs. Since `modules` is always supplied explicitly here, it's safe to load a
// version of convex-test with that one unreachable expression replaced by `specifiedModules`
// and compiled with a plain CommonJS-interop transform (no Hermes-import-meta plugin
// involved), instead of letting Jest run the real file through babel-preset-expo.
jest.mock("convex-test", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("node:path");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Module = require("node:module");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const babel = require("@babel/core");

  const entry = require.resolve("convex-test");
  const source = fs.readFileSync(entry, "utf8");
  const marker = 'specifiedModules ?? import.meta.glob("../../../convex/**/*.*s")';
  if (!source.includes(marker)) {
    throw new Error(
      "convex-test's dist/index.js no longer contains the expected import.meta.glob " +
        "fallback expression -- the SDK54-DOWNGRADE NOTE workaround in " +
        "convex/completions.test.ts needs to be re-checked against the new version.",
    );
  }
  const patched = source.replace(marker, "specifiedModules");
  const { code } = babel.transform(patched, {
    filename: entry,
    presets: [],
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
    babelrc: false,
    configFile: false,
  });
  const mod = new Module(entry, module);
  mod.filename = entry;
  mod.paths = Module._nodeModulePaths(path.dirname(entry));
  mod._compile(code, entry);
  return mod.exports;
});

import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import { LESSON_REQUIRED_ROUNDS } from "./progression";

const api = anyApi as unknown as {
  completions: {
    recordCompletion: any;
  };
};

const modules = {
  "schema.ts": () => Promise.resolve(require("./schema")),
  "challengeText.ts": () => Promise.resolve(require("./challengeText")),
  "units.ts": () => Promise.resolve(require("./units")),
  "progression.ts": () => Promise.resolve(require("./progression")),
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
// 1. First completion ever: currentStreak=1, streakIsNew=true, round=1.
// ---------------------------------------------------------------------------

test("first completion sets currentStreak=1, streakIsNew=true, and round=1", async () => {
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
  expect(result.round).toBe(1);
  expect(result.roundsRequired).toBe(LESSON_REQUIRED_ROUNDS);
  expect(result.lessonFullyComplete).toBe(false); // LESSON_REQUIRED_ROUNDS > 1

  const profile = await getProfile(t, profileId);
  expect(profile!.currentStreak).toBe(1);
  expect(profile!.longestStreak).toBe(1);
  expect(profile!.lastActiveDay).toBe(todayString());
  expect(profile!.xpTotal).toBe(10);
});

// ---------------------------------------------------------------------------
// 2. A second completion the SAME day (different lesson): streak unchanged,
//    streakIsNew=false.
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
// 6. Calling recordCompletion again for the SAME profileId+lessonSlug is now a
//    legitimate next round (crown-level-style repetition), not a suppressed
//    replay: it inserts a new row, keeps earning XP, and increments `round`.
// ---------------------------------------------------------------------------

test("calling recordCompletion again for the same lesson records the next round and keeps earning XP", async () => {
  const t = makeT();
  const profileId = await insertProfile(t);

  const first = await t.mutation(api.completions.recordCompletion, {
    profileId,
    lessonSlug: "u1-l1",
    xpEarned: 10,
    accuracy: 1,
    durationSec: 100,
  });
  expect(first.round).toBe(1);
  expect(first.xpEarned).toBe(10);

  const second = await t.mutation(api.completions.recordCompletion, {
    profileId,
    lessonSlug: "u1-l1", // same lesson — this is round 2, not a replay
    xpEarned: 10,
    accuracy: 1,
    durationSec: 100,
  });
  expect(second.round).toBe(2);
  expect(second.xpEarned).toBe(10);

  const profile = await getProfile(t, profileId);
  expect(profile!.xpTotal).toBe(20); // both rounds counted

  const completions = await t.run(async (ctx) => {
    return await ctx.db
      .query("completions")
      .withIndex("by_profile_lesson", (q) =>
        q.eq("profileId", profileId).eq("lessonSlug", "u1-l1"),
      )
      .collect();
  });
  expect(completions.length).toBe(2);
  expect(completions.map((c) => c.round).sort()).toEqual([1, 2]);
});

// ---------------------------------------------------------------------------
// 7. lessonFullyComplete flips to true only once round reaches
//    LESSON_REQUIRED_ROUNDS, not before.
// ---------------------------------------------------------------------------

test("lessonFullyComplete is false until LESSON_REQUIRED_ROUNDS is reached, then true", async () => {
  const t = makeT();
  const profileId = await insertProfile(t);

  let lastResult: any;
  for (let i = 0; i < LESSON_REQUIRED_ROUNDS; i++) {
    lastResult = await t.mutation(api.completions.recordCompletion, {
      profileId,
      lessonSlug: "u1-l1",
      xpEarned: 10,
      accuracy: 1,
      durationSec: 100,
    });
    if (i < LESSON_REQUIRED_ROUNDS - 1) {
      expect(lastResult.lessonFullyComplete).toBe(false);
    }
  }

  expect(lastResult.round).toBe(LESSON_REQUIRED_ROUNDS);
  expect(lastResult.lessonFullyComplete).toBe(true);
});
