// Proves upsertClip is find-or-create by exact text, and listAll/listTexts read back
// correctly — against convex-test's in-memory backend, no live deployment needed.
// See convex/units.test.ts for the established pattern this file follows.

import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import schema from "./schema";

const api = anyApi as unknown as {
  audioClips: {
    listTexts: any;
    listAll: any;
    upsertClip: any;
  };
};

const modules = {
  "schema.ts": () => Promise.resolve(require("./schema")),
  "audioClips.ts": () => Promise.resolve(require("./audioClips")),
  "_generated/server.js": () => Promise.resolve(require("./_generated/server")),
};

function makeT() {
  return convexTest(schema, modules);
}

test("upsertClip creates a new row on first call", async () => {
  const t = makeT();

  await t.mutation(api.audioClips.upsertClip, {
    text: "zdravo",
    kind: "word",
    url: "https://pub.example/zdravo.mp3",
  });

  const rows = await t.run(async (ctx) => ctx.db.query("audioClips").collect());
  expect(rows).toHaveLength(1);
  expect(rows[0].text).toBe("zdravo");
  expect(rows[0].url).toBe("https://pub.example/zdravo.mp3");
});

test("upsertClip patches (not duplicates) an existing row for the same exact text", async () => {
  const t = makeT();

  await t.mutation(api.audioClips.upsertClip, {
    text: "zdravo",
    kind: "word",
    url: "https://pub.example/zdravo-v1.mp3",
  });
  await t.mutation(api.audioClips.upsertClip, {
    text: "zdravo",
    kind: "word",
    url: "https://pub.example/zdravo-v2.mp3",
  });

  const rows = await t.run(async (ctx) => ctx.db.query("audioClips").collect());
  expect(rows).toHaveLength(1);
  expect(rows[0].url).toBe("https://pub.example/zdravo-v2.mp3");
});

test("listTexts returns bare text strings only", async () => {
  const t = makeT();
  await t.mutation(api.audioClips.upsertClip, {
    text: "Ja sam ovde.",
    kind: "sentence",
    url: "https://pub.example/ja-sam-ovde.mp3",
  });

  const texts = await t.query(api.audioClips.listTexts, {});
  expect(texts).toEqual(["Ja sam ovde."]);
});

test("listAll returns {text, url} pairs the client can preload directly", async () => {
  const t = makeT();
  await t.mutation(api.audioClips.upsertClip, {
    text: "da",
    kind: "word",
    url: "https://pub.example/da.mp3",
  });
  await t.mutation(api.audioClips.upsertClip, {
    text: "ne",
    kind: "word",
    url: "https://pub.example/ne.mp3",
  });

  const clips = await t.query(api.audioClips.listAll, {});
  expect(clips).toHaveLength(2);
  expect(clips).toEqual(
    expect.arrayContaining([
      { text: "da", url: "https://pub.example/da.mp3" },
      { text: "ne", url: "https://pub.example/ne.mp3" },
    ]),
  );
});
