import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// All texts that already have a generated clip — used by the audio-gen
// pipeline (scripts/audio/generate.ts's ClipStore) to diff against manifests.
export const listTexts = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("audioClips").collect();
    return rows.map((r) => r.text);
  },
});

// Upsert by exact text (find-or-create, patch if exists) — re-running the
// generation pipeline never creates duplicate rows for the same surface form.
export const upsertClip = mutation({
  args: {
    text: v.string(),
    kind: v.union(v.literal("word"), v.literal("sentence")),
    url: v.string(),
  },
  handler: async (ctx, { text, kind, url }) => {
    const existing = await ctx.db
      .query("audioClips")
      .withIndex("by_text", (q) => q.eq("text", text))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { kind, url });
      return existing._id;
    }
    return await ctx.db.insert("audioClips", { text, kind, url });
  },
});
