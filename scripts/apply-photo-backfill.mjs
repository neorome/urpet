import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { BREEDS } from "../public/scripts/breed-catalog.js";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const reportPath = resolve(process.argv[2] || "/tmp/urdog-photo-backfill/report.json");
const selectionsPath = resolve(process.argv[3] || resolve(root, "data/photo-backfill-selections.json"));
const supplementalReportPaths = process.argv.slice(4).map((path) => resolve(path));
const manifestPath = resolve(root, "public/data/breed-photos.json");
const browserModulePath = resolve(root, "public/scripts/breed-photos.js");
const assetDirectory = resolve(root, "public/assets/breeds");
const ledgerPath = resolve(root, "data/photo-review-ledger.json");
const REVIEWED_AT = "2026-08-10";

const [manifest, report, selectionsDocument, supplementalReports] = await Promise.all([
  readFile(manifestPath, "utf8").then(JSON.parse),
  readFile(reportPath, "utf8").then(JSON.parse),
  readFile(selectionsPath, "utf8").then(JSON.parse),
  Promise.all(supplementalReportPaths.map((path) => readFile(path, "utf8").then(JSON.parse)))
]);

if (manifest.rosterCount !== 205 || report.rosterCount !== 205) throw new Error("Photo roster must contain 205 breeds.");
if (manifest.missingCount === 0 && manifest.approvedCount === 205) {
  console.log("Photo manifest already has 205 approved breeds; no backfill needed.");
  process.exit(0);
}

const rosterIds = new Set(BREEDS.map(({ id }) => id));
const missingIds = new Set(manifest.missing.map(({ id }) => id));
const reportById = new Map(report.breeds.map((breed) => [breed.id, breed]));
for (const supplemental of supplementalReports) {
  for (const breed of supplemental.breeds) reportById.set(breed.id, breed);
}
const selectionById = new Map(selectionsDocument.breeds.map((selection) => [selection.id, selection]));

if (selectionById.size !== missingIds.size) {
  throw new Error(`Expected ${missingIds.size} explicit backfill decisions; found ${selectionById.size}.`);
}
for (const id of missingIds) {
  if (!selectionById.has(id)) throw new Error(`Missing explicit backfill decision for ${id}.`);
}
for (const id of selectionById.keys()) {
  if (!missingIds.has(id) || !rosterIds.has(id)) throw new Error(`Unexpected backfill decision for ${id}.`);
}

await mkdir(assetDirectory, { recursive: true });

const records = manifest.breeds.map((record) => ({
  ...record,
  review: {
    ...record.review,
    candidateFingerprint: createHash("sha256")
      .update(`${record.id}|${record.source.originalSha1}|${record.rights.licenseUrl}`)
      .digest("hex"),
    reviewer: record.review.reviewer || "ur dog visual review"
  }
}));

