import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BREEDS } from "../public/scripts/breed-catalog.js";
import { BREED_PHOTOS } from "../public/scripts/breed-photos.js";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  await readFile(resolve(root, "public", "data", "breed-photos.json"), "utf8")
);
const reviewLedger = JSON.parse(
  await readFile(resolve(root, "data", "photo-review-ledger.json"), "utf8")
);
const allowedLicenseUrls = new Set([
  "https://creativecommons.org/publicdomain/zero/1.0/",
  "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
  "https://creativecommons.org/licenses/by/4.0/",
  "https://creativecommons.org/licenses/by/4.0",
  "https://creativecommons.org/licenses/by/3.0/",
  "https://creativecommons.org/licenses/by/3.0",
  "https://creativecommons.org/licenses/by/2.5/",
  "https://creativecommons.org/licenses/by/2.5",
  "https://creativecommons.org/licenses/by/2.0/",
  "https://creativecommons.org/licenses/by/2.0",
  "https://creativecommons.org/licenses/by/2.1/",
  "https://creativecommons.org/licenses/by/1.0/",
  "https://creativecommons.org/licenses/by-sa/4.0",
  "https://creativecommons.org/licenses/by-sa/4.0/",
  "https://creativecommons.org/licenses/by-sa/3.0/",
  "https://creativecommons.org/licenses/by-sa/3.0",
  "http://creativecommons.org/licenses/by-sa/3.0/",
  "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
  "https://creativecommons.org/licenses/by-sa/3.0/rs/deed.en",
  "https://creativecommons.org/licenses/by-sa/2.5",
  "https://creativecommons.org/licenses/by-sa/2.5/",
  "https://creativecommons.org/licenses/by-sa/2.1/es/deed.en",
  "https://creativecommons.org/licenses/by-sa/2.0",
  "https://creativecommons.org/licenses/by-sa/2.0/",
  "https://creativecommons.org/licenses/by-sa/2.1/",
  "https://creativecommons.org/licenses/by-sa/1.0/"
]);

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.rosterCount, 205);
assert.equal(manifest.approvedCount, 205, "Every breed must have an approved local photo.");
assert.equal(manifest.missingCount, 0, "Production fallbacks are not allowed.");
assert.equal(manifest.approvedCount, manifest.breeds.length);
assert.equal(manifest.missingCount, manifest.missing.length);
assert.equal(manifest.approvedCount + manifest.missingCount, 205);
assert.equal(Object.keys(BREED_PHOTOS).length, 205);
assert.equal(reviewLedger.schemaVersion, 1);
assert.equal(reviewLedger.count, 205);
assert.equal(reviewLedger.breeds.length, 205);

const ledgerById = new Map(reviewLedger.breeds.map((decision) => [decision.id, decision]));
assert.equal(ledgerById.size, 205);

const rosterIds = new Set(BREEDS.map(({ id }) => id));
const approvedIds = new Set();
for (const photo of manifest.breeds) {
  assert.ok(rosterIds.has(photo.id), `Unknown photo breed: ${photo.id}`);
  assert.ok(!approvedIds.has(photo.id), `Duplicate approved photo: ${photo.id}`);
  approvedIds.add(photo.id);
  assert.equal(photo.review.status, "approved");
  assert.equal(photo.review.reviewedAt, "2026-08-10");
  assert.ok(photo.review.reviewer);
  assert.match(photo.review.candidateFingerprint, /^[a-f0-9]{64}$/);
  const decision = ledgerById.get(photo.id);
  assert.equal(decision?.decision, "approved");
  assert.equal(decision?.candidateFingerprint, photo.review.candidateFingerprint);
  assert.equal(decision?.sourcePageUrl, photo.source.sourcePageUrl);
  assert.match(photo.localPath, /^\/assets\/breeds\/[a-z0-9-]+\.webp$/);
  assert.match(photo.source.originalUrl, /^https:\/\/upload\.wikimedia\.org\//);
  assert.match(photo.source.sourcePageUrl, /^https:\/\/commons\.wikimedia\.org\//);
  assert.doesNotMatch(
    `${photo.selection.commonsFileTitle} ${photo.source.sourcePageUrl}`,
    /\b(?:mix|mixed[ _-]?breed|cross[ _-]?breed)\b/i,
    `Photo source contradicts the exact-breed label: ${photo.id}`
  );
  assert.ok(allowedLicenseUrls.has(photo.rights.licenseUrl), `Disallowed photo license: ${photo.id}`);
  assert.equal(photo.derivative.licenseUrl, photo.rights.licenseUrl);
  assert.ok(photo.rights.licenseShortName);
  assert.doesNotMatch(
    `${photo.rights.attribution}${photo.rights.artist}${photo.rights.credit}`,
    /<[^>]+>/,
    `Rendered credit fields must be plain text for ${photo.id}`
  );
  if (!photo.rights.licenseUrl.includes("/publicdomain/zero/")) {
    assert.ok(photo.rights.attribution || photo.rights.artist, `Missing creator credit: ${photo.id}`);
  }

  const path = resolve(root, "public", photo.localPath.replace(/^\//, ""));
  await access(path);
  const file = await readFile(path);
  assert.equal(file.subarray(0, 4).toString("ascii"), "RIFF", `${photo.id} is not a WebP RIFF file`);
  assert.equal(file.subarray(8, 12).toString("ascii"), "WEBP", `${photo.id} is not a WebP file`);
  assert.equal(createHash("sha256").update(file).digest("hex"), photo.derivative.sha256);

  const browserPhoto = BREED_PHOTOS[photo.id];
  assert.equal(browserPhoto.src, photo.localPath);
  assert.equal(browserPhoto.sourcePageUrl, photo.source.sourcePageUrl);
  assert.equal(browserPhoto.licenseUrl, photo.rights.licenseUrl);
}

assert.deepEqual(approvedIds, rosterIds);

console.log(`Photo verification passed: all ${manifest.approvedCount} breeds have licensed, visually approved local photos.`);
