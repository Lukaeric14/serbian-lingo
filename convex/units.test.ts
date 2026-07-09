// Proves (not just documents) the publishing-safety rules from SPEC.md §2, enforced by
// convex/units.ts's seedUnit + publishUnit mutations, against convex-test's in-memory
// backend — no live Convex deployment or network access required.
//
// convex-test's `modules` param normally comes from Vite's `import.meta.glob`, which
// isn't available under Jest's CJS/Babel transform. We build the equivalent map by hand:
// a flat object of relative-path -> lazy-import function, covering every file under
// convex/ (matching what `import.meta.glob("./convex/**/*.*s")` would produce). Only the
// presence of a "_generated" path segment matters for convex-test to find its root, so
// "_generated/server.js" satisfies that even though there's no server.ts source file.

import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import schema from "./schema";

// The checked-in convex/_generated/api.ts is only refreshed by a live `npx convex dev`
// codegen run, so (like scripts/seed.ts) this test uses `anyApi` for call-site function
// references rather than depending on that generated file being current.
const api = anyApi as unknown as {
  units: {
    seedUnit: any;
    publishUnit: any;
    getPublishStatus: any;
  };
};

// Plain `require` (not dynamic `import()`) — this project's Jest runs under Babel's CJS
// transform without `--experimental-vm-modules`, so `import()` inside a Jest test file
// throws ("A dynamic import callback was invoked without --experimental-vm-modules").
// `require` gives convex-test the same "call a function, get the module" shape it needs.
const modules = {
  "schema.ts": () => Promise.resolve(require("./schema")),
  "challengeText.ts": () => Promise.resolve(require("./challengeText")),
  "units.ts": () => Promise.resolve(require("./units")),
  "_generated/server.js": () => Promise.resolve(require("./_generated/server")),
};

function makeT() {
  return convexTest(schema, modules);
}

// ---------------------------------------------------------------------------
// Fixture builders — small synthetic content, not the real 90-challenge units.
// ---------------------------------------------------------------------------

function draftUnit(overrides: Partial<{ slug: string; order: number }> = {}) {
  return {
    slug: overrides.slug ?? "t1",
    order: overrides.order ?? 1,
    title: "Test Unit",
    objective: "Say hello.",
    sectionTitle: "Section 1",
    color: "#58CC02",
  };
}

function draftLessons(unitSlug: string) {
  return [
    {
      slug: `${unitSlug}-l1`,
      order: 1,
      kind: "lesson" as const,
      challenges: [
        {
          slug: `${unitSlug}-l1-c01`,
          order: 1,
          type: "translate_bank" as const,
          payload: {
            promptText: "Zdravo!",
            correctAnswer: "Hello!",
            wordBank: ["Hello!", "Goodbye!"],
          },
          newVocabSlugs: ["zdravo"],
        },
        {
          slug: `${unitSlug}-l1-c02`,
          order: 2,
          type: "listen_type" as const,
          payload: {
            audioText: "Voda",
            correctAnswer: "Voda",
          },
          newVocabSlugs: ["voda"],
        },
      ],
    },
  ];
}

function draftVocab(unitSlug: string) {
  return [
    { slug: "zdravo", lemma: "zdravo", gloss: "hello", introducedInUnit: unitSlug },
    { slug: "voda", lemma: "voda", gloss: "water", introducedInUnit: unitSlug },
  ];
}

/** The two Serbian strings draftLessons() requires audio for. */
const REQUIRED_TEXTS = ["Zdravo!", "Voda"];

async function insertAudioClip(t: ReturnType<typeof makeT>, text: string) {
  await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(["fake-audio-bytes"]));
    await ctx.db.insert("audioClips", { text, kind: "word", audioStorageId: storageId });
  });
}

// ---------------------------------------------------------------------------
// 1. Seeding draft content succeeds even without approvedAt.
// ---------------------------------------------------------------------------

test("seedUnit succeeds without approvedAt (draft != publish)", async () => {
  const t = makeT();
  const result = await t.mutation(api.units.seedUnit, {
    unit: draftUnit(),
    lessons: draftLessons("t1"),
    vocab: draftVocab("t1"),
  });
  expect(result.unitId).toBeDefined();

  const unit = await t.run(async (ctx) => {
    return await ctx.db
      .query("units")
      .withIndex("by_slug", (q) => q.eq("slug", "t1"))
      .unique();
  });
  expect(unit).not.toBeNull();
  expect(unit!.approvedAt).toBeUndefined();
  expect(unit!.publishedAt).toBeUndefined();
});

