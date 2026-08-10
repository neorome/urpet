import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { BREEDS } from "../public/scripts/breed-catalog.js";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const candidatePath = resolve(process.argv[2] || "/tmp/urdog-photo-candidates.json");
const reviewDirectory = resolve(process.argv[3] || "/tmp/urdog-photo-review");
const assetDirectory = resolve(root, "public", "assets", "breeds");
const dataDirectory = resolve(root, "public", "data");
const manifestPath = resolve(dataDirectory, "breed-photos.json");
const modulePath = resolve(root, "public", "scripts", "breed-photos.js");

const VISUAL_REJECTIONS = new Set([
  "belgian-sheepdog",
  "bouvier-des-flandres"
]);

const candidates = JSON.parse(await readFile(candidatePath, "utf8"));
if (candidates.rosterCount !== 205) throw new Error("Photo candidate roster must contain 205 breeds.");
const files = await readdir(reviewDirectory);
const approved = candidates.breeds.filter(
  ({ id, status }) => status === "needs-visual-review" && !VISUAL_REJECTIONS.has(id)
);

await mkdir(assetDirectory, { recursive: true });
await mkdir(dataDirectory, { recursive: true });

const records = [];
for (const candidate of approved) {
  const inputName = files.find((name) => /^\d{3}-/.test(name) && name.includes(`-${candidate.id}.`));
  if (!inputName) throw new Error(`Missing reviewed source file for ${candidate.id}.`);
  const inputPath = resolve(reviewDirectory, inputName);
  const outputPath = resolve(assetDirectory, `${candidate.id}.webp`);
  await run("magick", [
    inputPath,
    "-auto-orient",
    "-resize",
    "720x540>",
    "-strip",
    "-quality",
    "82",
    outputPath
  ]);
  const output = await readFile(outputPath);
  const attribution = candidate.rights.attribution || candidate.rights.artist;
  records.push({
    id: candidate.id,
    name: candidate.name,
    localPath: `/assets/breeds/${candidate.id}.webp`,
    alt: `${candidate.name} dog`,
    selection: candidate.selection,
    wikidataQid: candidate.wikidataQid,
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
      reviewedAt: "2026-08-10",
      reviewReason: "Image visually checked against the named registry breed; attribution and license metadata checked."
    },
    retrievedAt: candidates.generatedAt
  });
}

records.sort((left, right) => left.id.localeCompare(right.id));
const approvedIds = new Set(records.map(({ id }) => id));
const missing = BREEDS.filter(({ id }) => !approvedIds.has(id)).map(({ id, name }) => {
  const candidate = candidates.breeds.find((item) => item.id === id);
  return {
    id,
    name,
    reason: VISUAL_REJECTIONS.has(id)
      ? "Wikimedia candidate did not clearly and singly depict this breed."
      : candidate?.reasons?.join(" ") || "No production-approved candidate."
  };
});

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  reviewedAt: "2026-08-10",
  rosterCount: 205,
  approvedCount: records.length,
  missingCount: missing.length,
  source: "Wikimedia Commons files discovered through exact AKC-slug Wikidata mappings",
  policy: {
    productionRequiresExplicitApproval: true,
    mysteryOrUnattributedPhotosAllowed: false,
    fallback: "ur dog brand tile"
  },
  breeds: records,
  missing
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

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
await writeFile(
  modulePath,
  `// Generated from the reviewed Wikimedia Commons manifest.\nconst BREED_PHOTOS = Object.freeze(${JSON.stringify(browserRecords, null, 2)});\n\nexport { BREED_PHOTOS };\n`
);

console.log(`Approved ${records.length} photos; ${missing.length} breeds retain the original illustration fallback.`);
