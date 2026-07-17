// Proves ensureDefaultProfiles is idempotent (PRD.md "Two profiles, no login") against
// convex-test's in-memory backend — no live Convex deployment or network access required.
// See convex/units.test.ts for the established pattern this file follows (hand-built
// `modules` map, `anyApi` instead of the stale generated api.ts).

import { anyApi } from "convex/server";
import schema from "./schema";
import { loadConvexTest } from "./loadConvexTest";

// convex-test is loaded via loadConvexTest() to bypass Jest's Babel transform — SDK 54's
// babel-preset-expo hard-throws parsing convex-test's dist/index.js. See that file's
// header comment for the full explanation.
const { convexTest } = loadConvexTest();

const api = anyApi as unknown as {
  profiles: {
    ensureDefaultProfiles: any;
    listProfiles: any;
  };
};

// Plain `require` (not dynamic `import()`) — matches convex/units.test.ts: this project's
// Jest runs under Babel's CJS transform without --experimental-vm-modules.
const modules = {
  "schema.ts": () => Promise.resolve(require("./schema")),
  "profiles.ts": () => Promise.resolve(require("./profiles")),
  "_generated/server.js": () => Promise.resolve(require("./_generated/server")),
};

function makeT() {
  return convexTest(schema, modules);
}

// ---------------------------------------------------------------------------
// 1. ensureDefaultProfiles is idempotent: calling it twice yields exactly 2
//    profiles, not 4.
// ---------------------------------------------------------------------------

test("ensureDefaultProfiles is idempotent — calling it twice yields exactly 2 profiles", async () => {
  const t = makeT();

  await t.mutation(api.profiles.ensureDefaultProfiles, {});
  await t.mutation(api.profiles.ensureDefaultProfiles, {});

  const profiles = await t.run(async (ctx) => {
    return await ctx.db.query("profiles").collect();
  });

  expect(profiles).toHaveLength(2);
  const names = profiles.map((p) => p.name).sort();
  expect(names).toEqual(["Dominika", "Luka (test)"]);
});

// ---------------------------------------------------------------------------
// 2. Default stats match the contract: dailyGoalXp 20, xpTotal 0, currentStreak 0,
//    longestStreak 0.
// ---------------------------------------------------------------------------

test("ensureDefaultProfiles creates profiles with the correct default stats", async () => {
  const t = makeT();
  await t.mutation(api.profiles.ensureDefaultProfiles, {});

  const profiles = await t.run(async (ctx) => {
    return await ctx.db.query("profiles").collect();
  });

  for (const profile of profiles) {
    expect(profile.dailyGoalXp).toBe(20);
    expect(profile.xpTotal).toBe(0);
    expect(profile.currentStreak).toBe(0);
    expect(profile.longestStreak).toBe(0);
  }
});

// ---------------------------------------------------------------------------
// 3. It only creates a profile whose exact name doesn't already exist — a
//    pre-existing "Dominika" (e.g. with progress) is left untouched, but "Luka
//    (test)" still gets created.
// ---------------------------------------------------------------------------

test("ensureDefaultProfiles does not touch a pre-existing profile with the same name", async () => {
  const t = makeT();

  const existingId = await t.run(async (ctx) => {
    return await ctx.db.insert("profiles", {
      name: "Dominika",
      dailyGoalXp: 20,
      xpTotal: 999,
      currentStreak: 7,
      longestStreak: 10,
    });
  });

  await t.mutation(api.profiles.ensureDefaultProfiles, {});

  const profiles = await t.run(async (ctx) => {
    return await ctx.db.query("profiles").collect();
  });

  expect(profiles).toHaveLength(2);
  const dominika = profiles.find((p) => p.name === "Dominika");
  expect(dominika!._id).toBe(existingId);
  expect(dominika!.xpTotal).toBe(999); // untouched, not reset to 0
  expect(dominika!.currentStreak).toBe(7);

  const lukaTest = profiles.find((p) => p.name === "Luka (test)");
  expect(lukaTest).toBeDefined();
  expect(lukaTest!.xpTotal).toBe(0);
});

// ---------------------------------------------------------------------------
// 4. listProfiles returns all profile docs as-is, including _id and every stat field.
// ---------------------------------------------------------------------------

test("listProfiles returns all profile docs with id and stats", async () => {
  const t = makeT();
  await t.mutation(api.profiles.ensureDefaultProfiles, {});

  const profiles = await t.query(api.profiles.listProfiles, {});

  expect(profiles).toHaveLength(2);
  for (const profile of profiles) {
    expect(profile._id).toBeDefined();
    expect(typeof profile.name).toBe("string");
    expect(typeof profile.xpTotal).toBe("number");
    expect(typeof profile.currentStreak).toBe("number");
    expect(typeof profile.longestStreak).toBe("number");
    expect(typeof profile.dailyGoalXp).toBe("number");
  }
});
