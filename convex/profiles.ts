// Profile management — PRD.md's "Two profiles, no login": Dominika's real profile
// plus a test profile for Luka so he never touches her streak/XP. See SPEC.md §2
// for the `profiles` table shape.

import { mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Default profile fixtures — created once, idempotently, by ensureDefaultProfiles.
// ---------------------------------------------------------------------------

const DEFAULT_PROFILES = [
  { name: "Dominika" },
  { name: "Luka (test)" },
] as const;

const DEFAULT_STATS = {
  dailyGoalXp: 20,
  xpTotal: 0,
  currentStreak: 0,
  longestStreak: 0,
};

// ---------------------------------------------------------------------------
// ensureDefaultProfiles — idempotent: only inserts a profile whose exact name
// doesn't already exist. Called once from the ProfilePicker screen on mount, so
// re-mounting (or re-running) never duplicates profiles.
// ---------------------------------------------------------------------------

export const ensureDefaultProfiles = mutation({
  args: {},
  handler: async (ctx) => {
    for (const { name } of DEFAULT_PROFILES) {
      const existing = await ctx.db
        .query("profiles")
        .filter((q) => q.eq(q.field("name"), name))
        .unique();
      if (!existing) {
        await ctx.db.insert("profiles", {
          name,
          ...DEFAULT_STATS,
        });
      }
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// listProfiles — returns all profile docs as-is (id via _id).
// ---------------------------------------------------------------------------

export const listProfiles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("profiles").collect();
  },
});
