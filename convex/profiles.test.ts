// Proves ensureDefaultProfiles is idempotent (PRD.md "Two profiles, no login") against
// convex-test's in-memory backend — no live Convex deployment or network access required.
// See convex/units.test.ts for the established pattern this file follows (hand-built
// `modules` map, `anyApi` instead of the stale generated api.ts).

import { anyApi } from "convex/server";
import schema from "./schema";

// convex-test must be loaded bypassing Jest's Babel transform (see loadConvexTest below):
// under the SDK 54 toolchain, babel-preset-expo ships a new import-meta-transform-plugin
// that hard-throws on any `import.meta` for non-web callers unless
// `unstable_transformImportMeta` is set — and convex-test/dist/index.js's fallback default
// (`specifiedModules ?? import.meta.glob(...)`) trips it at *parse* time, before the
// `??` even matters at runtime. This isn't a convex-test or profiles.ts bug: plain Node
// (and SDK 57's babel-preset-expo, which has no such plugin) load the same file fine.
const { convexTest } = loadConvexTest();

// Loads convex-test's real, unmodified dist/index.js through Node's own CJS module
// system instead of Jest's module registry, so Babel/babel-preset-expo never sees it.
// package.json's transformIgnorePatterns intentionally whitelists "convex-test" for
// transform (it needs ESM->CJS conversion in the general case), so this can't be fixed
// via jest config from inside this file — this loader is the test-file-local workaround.
function loadConvexTest(): typeof import("convex-test") {
  const fs = require("fs");
  const path = require("path");
  const Module = require("module");

  const fullPath = require.resolve("convex-test");
  const source = fs.readFileSync(fullPath, "utf8");
  const mod = new Module(fullPath, module);
  mod.filename = fullPath;
  mod.paths = Module._nodeModulePaths(path.dirname(fullPath));
  mod._compile(source, fullPath);
  return mod.exports;
}

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