for (const breed of manifest.missing) {
  const decision = selectionById.get(breed.id);
  if (decision.decision !== "approved") throw new Error(`${breed.id} is not explicitly approved.`);
  if (!decision.reason || decision.reason.length < 20) throw new Error(`${breed.id} needs a useful visual decision reason.`);
  const reviewBreed = reportById.get(breed.id);
  const candidate = decision.candidateFingerprint
    ? reviewBreed?.candidates?.find(({ candidateFingerprint }) => candidateFingerprint === decision.candidateFingerprint)
    : reviewBreed?.candidates?.[decision.index - 1];
  if (!decision.candidateFingerprint && (!Number.isInteger(decision.index) || decision.index < 1)) {
    throw new Error(`${breed.id} needs a 1-based candidate index or an exact candidate fingerprint.`);
  }
  if (!candidate) throw new Error(`Selected candidate was not found for ${breed.id}.`);
  if (!candidate.reviewAsset) throw new Error(`Selected review asset path is missing for ${breed.id}.`);

  const outputPath = resolve(assetDirectory, `${breed.id}.webp`);
  await run("magick", [
    candidate.reviewAsset,
    "-auto-orient",
    "-resize", "720x540>",
    "-strip",
    "-quality", "82",
    outputPath
  ]);
  const output = await readFile(outputPath);
  const attribution = candidate.rights.attribution || candidate.rights.artist;
  records.push({
    id: breed.id,
    name: breed.name,
    localPath: `/assets/breeds/${breed.id}.webp`,
    alt: `${breed.name} dog`,
    selection: {
      method: candidate.source,
      commonsFileTitle: candidate.title,
      candidateFingerprint: candidate.candidateFingerprint
    },
    wikidataQid: reviewBreed.wikidataQid,
    source: {
      originalUrl: candidate.media.originalUrl,
      commonsDisplayUrl: candidate.media.displayUrl,
      sourcePageUrl: candidate.media.sourcePageUrl,
      originalSha1: candidate.media.sha1
    },
    derivative: {
      format: "image/webp",
      sha256: createHash("sha256").update(output).digest("hex"),
      changes: "Wikimedia display file resized to fit within 720 by 540 pixels, converted to WebP, and metadata stripped; page layout may crop the display.",
      licenseUrl: candidate.rights.licenseUrl
    },
    rights: {
      licenseShortName: candidate.rights.licenseShortName,
      licenseUrl: candidate.rights.licenseUrl,
      usageTerms: candidate.rights.usageTerms,
      artist: candidate.rights.artist,
      attribution,
      credit: candidate.rights.credit
    },
    review: {
      status: "approved",
      reviewedAt: REVIEWED_AT,
      reviewer: "ur dog adversarial visual review",
      candidateFingerprint: candidate.candidateFingerprint,
      reviewReason: decision.reason
    },
    retrievedAt: report.generatedAt
  });
}

records.sort((left, right) => left.id.localeCompare(right.id));
if (records.length !== 205 || new Set(records.map(({ id }) => id)).size !== 205) {
  throw new Error(`Backfill must produce 205 unique approved records; produced ${records.length}.`);
}

const ledger = {
  schemaVersion: 1,
  reviewedAt: REVIEWED_AT,
  policy: "Every production breed photo requires an explicit source, rights check, and visual breed-identity decision.",
  count: records.length,
  breeds: records.map((record) => ({
    id: record.id,
    name: record.name,
    decision: "approved",
    candidateFingerprint: record.review.candidateFingerprint,
    sourcePageUrl: record.source.sourcePageUrl,
    reviewedAt: record.review.reviewedAt,
    reviewer: record.review.reviewer,
    reason: record.review.reviewReason
  }))
};

const updatedManifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  reviewedAt: REVIEWED_AT,
  rosterCount: 205,
  approvedCount: 205,
  missingCount: 0,
  source: "Reviewed Wikimedia Commons files discovered through Wikidata P18, Commons breed categories, and exact breed-name searches",
  policy: {
    productionRequiresExplicitApproval: true,
    mysteryOrUnattributedPhotosAllowed: false,
    fallbackAllowed: false
  },
  breeds: records,
  missing: []
};

const browserRecords = Object.fromEntries(records.map((record) => [
  record.id,
  {
    src: record.localPath,
    alt: record.alt,
    sourcePageUrl: record.source.sourcePageUrl,
    licenseShortName: record.rights.licenseShortName,
    licenseUrl: record.rights.licenseUrl,
    attribution: record.rights.attribution
  }
]));

await Promise.all([
  writeFile(manifestPath, `${JSON.stringify(updatedManifest, null, 2)}\n`),
  writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`),
  writeFile(
    browserModulePath,
    `// Generated from the reviewed Wikimedia Commons manifest.\nconst BREED_PHOTOS = Object.freeze(${JSON.stringify(browserRecords, null, 2)});\n\nexport { BREED_PHOTOS };\n`
  )
]);

console.log("Applied 78 explicit visual decisions; production manifest now contains 205 approved photos and zero fallbacks.");
