// Path screen data — SPEC.md §6 (Path screen) and docs/ui-reference.md's
// "Home / learning path" anatomy.
//
// Lessons unlock strictly sequentially in GLOBAL order across all units (not
// per-unit): walk every unit in `order`, and within each unit every lesson in
// `order`, tracking the first lesson that hasn't reached LESSON_REQUIRED_ROUNDS
// completions rows for this profile yet (crown-level-style repetition — one pass
// isn't enough). That lesson (and only that one) is "active"; everything before
// it is "completed"; everything after it is "locked".

import { query } from "./_generated/server";
import { v } from "convex/values";
import { LESSON_REQUIRED_ROUNDS } from "./progression";

export const getPath = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const units = await ctx.db
      .query("units")
      .withIndex("by_order")
      .collect();

    // All of this profile's completions, counted per lessonSlug — a lesson is
    // only "done" once its round count reaches LESSON_REQUIRED_ROUNDS.
    const completions = await ctx.db
      .query("completions")
      .withIndex("by_profile_lesson", (q) => q.eq("profileId", profileId))
      .collect();
    const roundsBySlug = new Map<string, number>();
    for (const c of completions) {
      roundsBySlug.set(c.lessonSlug, (roundsBySlug.get(c.lessonSlug) ?? 0) + 1);
    }

    // First pass: has the global "active" lesson been assigned yet?
    let activeAssigned = false;

    const result = [];
    for (const unit of units) {
      const lessons = await ctx.db
        .query("lessons")
        .withIndex("by_unit_order", (q) => q.eq("unitSlug", unit.slug))
        .collect();

      const lessonsWithStatus = lessons
        .sort((a, b) => a.order - b.order)
        .map((lesson) => {
          const roundsCompleted = roundsBySlug.get(lesson.slug) ?? 0;
          let status: "completed" | "active" | "locked";
          if (roundsCompleted >= LESSON_REQUIRED_ROUNDS) {
            status = "completed";
          } else if (!activeAssigned) {
            status = "active";
            activeAssigned = true;
          } else {
            status = "locked";
          }
          return {
            slug: lesson.slug,
            order: lesson.order,
            kind: lesson.kind,
            status,
            roundsCompleted,
            roundsRequired: LESSON_REQUIRED_ROUNDS,
          };
        });

      result.push({
        slug: unit.slug,
        title: unit.title,
        objective: unit.objective,
        sectionTitle: unit.sectionTitle,
        color: unit.color,
        order: unit.order,
        lessons: lessonsWithStatus,
      });
    }

    return result.sort((a, b) => a.order - b.order);
  },
});