// ---------------------------------------------------------------------------
// 2. Publishing WITHOUT approvedAt is rejected with a clear error.
// ---------------------------------------------------------------------------

test("publishUnit rejects a unit without approvedAt", async () => {
  const t = makeT();
  await t.mutation(api.units.seedUnit, {
    unit: draftUnit(),
    lessons: draftLessons("t1"),
    vocab: draftVocab("t1"),
  });
  // Even with all audio present, approval is still required.
  for (const text of REQUIRED_TEXTS) {
    await insertAudioClip(t, text);
  }

  await expect(t.mutation(api.units.publishUnit, { unitSlug: "t1" })).rejects.toThrow(
    /approvedAt is not set/,
  );

  const unit = await t.run(async (ctx) => {
    return await ctx.db
      .query("units")
      .withIndex("by_slug", (q) => q.eq("slug", "t1"))
      .unique();
  });
  expect(unit!.publishedAt).toBeUndefined();
});

// ---------------------------------------------------------------------------
// 3. Publishing WITH approvedAt but MISSING audioClips is rejected, naming the missing
//    text(s).
// ---------------------------------------------------------------------------

test("publishUnit rejects an approved unit missing audioClips, naming the missing text(s)", async () => {
  const t = makeT();
  await t.mutation(api.units.seedUnit, {
    unit: draftUnit(),
    lessons: draftLessons("t1"),
    vocab: draftVocab("t1"),
  });

  // Approve, but only supply audio for ONE of the two required texts.
  await t.run(async (ctx) => {
    const unit = await ctx.db
      .query("units")
      .withIndex("by_slug", (q) => q.eq("slug", "t1"))
      .unique();
    await ctx.db.patch(unit!._id, { approvedAt: Date.now() });
  });
  await insertAudioClip(t, "Zdravo!"); // "Voda" intentionally missing

  await expect(t.mutation(api.units.publishUnit, { unitSlug: "t1" })).rejects.toThrow(
    /"Voda"/,
  );

  const unit = await t.run(async (ctx) => {
    return await ctx.db
      .query("units")
      .withIndex("by_slug", (q) => q.eq("slug", "t1"))
      .unique();
  });
  expect(unit!.publishedAt).toBeUndefined();
});

// ---------------------------------------------------------------------------
// 4. A fully-approved unit with EVERY required text present DOES publish successfully.
// ---------------------------------------------------------------------------

test("publishUnit succeeds once approved and all required audioClips exist", async () => {
  const t = makeT();
  await t.mutation(api.units.seedUnit, {
    unit: draftUnit(),
    lessons: draftLessons("t1"),
    vocab: draftVocab("t1"),
  });

  await t.run(async (ctx) => {
    const unit = await ctx.db
      .query("units")
      .withIndex("by_slug", (q) => q.eq("slug", "t1"))
      .unique();
    await ctx.db.patch(unit!._id, { approvedAt: Date.now() });
  });
  for (const text of REQUIRED_TEXTS) {
    await insertAudioClip(t, text);
  }

  const result = await t.mutation(api.units.publishUnit, { unitSlug: "t1" });
  expect(result.publishedAt).toBe(true);

  const unit = await t.run(async (ctx) => {
    return await ctx.db
      .query("units")
      .withIndex("by_slug", (q) => q.eq("slug", "t1"))
      .unique();
  });
  expect(unit!.publishedAt).toBeDefined();
  expect(typeof unit!.publishedAt).toBe("number");
});

// ---------------------------------------------------------------------------
// 5. Re-seeding with a duplicate slug colliding with an existing DIFFERENT unit/lesson/
//    challenge is rejected.
// ---------------------------------------------------------------------------

test("seedUnit rejects a lesson slug that collides with a different unit's lesson", async () => {
  const t = makeT();
  await t.mutation(api.units.seedUnit, {
    unit: draftUnit({ slug: "t1", order: 1 }),
    lessons: draftLessons("t1"),
    vocab: draftVocab("t1"),
  });

  // Attempt to seed a second unit "t2" that reuses lesson slug "t1-l1" (owned by t1).
  const collidingLessons = draftLessons("t1"); // slugs are "t1-l1", "t1-l1-c01", ...
  await expect(
    t.mutation(api.units.seedUnit, {
      unit: draftUnit({ slug: "t2", order: 2 }),
      lessons: collidingLessons,
      vocab: [],
    }),
  ).rejects.toThrow(/slug collision|already belongs to unit/);
});

