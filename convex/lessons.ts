// Minimal read query for the lesson-playing screen (src/app/lesson/[lessonSlug].tsx).
// SPEC.md §4/§6 — the lesson host needs a single lesson's challenges, ordered, to build
// its LessonQueue. Everything else about lessons (unlocking, path assembly) belongs to
// convex/path.ts, not here.

import { query } from "./_generated/server";
import { v } from "convex/values";

export const getLessonChallenges = query({
  args: { lessonSlug: v.string() },
  handler: async (ctx, { lessonSlug }) => {
    const challenges = await ctx.db
      .query("challenges")
      .withIndex("by_lesson_order", (q) => q.eq("lessonSlug", lessonSlug))
      .collect();

    return challenges
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        slug: c.slug,
        order: c.order,
        type: c.type,
        payload: c.payload,
      }));
  },
});
