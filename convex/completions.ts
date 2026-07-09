// Records ONE ROUND of a lesson completion for a profile: accumulates XP and
// updates the daily-streak state, and reports round progress toward
// LESSON_REQUIRED_ROUNDS (convex/progression.ts) so the client can tell "one more
// round to go" apart from "lesson (all rounds) complete". Contract per the
// coordinating loop's shared-contract spec for "lesson-complete-and-streak",
// extended for crown-level-style repetition.
//
// This is intentionally NOT idempotent-by-lessonSlug anymore: doing the same
// lesson again is now a legitimate, expected action (round 2, round 3, ...), not
// a replay to suppress. The client's own in-flight guard (lesson-host's
// `completing` state) is what prevents an accidental double-submit of the SAME
// round; a rare double-count from a genuine network retry is an acceptable
// tradeoff for a single-family personal app, not something worth a heavier
// dedupe mechanism.

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { LESSON_REQUIRED_ROUNDS } from "./progression";

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

    const priorRounds = await ctx.db
      .query("completions")
      .withIndex("by_profile_lesson", (q) =>
        q.eq("profileId", profileId).eq("lessonSlug", lessonSlug),
      )
      .collect();
    const round = priorRounds.length + 1;

    const today = todayString();

    await ctx.db.insert("completions", {
      profileId,
      lessonSlug,
      round,
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
      round,
      roundsRequired: LESSON_REQUIRED_ROUNDS,
      lessonFullyComplete: round >= LESSON_REQUIRED_ROUNDS,
    };
  },
});