test("seedUnit rejects a challenge slug that collides with a different lesson's challenge", async () => {
  const t = makeT();
  await t.mutation(api.units.seedUnit, {
    unit: draftUnit({ slug: "t1", order: 1 }),
    lessons: draftLessons("t1"),
    vocab: draftVocab("t1"),
  });

  // Second unit, distinct lesson slug, but challenge slug collides with t1-l1-c01.
  const collidingChallengeLessons = [
    {
      slug: "t2-l1",
      order: 1,
      kind: "lesson" as const,
      challenges: [
        {
          slug: "t1-l1-c01", // collides with t1's challenge
          order: 1,
          type: "translate_bank" as const,
          payload: { promptText: "Zdravo!", correctAnswer: "Hello!", wordBank: ["Hello!"] },
          newVocabSlugs: [],
        },
      ],
    },
  ];

  await expect(
    t.mutation(api.units.seedUnit, {
      unit: draftUnit({ slug: "t2", order: 2 }),
      lessons: collidingChallengeLessons,
      vocab: [],
    }),
  ).rejects.toThrow(/slug collision|already belongs to lesson/);
});

// ---------------------------------------------------------------------------
// 6. Changing an already-published (existing) lesson's order/unitSlug is rejected
//    (append-only).
// ---------------------------------------------------------------------------

test("seedUnit rejects changing an existing lesson's order (append-only)", async () => {
  const t = makeT();
  await t.mutation(api.units.seedUnit, {
    unit: draftUnit(),
    lessons: draftLessons("t1"),
    vocab: draftVocab("t1"),
  });

  const mutatedLessons = draftLessons("t1");
  mutatedLessons[0].order = 99; // attempt to move the existing lesson

  await expect(
    t.mutation(api.units.seedUnit, {
      unit: draftUnit(),
      lessons: mutatedLessons,
      vocab: draftVocab("t1"),
    }),
  ).rejects.toThrow(/append-only/);
});

test("seedUnit rejects reassigning an existing lesson to a different unitSlug (append-only)", async () => {
  const t = makeT();
  await t.mutation(api.units.seedUnit, {
    unit: draftUnit({ slug: "t1", order: 1 }),
    lessons: draftLessons("t1"),
    vocab: draftVocab("t1"),
  });
  await t.mutation(api.units.seedUnit, {
    unit: draftUnit({ slug: "t2", order: 2 }),
    lessons: [],
    vocab: [],
  });

  // Try to seed unit t2 with a lesson reusing t1's lesson slug (different unit now).
  const reassigned = draftLessons("t1"); // slug "t1-l1", still says it's for unitSlug t1 by naming only
  await expect(
    t.mutation(api.units.seedUnit, {
      unit: draftUnit({ slug: "t2", order: 2 }),
      lessons: reassigned,
      vocab: [],
    }),
  ).rejects.toThrow(/slug collision|already belongs to unit/);
});

test("publishUnit rejects appending a new lesson that collides in order with an existing one after a direct DB mutation", async () => {
  // Defensive check: publishUnit re-verifies ordering independently of seedUnit, in case
  // data was written by some other path. Simulate two lessons erroneously sharing an
  // order value directly via ctx.db (bypassing seedUnit's own guard) to prove
  // publishUnit's own re-check fires.
  const t = makeT();
  await t.mutation(api.units.seedUnit, {
    unit: draftUnit(),
    lessons: draftLessons("t1"),
    vocab: draftVocab("t1"),
  });

  await t.run(async (ctx) => {
    const unit = await ctx.db
      .query("units")
      .withIndex("by_slug", (q) => q.eq("slug", "t1"))
      .unique();
    await ctx.db.patch(unit!._id, { approvedAt: Date.now() });
    // Insert a second lesson sharing order=1 with "t1-l1", bypassing seedUnit.
    await ctx.db.insert("lessons", { slug: "t1-l2", unitSlug: "t1", order: 1, kind: "lesson" });
    await ctx.db.insert("challenges", {
      slug: "t1-l2-c01",
      lessonSlug: "t1-l2",
      order: 1,
      type: "listen_type",
      payload: { audioText: "Hleb", correctAnswer: "Hleb" },
      newVocabSlugs: [],
    });
  });
  for (const text of [...REQUIRED_TEXTS, "Hleb"]) {
    await insertAudioClip(t, text);
  }

  await expect(t.mutation(api.units.publishUnit, { unitSlug: "t1" })).rejects.toThrow(
    /both claim order/,
  );
});
