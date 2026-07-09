// Content-seeding pipeline mutations — SPEC.md §2 (publishing rules) and §3 (seed script).
//
// Two deliberately separate mutations:
//   - seedUnit: upserts DRAFT content (unit + lessons + challenges + vocab) by stable slug.
//     Freely re-runnable; never sets publishedAt; never deletes-and-reinserts (patches by
//     _id so references stay stable). Still enforces slug-uniqueness and append-only
//     ordering, because those are seed-time data-integrity concerns, not publish-time
//     editorial concerns.
//   - publishUnit: the actual gate. Only this mutation may set publishedAt, and only after
//     checking (a) approvedAt is set, (b) every required Serbian string has an audioClips
//     row, (c) no slug collisions, (d) append-only ordering for existing lessons.
//
// Keeping these separate makes each independently testable (Part C) and matches the
// product reality: seeding/updating content and deciding to publish it are different
// people/moments (an engineer runs the seed script; Luka approves; publishing is a
// deliberate, explicit act after both).

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { challengeType } from "./schema";
import { requiredAudioTexts, type ChallengeType } from "./challengeText";

// ---------------------------------------------------------------------------
// Input validators — mirror docs/challenge-schema.md's "Lesson-level shape".
// payload itself stays v.any() (matches the challenges table: content iteration
// shouldn't require a schema migration for every new field), but everything
// around it is validated so malformed seed input fails fast with a clear error.
// ---------------------------------------------------------------------------

const challengeInput = v.object({
  slug: v.string(),
  order: v.number(),
  type: challengeType,
  payload: v.any(),
  newVocabSlugs: v.array(v.string()),
});

const lessonInput = v.object({
  slug: v.string(),
  order: v.number(),
  kind: v.union(v.literal("lesson"), v.literal("chest")),
  challenges: v.array(challengeInput),
});

const unitMetaInput = v.object({
  slug: v.string(),
  order: v.number(),
  title: v.string(),
  objective: v.string(),
  sectionTitle: v.string(),
  color: v.string(),
});

