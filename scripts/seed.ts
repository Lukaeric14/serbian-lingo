// SPEC.md §3 step 5 ("seed"):
//
//   upsert approved unit JSON into Convex under stable ids, enforcing the §2
//   publishing rules (approval required, audio-completeness validation,
//   append-only ordering). Safe to re-run; never touches progress.
//
// This script reads every data/units/*.json (+ matching *.vocab.json), calls the
// `seedUnit` mutation for each (draft upsert — never publishes), then produces a
// DRY-RUN eligibility report per unit by asking Convex whether `publishUnit` would
// currently succeed. It does NOT call `publishUnit` for real — publishing is a human
// decision (Luka reviews the review doc, sets approvedAt, then someone runs the
// publish step deliberately). This script's job ends at "here's what's ready".
//
// Uses `anyApi` (convex/server) rather than the generated `convex/_generated/api`
// module: that generated file is only refreshed by a live `npx convex dev` codegen
// run, so relying on it here would make this script's typecheck depend on a live
// deployment having run at least once. anyApi gives the same call-site ergonomics
// (`api.units.seedUnit`) without that dependency, matching the "verified without a
// live deployment" requirement (Part C's convex-test does the real behavioral proof).
//
// *.audio-manifest.json files are read too, purely to report the current audio
// coverage in the DRY-RUN summary (they are not required to seed draft content — audio
// completeness is validated against the LIVE audioClips table by publishUnit itself,
// since the manifest is only a snapshot of what generate-audio produced locally).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const UNITS_DIR = join(__dirname, "..", "data", "units");

interface UnitFile {
  unit: {
    slug: string;
    order: number;
    title: string;
    objective: string;
    sectionTitle: string;
    color: string;
  };
  lessons: Array<{
    slug: string;
    order: number;
    kind: "lesson" | "chest";
    challenges: Array<{
      slug: string;
      order: number;
      type: string;
      payload: unknown;
      newVocabSlugs: string[];
    }>;
  }>;
}

interface VocabEntry {
  slug: string;
  lemma: string;
  gloss: string;
  introducedInUnit: string;
}

interface AudioManifestEntry {
  text: string;
  kind: "word" | "sentence";
}

/** Discover every unit basename (e.g. "u1") that has a companion `<slug>.json`. */
function discoverUnitSlugs(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.includes(".vocab.") && !f.includes(".audio-manifest."))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

/** Result of attempting to seed + assess one unit. */
interface UnitReport {
  slug: string;
  seeded: boolean;
  seedError?: string;
  publishEligible: boolean;
  publishBlockedReason?: string;
  audioManifestCount: number;
}

async function main() {
  const deploymentUrl = process.env.CONVEX_URL;
  if (!deploymentUrl) {
    console.error(
      "seed.ts: CONVEX_URL is not set. Point it at a Convex deployment (e.g. from `npx convex dev`'s .env.local) before running.",
    );
    process.exitCode = 1;
    return;
  }

  const client = new ConvexHttpClient(deploymentUrl);
  const slugs = discoverUnitSlugs(UNITS_DIR);

  if (slugs.length === 0) {
    console.log(`seed.ts: no unit JSON files found in ${UNITS_DIR}`);
    return;
  }

  const reports: UnitReport[] = [];

  for (const slug of slugs) {
    const unitFile = loadJson<UnitFile>(join(UNITS_DIR, `${slug}.json`));
    const vocab = loadJson<VocabEntry[]>(join(UNITS_DIR, `${slug}.vocab.json`));
    const audioManifest = loadJson<AudioManifestEntry[]>(
      join(UNITS_DIR, `${slug}.audio-manifest.json`),
    );

    const report: UnitReport = {
      slug,
      seeded: false,
      publishEligible: false,
      audioManifestCount: audioManifest.length,
    };

    try {
      await client.mutation(anyApi.units.seedUnit, {
        unit: unitFile.unit,
        lessons: unitFile.lessons,
        vocab,
      });
      report.seeded = true;
    } catch (err) {
      report.seedError = err instanceof Error ? err.message : String(err);
      reports.push(report);
      continue;
    }

    // DRY-RUN eligibility check: attempt publishUnit's real validation, but this is
    // still a report, not an intentional publish — we only ever call it against
    // draft-seeded content, and a human still decides to run this. If the caller wants
    // an actual publish, that's a separate explicit invocation of `publishUnit`
    // (e.g. via `npx convex run units:publishUnit '{"unitSlug":"u1"}'`), not this script.
    //
    // seed.ts intentionally does NOT call the real publishUnit mutation to determine
    // eligibility (that would risk actually publishing). Instead it re-derives the same
    // three checks client-side by reading back what it just seeded, so the report can
    // never have the side effect of publishing.
    try {
      report.publishEligible = await assessPublishEligibility(client, slug);
    } catch (err) {
      report.publishBlockedReason = err instanceof Error ? err.message : String(err);
    }

    reports.push(report);
  }

  printReport(reports);
}

/**
 * Re-derives publish-eligibility as a read-only check (no mutation call), so running
 * the dry-run report can never have the side effect of actually publishing a unit.
 * Mirrors publishUnit's checks (a)-(d) but only ever reads.
 */
async function assessPublishEligibility(
  client: ConvexHttpClient,
  unitSlug: string,
): Promise<boolean> {
  const status = await client.query(anyApi.units.getPublishStatus, { unitSlug });
  if (!status.eligible) {
    throw new Error(status.blockingErrors.join(" | "));
  }
  return true;
}

function printReport(reports: UnitReport[]) {
  console.log("\n=== Seed report ===\n");
  for (const r of reports) {
    if (!r.seeded) {
      console.log(`  ${r.slug}: SEED FAILED — ${r.seedError}`);
      continue;
    }
    const eligibility = r.publishEligible
      ? "PUBLISH-ELIGIBLE"
      : `not publish-eligible (${r.publishBlockedReason ?? "unknown"})`;
    console.log(`  ${r.slug}: seeded OK, ${eligibility} [audio manifest: ${r.audioManifestCount} clips]`);
  }
  console.log("\nThis is a dry-run report only. No unit was published — run the `publishUnit`");
  console.log("mutation explicitly (a deliberate human decision) once a unit is ready.\n");
}

main().catch((err) => {
  console.error("seed.ts: fatal error", err);
  process.exitCode = 1;
});
