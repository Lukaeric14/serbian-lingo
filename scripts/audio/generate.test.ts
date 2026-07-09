import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generate, type ClipStore } from "./generate";
import { synthesizeSpeech } from "./azureClient";

// Mock the Azure REST wrapper entirely — no real network/API key involved.
jest.mock("./azureClient", () => ({
  synthesizeSpeech: jest.fn(),
}));

const mockedSynthesize = synthesizeSpeech as jest.MockedFunction<typeof synthesizeSpeech>;

/** Fake in-memory ClipStore standing in for a Convex deployment. */
class FakeClipStore implements ClipStore {
  public uploaded: { text: string; kind: string; audio: Buffer }[] = [];
  private existing: Set<string>;

  constructor(existing: string[] = []) {
    this.existing = new Set(existing);
  }

  async existingTexts(): Promise<string[]> {
    return Array.from(this.existing);
  }

  async upload(text: string, kind: "word" | "sentence", audio: Buffer): Promise<void> {
    this.uploaded.push({ text, kind, audio });
    this.existing.add(text);
  }
}

describe("generate", () => {
  let manifestDir: string;

  beforeEach(() => {
    manifestDir = mkdtempSync(join(tmpdir(), "audio-manifest-test-"));
    mockedSynthesize.mockReset();
    mockedSynthesize.mockImplementation(async (text: string) =>
      Buffer.from(`fake-audio:${text}`),
    );
  });

  afterEach(() => {
    rmSync(manifestDir, { recursive: true, force: true });
  });

  function writeManifest(filename: string, entries: unknown[]) {
    writeFileSync(join(manifestDir, filename), JSON.stringify(entries), "utf-8");
  }

  it("synthesizes and uploads only clips missing from the store", async () => {
    writeManifest("unit-01.audio-manifest.json", [
      { text: "zdravo", kind: "word" },
      { text: "hvala", kind: "word" },
      { text: "Dobro jutro, Dominika.", kind: "sentence" },
    ]);

    const clipStore = new FakeClipStore(["hvala"]);

    const result = await generate({
      manifestDir,
      voice: "sr-RS-SophieNeural",
      clipStore,
      log: () => {},
    });

    // "hvala" already existed — must be skipped entirely.
    expect(mockedSynthesize).toHaveBeenCalledTimes(2);
    expect(mockedSynthesize).toHaveBeenCalledWith("zdravo", "sr-RS-SophieNeural");
    expect(mockedSynthesize).toHaveBeenCalledWith(
      "Dobro jutro, Dominika.",
      "sr-RS-SophieNeural",
    );
    expect(mockedSynthesize).not.toHaveBeenCalledWith("hvala", expect.anything());

    expect(clipStore.uploaded).toHaveLength(2);
    expect(clipStore.uploaded.map((u) => u.text).sort()).toEqual(
      ["Dobro jutro, Dominika.", "zdravo"].sort(),
    );

    expect(result.manifestEntryCount).toBe(3);
    expect(result.synthesized).toHaveLength(2);
  });

  it("is idempotent: a second run against the now-populated store synthesizes nothing", async () => {
    writeManifest("unit-01.audio-manifest.json", [
      { text: "zdravo", kind: "word" },
      { text: "hvala", kind: "word" },
    ]);

    const clipStore = new FakeClipStore([]);

    await generate({ manifestDir, voice: "v1", clipStore, log: () => {} });
    expect(mockedSynthesize).toHaveBeenCalledTimes(2);

    mockedSynthesize.mockClear();

    const secondResult = await generate({ manifestDir, voice: "v1", clipStore, log: () => {} });

    expect(mockedSynthesize).not.toHaveBeenCalled();
    expect(secondResult.synthesized).toHaveLength(0);
    expect(secondResult.missing).toHaveLength(0);
  });

  it("reads and merges multiple manifest files, deduping shared text", async () => {
    writeManifest("unit-01.audio-manifest.json", [
      { text: "zdravo", kind: "word" },
      { text: "Julia", kind: "word" },
    ]);
    writeManifest("unit-02.audio-manifest.json", [
      { text: "Julia", kind: "word" }, // shared with unit-01, should only synthesize once
      { text: "Agnieszka", kind: "word" },
    ]);

    const clipStore = new FakeClipStore([]);

    const result = await generate({ manifestDir, voice: "v1", clipStore, log: () => {} });

    expect(result.manifestEntryCount).toBe(4);
    expect(mockedSynthesize).toHaveBeenCalledTimes(3); // zdravo, Julia, Agnieszka
    expect(clipStore.uploaded).toHaveLength(3);
  });

  it("does nothing when there are no manifest files", async () => {
    const clipStore = new FakeClipStore([]);

    const result = await generate({ manifestDir, voice: "v1", clipStore, log: () => {} });

    expect(result.manifestEntryCount).toBe(0);
    expect(mockedSynthesize).not.toHaveBeenCalled();
    expect(clipStore.uploaded).toHaveLength(0);
  });

  it("does nothing when the manifest directory doesn't exist", async () => {
    const clipStore = new FakeClipStore([]);

    const result = await generate({
      manifestDir: join(manifestDir, "does-not-exist"),
      voice: "v1",
      clipStore,
      log: () => {},
    });

    expect(result.manifestEntryCount).toBe(0);
    expect(clipStore.uploaded).toHaveLength(0);
  });

  it("ignores files that don't match the *.audio-manifest.json pattern", async () => {
    writeManifest("unit-01.audio-manifest.json", [{ text: "zdravo", kind: "word" }]);
    writeFileSync(join(manifestDir, "unit-01.json"), JSON.stringify([{ text: "ignored" }]));
    writeFileSync(join(manifestDir, "notes.txt"), "not json at all");

    const clipStore = new FakeClipStore([]);
    const result = await generate({ manifestDir, voice: "v1", clipStore, log: () => {} });

    expect(result.manifestEntryCount).toBe(1);
    expect(mockedSynthesize).toHaveBeenCalledTimes(1);
    expect(mockedSynthesize).toHaveBeenCalledWith("zdravo", "v1");
  });

  it("passes the audio buffer returned by synthesizeSpeech through to upload", async () => {
    writeManifest("unit-01.audio-manifest.json", [{ text: "zdravo", kind: "word" }]);
    mockedSynthesize.mockResolvedValueOnce(Buffer.from("specific-bytes"));

    const clipStore = new FakeClipStore([]);
    await generate({ manifestDir, voice: "v1", clipStore, log: () => {} });

    expect(clipStore.uploaded[0].audio.toString()).toBe("specific-bytes");
    expect(clipStore.uploaded[0].kind).toBe("word");
  });
});