const vocabInput = v.object({
  slug: v.string(),
  lemma: v.string(),
  gloss: v.string(),
  introducedInUnit: v.string(),
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Slug-collision check: given a slug and the table/index to look it up in, throws if a
 * document exists under that slug that is NOT the same logical entity we're about to
 * write (i.e. belongs to a different unit than expected, or — for units themselves —
 * simply already exists under a different internal identity than the one we resolved).
 *
 * For seedUnit's own unit/lesson/challenge, "collision" means: the slug already exists
 * AND resolving it forward (unit->lessons, lesson->challenges) would move it under a
 * different parent than before. We implement this inline per-entity below because the
 * exact "what counts as a collision" differs slightly (units: none, since we own the
 * whole unit; lessons/challenges: must not already belong to a *different* unit/lesson).
 */
async function findBySlug<T extends { slug: string }>(
  ctx: MutationCtx | QueryCtx,
  table: "units" | "lessons" | "challenges" | "vocab",
  slug: string,
): Promise<any | null> {
  return await ctx.db
    .query(table as any)
    .withIndex("by_slug", (q: any) => q.eq("slug", slug))
    .unique();
}

// ---------------------------------------------------------------------------
// seedUnit — upsert draft content. Never sets publishedAt.
// ---------------------------------------------------------------------------

export const seedUnit = mutation({
  args: {
    unit: unitMetaInput,
    lessons: v.array(lessonInput),
    vocab: v.array(vocabInput),
  },
  handler: async (ctx, { unit, lessons, vocab }) => {
    // --- slug uniqueness within this call's own payload (cheap, catches authoring bugs
    // before we even touch the DB) ---
    const lessonSlugsInPayload = new Set<string>();
    for (const l of lessons) {
      if (lessonSlugsInPayload.has(l.slug)) {
        throw new Error(`seedUnit: duplicate lesson slug "${l.slug}" within this unit's payload`);
      }
      lessonSlugsInPayload.add(l.slug);
    }
    const challengeSlugsInPayload = new Set<string>();
    for (const l of lessons) {
      for (const c of l.challenges) {
        if (challengeSlugsInPayload.has(c.slug)) {
          throw new Error(
            `seedUnit: duplicate challenge slug "${c.slug}" within this unit's payload`,
          );
        }
        challengeSlugsInPayload.add(c.slug);
      }
    }

    // --- upsert unit (find-or-create by slug; patch, never delete-and-reinsert) ---
    const existingUnit = await findBySlug(ctx, "units", unit.slug);
    let unitId;
    if (existingUnit) {
      // seedUnit NEVER touches approvedAt/publishedAt — those are owned exclusively by
      // the QA sign-off step and publishUnit, respectively. Re-seeding draft content
      // (e.g. a typo fix) must not silently revoke or fabricate a publish/approval state.
      await ctx.db.patch(existingUnit._id, {
        order: unit.order,
        title: unit.title,
        objective: unit.objective,
        sectionTitle: unit.sectionTitle,
        color: unit.color,
      });
      unitId = existingUnit._id;
    } else {
      unitId = await ctx.db.insert("units", {
        slug: unit.slug,
        order: unit.order,
        title: unit.title,
        objective: unit.objective,
        sectionTitle: unit.sectionTitle,
        color: unit.color,
      });
    }

    // --- upsert lessons (append-only ordering enforced even at seed time: a lesson slug
    // that already exists elsewhere in the DB may not change unitSlug/order) ---
    for (const l of lessons) {
      const existingLesson = await findBySlug(ctx, "lessons", l.slug);
      if (existingLesson) {
        if (existingLesson.unitSlug !== unit.slug) {
          throw new Error(
            `seedUnit: lesson slug "${l.slug}" already belongs to unit "${existingLesson.unitSlug}", cannot reassign to "${unit.slug}" (slug collision)`,
          );
        }
        if (existingLesson.order !== l.order) {
          throw new Error(
            `seedUnit: lesson "${l.slug}" already exists with order ${existingLesson.order}; refusing to change to ${l.order} (append-only ordering — existing lessons are immutable in position)`,
          );
        }
        await ctx.db.patch(existingLesson._id, { kind: l.kind });
      } else {
        await ctx.db.insert("lessons", {
          slug: l.slug,
          unitSlug: unit.slug,
          order: l.order,
          kind: l.kind,
        });
      }

      // --- upsert challenges within this lesson ---
      for (const c of l.challenges) {
        const existingChallenge = await findBySlug(ctx, "challenges", c.slug);
        if (existingChallenge) {
          if (existingChallenge.lessonSlug !== l.slug) {
            throw new Error(
              `seedUnit: challenge slug "${c.slug}" already belongs to lesson "${existingChallenge.lessonSlug}", cannot reassign to "${l.slug}" (slug collision)`,
            );
          }
          if (existingChallenge.order !== c.order) {
            throw new Error(
              `seedUnit: challenge "${c.slug}" already exists with order ${existingChallenge.order}; refusing to change to ${c.order} (append-only ordering)`,
            );
          }
          // Content-level fixes (typos, better distractors) ARE allowed under the same id.
          await ctx.db.patch(existingChallenge._id, {
            type: c.type,
            payload: c.payload,
            newVocabSlugs: c.newVocabSlugs,
          });
        } else {
          await ctx.db.insert("challenges", {
            slug: c.slug,
            lessonSlug: l.slug,
            order: c.order,
            type: c.type,
            payload: c.payload,
            newVocabSlugs: c.newVocabSlugs,
          });
        }
      }
    }

    // --- upsert vocab ---
    for (const vEntry of vocab) {
      const existingVocab = await findBySlug(ctx, "vocab", vEntry.slug);
      if (existingVocab) {
        await ctx.db.patch(existingVocab._id, {
          lemma: vEntry.lemma,
          gloss: vEntry.gloss,
          introducedInUnit: vEntry.introducedInUnit,
        });
      } else {
        await ctx.db.insert("vocab", {
          slug: vEntry.slug,
          lemma: vEntry.lemma,
          gloss: vEntry.gloss,
          introducedInUnit: vEntry.introducedInUnit,
        });
      }
    }

    return { unitId };
  },
});

// ---------------------------------------------------------------------------
// Shared read-only assessment — used by both publishUnit (which acts on the result)
// and getPublishStatus (a pure read for the seed script's dry-run report). Keeping
// this in one function means there is exactly one definition of "publish eligible".
// ---------------------------------------------------------------------------

interface PublishAssessment {
  unit: any;
  approved: boolean;
  missingAudioTexts: string[];
  blockingErrors: string[];
}

async function assessUnitForPublish(
  ctx: QueryCtx | MutationCtx,
  unitSlug: string,
): Promise<PublishAssessment> {
  const unit = await findBySlug(ctx, "units", unitSlug);
  if (!unit) {
    throw new Error(`no unit found with slug "${unitSlug}"`);
  }

  const blockingErrors: string[] = [];
  const approved = !!unit.approvedAt;
  if (!approved) {
    blockingErrors.push(
      `unit "${unitSlug}" cannot be published — approvedAt is not set. ` +
        `A native-speaker QA sign-off (approvedAt) must happen before publishing.`,
    );
  }

  const lessons = await ctx.db
    .query("lessons")
    .withIndex("by_unit_order", (q) => q.eq("unitSlug", unitSlug))
    .collect();

  if (lessons.length === 0) {
    blockingErrors.push(`unit "${unitSlug}" has no lessons — nothing to publish.`);
  }

  // (c) slug-collision check across the whole seed: verify every lesson in this unit
  // is exclusively owned by this unit (defensive — seedUnit should already guarantee
  // this, but publish is the last line of defense before this becomes visible content).
  for (const lesson of lessons) {
    if (lesson.unitSlug !== unitSlug) {
      blockingErrors.push(
        `lesson "${lesson.slug}" is associated with unit "${lesson.unitSlug}", not "${unitSlug}" (slug collision)`,
      );
    }
  }

  // (d) append-only ordering — re-verify at publish time too. (seedUnit already
  // enforces this on write, but publishUnit re-checks independently so the guarantee
  // holds even if data was mutated by some other path.)
  const lessonOrders = new Map<number, string>();
  for (const lesson of lessons) {
    const clashSlug = lessonOrders.get(lesson.order);
    if (clashSlug) {
      blockingErrors.push(
        `lessons "${clashSlug}" and "${lesson.slug}" both claim order ${lesson.order} in unit "${unitSlug}"`,
      );
    }
    lessonOrders.set(lesson.order, lesson.slug);
  }

  // (b) audio-completeness — collect every distinct required Serbian string across
  // every challenge in every lesson of this unit, and verify each has an audioClips row.
  const requiredTexts = new Set<string>();
  for (const lesson of lessons) {
    const challenges = await ctx.db
      .query("challenges")
      .withIndex("by_lesson_order", (q) => q.eq("lessonSlug", lesson.slug))
      .collect();

    if (challenges.length === 0) {
      blockingErrors.push(`lesson "${lesson.slug}" has no challenges — cannot publish an empty lesson.`);
    }

    for (const challenge of challenges) {
      if (challenge.lessonSlug !== lesson.slug) {
        blockingErrors.push(
          `challenge "${challenge.slug}" is associated with lesson "${challenge.lessonSlug}", not "${lesson.slug}" (slug collision)`,
        );
      }
      for (const text of requiredAudioTexts(challenge.type as ChallengeType, challenge.payload)) {
        requiredTexts.add(text);
      }
    }
  }

  const missingAudioTexts: string[] = [];
  for (const text of requiredTexts) {
    const clip = await ctx.db
      .query("audioClips")
      .withIndex("by_text", (q) => q.eq("text", text))
      .unique();
    if (!clip) {
      missingAudioTexts.push(text);
    }
  }

  if (missingAudioTexts.length > 0) {
    blockingErrors.push(
      `unit "${unitSlug}" is missing audioClips for ${missingAudioTexts.length} text(s): ` +
        missingAudioTexts.map((t) => JSON.stringify(t)).join(", "),
    );
  }

  return { unit, approved, missingAudioTexts, blockingErrors };
}

// ---------------------------------------------------------------------------
// getPublishStatus — read-only, side-effect-free. Used by scripts/seed.ts to build its
// dry-run eligibility report without risking an accidental publish.
// ---------------------------------------------------------------------------

export const getPublishStatus = query({
  args: { unitSlug: v.string() },
  handler: async (ctx, { unitSlug }) => {
    const { approved, missingAudioTexts, blockingErrors } = await assessUnitForPublish(
      ctx,
      unitSlug,
    );
    return {
      approved,
      missingAudioTexts,
      eligible: blockingErrors.length === 0,
      blockingErrors,
    };
  },
});

// ---------------------------------------------------------------------------
// publishUnit — the actual gate. Only mutation allowed to set publishedAt.
// ---------------------------------------------------------------------------

export const publishUnit = mutation({
  args: { unitSlug: v.string() },
  handler: async (ctx, { unitSlug }) => {
    const { unit, blockingErrors } = await assessUnitForPublish(ctx, unitSlug);

    if (blockingErrors.length > 0) {
      throw new Error(`publishUnit: refused — ${blockingErrors.join(" | ")}`);
    }

    await ctx.db.patch(unit._id, { publishedAt: Date.now() });
    return { unitId: unit._id, publishedAt: true };
  },
});
