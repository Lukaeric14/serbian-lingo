import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Challenge types — SPEC.md §4. select_image and speak are explicitly out of scope.
export const challengeType = v.union(
  v.literal("translate_bank"),
  v.literal("translate_bank_reverse"),
  v.literal("translate_type"),
  v.literal("fill_blank"),
  v.literal("complete_translation"),
  v.literal("mark_meaning"),
  v.literal("match_pairs"),
  v.literal("complete_chat"),
  v.literal("listen_tap"),
  v.literal("listen_type"),
);

export default defineSchema({
  // Two profiles, no login (Dominika + Luka's test profile) — PRD.md.
  profiles: defineTable({
    name: v.string(),
    dailyGoalXp: v.number(),
    xpTotal: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastActiveDay: v.optional(v.string()), // YYYY-MM-DD, device timezone
  }),

  // Stable human-authored `slug` (e.g. "u1") is the real identity — completions and
  // lessons reference it, never the internal _id, so re-seeding never corrupts progress.
  units: defineTable({
    slug: v.string(),
    order: v.number(),
    title: v.string(),
    objective: v.string(),
    sectionTitle: v.string(),
    color: v.string(), // path/banner accent, e.g. "#58CC02"
    approvedAt: v.optional(v.number()), // set only by Luka's native-speaker QA sign-off
    publishedAt: v.optional(v.number()), // set only after approvedAt + audio-completeness checks pass
  }).index("by_slug", ["slug"])
    .index("by_order", ["order"]),

  lessons: defineTable({
    slug: v.string(), // e.g. "u1-l3"
    unitSlug: v.string(),
    order: v.number(),
    kind: v.union(v.literal("lesson"), v.literal("chest")),
  }).index("by_slug", ["slug"])
    .index("by_unit_order", ["unitSlug", "order"]),

  challenges: defineTable({
    slug: v.string(), // e.g. "u1-l3-c07"
    lessonSlug: v.string(),
    order: v.number(),
    type: challengeType,
    // Per-type shape (prompt, accepted answers, distractor pool, etc.) — documented
    // alongside each renderer (item 7); kept as `any` here so content iteration
    // doesn't require a schema migration for every new field.
    payload: v.any(),
    newVocabSlugs: v.array(v.string()),
  }).index("by_slug", ["slug"])
    .index("by_lesson_order", ["lessonSlug", "order"]),

  // Keyed to the EXACT displayed Serbian surface form (inflected), never the lemma —
  // Serbian's 7 cases mean "vodu" and "voda" are different clips. See SPEC.md §2.
  // audioStorageId is required: a row only exists once real synthesis has completed,
  // so "what's missing" is just "which displayed strings have no matching row".
  audioClips: defineTable({
    text: v.string(),
    kind: v.union(v.literal("word"), v.literal("sentence")),
    audioStorageId: v.id("_storage"),
  }).index("by_text", ["text"]),

  // Drives the NEW WORD pill + review docs only — never resolves audio playback
  // (that always goes through audioClips by exact displayed text).
  vocab: defineTable({
    slug: v.string(),
    lemma: v.string(),
    gloss: v.string(),
    introducedInUnit: v.string(), // unit slug
  }).index("by_slug", ["slug"]),

  completions: defineTable({
    profileId: v.id("profiles"),
    lessonSlug: v.string(),
    xpEarned: v.number(),
    accuracy: v.number(),
    durationSec: v.number(),
    day: v.string(), // YYYY-MM-DD
  }).index("by_profile_lesson", ["profileId", "lessonSlug"])
    .index("by_profile_day", ["profileId", "day"]),

  xpEvents: defineTable({
    profileId: v.id("profiles"),
    day: v.string(), // YYYY-MM-DD
    amount: v.number(),
  }).index("by_profile_day", ["profileId", "day"]),
});
