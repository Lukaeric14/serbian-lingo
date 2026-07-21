import { File } from "expo-file-system";
import { ensureAllDownloaded, ensureDownloaded } from "./clipCache";

// Fake just the expo-file-system surface clipCache touches. Instances are
// tracked so tests can flip `exists` per file.
const mockFileInstances: any[] = [];
let mockExistingNames: Set<string> = new Set();

jest.mock("expo-file-system", () => {
  class FakeDirectory {
    exists = true;
    constructor(..._segments: any[]) {}
    create() {}
  }
  class FakeFile {
    name: string;
    uri: string;
    constructor(_dir: any, name: string) {
      this.name = name;
      this.uri = `file:///cache/audio-clips/${name}`;
      mockFileInstances.push(this);
    }
    get exists() {
      return mockExistingNames.has(this.name);
    }
    static downloadFileAsync = jest.fn(async (_url: string, destination: any) => destination);
  }
  return { Paths: { cache: "file:///cache" }, Directory: FakeDirectory, File: FakeFile };
});

const mockedDownload = (File as any).downloadFileAsync as jest.Mock;

describe("clipCache", () => {
  beforeEach(() => {
    mockFileInstances.length = 0;
    mockExistingNames = new Set();
    mockedDownload.mockClear();
    mockedDownload.mockImplementation(async (_url: string, destination: any) => destination);
  });

  it("downloads a clip it has never seen and returns the local uri", async () => {
    const uri = await ensureDownloaded("https://pub.example/audio/nicholas/000.mp3");

    expect(mockedDownload).toHaveBeenCalledTimes(1);
    expect(uri).toBe("file:///cache/audio-clips/audio_nicholas_000.mp3");
  });

  it("skips the download when the file is already cached", async () => {
    mockExistingNames.add("audio_nicholas_000.mp3");

    const uri = await ensureDownloaded("https://pub.example/audio/nicholas/000.mp3");

    expect(mockedDownload).not.toHaveBeenCalled();
    expect(uri).toBe("file:///cache/audio-clips/audio_nicholas_000.mp3");
  });

  it("falls back to the remote url when the download fails (degraded, not broken)", async () => {
    mockedDownload.mockRejectedValueOnce(new Error("network down"));

    const uri = await ensureDownloaded("https://pub.example/audio/sophie/042.mp3");

    expect(uri).toBe("https://pub.example/audio/sophie/042.mp3");
  });

  it("derives distinct filenames for clips in different voice folders", async () => {
    const a = await ensureDownloaded("https://pub.example/audio/sophie/001.mp3");
    const b = await ensureDownloaded("https://pub.example/audio/nicholas/001.mp3");
    expect(a).not.toBe(b);
  });

  it("ensureAllDownloaded resolves every url, mixing cached, downloaded, and failed", async () => {
    mockExistingNames.add("audio_a.mp3");
    mockedDownload.mockImplementation(async (url: string, destination: any) => {
      if (url.endsWith("c.mp3")) throw new Error("boom");
      return destination;
    });

    const resolved = await ensureAllDownloaded([
      "https://pub.example/audio/a.mp3", // cached
      "https://pub.example/audio/b.mp3", // downloads
      "https://pub.example/audio/c.mp3", // fails -> remote
    ]);

    expect(resolved.get("https://pub.example/audio/a.mp3")).toBe("file:///cache/audio-clips/audio_a.mp3");
    expect(resolved.get("https://pub.example/audio/b.mp3")).toBe("file:///cache/audio-clips/audio_b.mp3");
    expect(resolved.get("https://pub.example/audio/c.mp3")).toBe("https://pub.example/audio/c.mp3");
  });
});
