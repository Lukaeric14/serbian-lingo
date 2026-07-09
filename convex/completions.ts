// Records a lesson completion for a profile: idempotent per profileId+lessonSlug,
// accumulates XP, and updates the daily-streak state. Contract per the coordinating
// loop's shared-contract spec for "lesson-complete-and-streak".
//
// Idempotency matters because the client may replay this call (e.g. a flaky network
// retry, or the user backgrounding the app mid-navigation right after the mutation
// fires) — a replay must never double-count XP or double-bump the streak.

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/** YYYY-MM-DD in device-agnostic UTC — matches profiles.lastActiveDay / xpEvents.day. */
function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Is `day` exactly one calendar day before `today` (both YYYY-MM-DD, UTC)? */
function isYesterday(day: string, today: string): boolean {
  const dayDate = new Date(`${day}T00:00:00.000Z`);
  const todayDate = new Date(`${today}T00:00:00.000Z`);
  const diffMs = todayDate.getTime() - dayDate.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return diffMs === oneDayMs;
}

export const recordCompletion = mutation({
  args: {
    profileId: v.id("profiles"),
    lessonSlug: v.string(),
    xpEarned: v.number(),
    accuracy: v.number(),
    durationSec: v.number(),
  },
  handler: async (ctx, { profileId, lessonSlug, xpEarned, accuracy, durationSec }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) {
      throw new Error(`recordCompletion: no profile found with id "${profileId}"`);
    }

    // --- idempotency: a completions row already exists for this profile+lesson ---
    const existing = await ctx.db
      .query("completions")
      .withIndex("by_profile_lesson", (q) =>
        q.eq("profileId", profileId).eq("lessonSlug", lessonSlug),
      )
      .unique();

    if (existing) {
      // Replay — do nothing (no double-count, no double streak bump). Report the
      // CURRENT state so the caller still gets a coherent response, but streakIsNew
      // is always false on a replay since this call did not just change anything.
      return {
        xpEarned: 0,
        newStreak: profile.currentStreak,
        streakIsNew: false,
      };
    }

    const today = todayString();

    await ctx.db.insert("completions", {
      profileId,
      lessonSlug,
      xpEarned,
      accuracy,
      durationSec,
      day: today,
    });

    await ctx.db.insert("xpEvents", {
      profileId,
      day: today,
      amount: xpEarned,
    });

    // --- streak update ---
    const lastActiveDay = profile.lastActiveDay;
    let newStreak: number;
    const streakIsNew = lastActiveDay !== today; // this call is the first completion today

    if (lastActiveDay === today) {
      newStreak = profile.currentStreak;
    } else if (lastActiveDay !== undefined && isYesterday(lastActiveDay, today)) {
      newStreak = profile.currentStreak + 1;
    } else {
      // Gap of >1 day, or first completion ever.
      newStreak = 1;
    }

    const newLongestStreak = Math.max(profile.longestStreak, newStreak);

    await ctx.db.patch(profileId, {
      xpTotal: profile.xpTotal + xpEarned,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastActiveDay: today,
    });

    return {
      xpEarned,
      newStreak,
      streakIsNew,
    };
  },
});
