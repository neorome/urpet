import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(process.argv[2] || "/tmp/urdog-photo-backfill");
const manifest = JSON.parse(await readFile(resolve(root, "public/data/breed-photos.json"), "utf8"));
const firstPass = JSON.parse(await readFile(process.argv[3] || "/tmp/urdog-photo-candidates.json", "utf8"));
const firstPassById = new Map(firstPass.breeds.map((breed) => [breed.id, breed]));
const onlyIds = new Set(String(process.env.URDOG_PHOTO_ONLY || "").split(",").map((value) => value.trim()).filter(Boolean));
const reviewPool = [...new Map(
  [...manifest.missing, ...manifest.breeds.map(({ id, name }) => ({ id, name, reason: "existing photo replacement review" }))]
    .map((breed) => [breed.id, breed])
).values()];
const missing = onlyIds.size ? reviewPool.filter(({ id }) => onlyIds.has(id)) : manifest.missing;
const USER_AGENT = "urdog.dev/1.1 (https://urdog.dev; team@neorome.dev; reviewed photo provenance build)";

const SEARCH_ALIASES = Object.freeze({
  "akita": "American Akita",
  "barbet": "Barbet dog",
  "belgian-laekenois": "Belgian Shepherd Laekenois",
  "belgian-sheepdog": "Belgian Shepherd Groenendael",
  "belgian-tervuren": "Belgian Shepherd Tervuren",
  "boxer": "Boxer dog",
  "cocker-spaniel": "American Cocker Spaniel",
  "collie": "Rough Collie",
  "great-pyrenees": "Pyrenean Mountain Dog",
  "harrier": "Harrier dog breed",
  "japanese-chin": "Japanese Chin dog",
  "nederlandse-kooikerhondje": "Kooikerhondje",
  "pointer": "English Pointer",
  "portuguese-podengo-pequeno": "Portuguese Podengo Pequeno",
  "russell-terrier": "Russell Terrier dog",
  "russian-toy": "Russkiy Toy"
});

const CATEGORY_ALIASES = Object.freeze({
  "akita": "American Akita",
  "belgian-laekenois": "Belgian Shepherd Laekenois",
  "belgian-sheepdog": "Belgian Shepherd Groenendael",
  "belgian-tervuren": "Belgian Shepherd Tervuren",
  "boxer": "Boxer (dog)",
  "chihuahua": "Chihuahua (dog)",
  "chinook": "Chinook (dog)",
  "cocker-spaniel": "American Cocker Spaniel",
  "collie": "Rough Collie",
  "great-pyrenees": "Pyrenean Mountain Dog",
  "harrier": "Harrier (dog breed)",
  "maltese": "Maltese dog",
  "nederlandse-kooikerhondje": "Kooikerhondje",
  "pointer": "English Pointer",
  "portuguese-podengo-pequeno": "Portuguese Podengo",
  "russian-toy": "Russkiy Toy"
});

const EXTRA_SEARCHES = Object.freeze({
  "american-water-spaniel": ["American Water Spaniel outdoors"],
  "black-russian-terrier": ["Black Russian Terrier standing"],
  "chihuahua": ["Chihuahua dog standing"],
  "dachshund": ["Dachshund dog standing"],
  "english-springer-spaniel": ["English Springer Spaniel standing"],
  "german-shorthaired-pointer": ["German Shorthaired Pointer standing"],
  "great-pyrenees": ["Great Pyrenees dog standing"],
  "japanese-chin": ["Japanese Chin dog standing"],
  "russell-terrier": ["Russell Terrier"]
});

const CURATED_COMMONS_TITLES = Object.freeze({
  // The file title records the AKC breed and Westminster entry; the Commons
  // description retains the older Jack Russell naming used for the same dog.
  "russell-terrier": ["File:Russell Terrier-11-GCH-Goldsand's Billy Jean 02 (16583577811).jpg"]
});

const SUSPICIOUS_WORDS = [
  "aircraft", "army", "artillery", "badge", "bird", "bus", "car", "coat of arms", "diagram",
  "drawing", "emblem", "flag", "illustration", "logo", "map", "memorial", "military", "painting",
  "sculpture", "stamp", "statue", "tank", "train", "vehicle"
];
const IDENTITY_WARNINGS = ["crossbreed", "cross breed", "hybrid", "mix breed", "mixed breed", "mongrel"];

function pause(milliseconds) {
  return new Promise((resolvePause) => setTimeout(resolvePause, milliseconds));
}

async function requestJson(url, attempts = 6) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: "application/json" }
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await pause(Math.min(8000, attempt * attempt * 400));
    }
  }
  throw lastError;
}

async function requestBytes(url, attempts = 7) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await pause(Math.min(12_000, attempt * attempt * 650));
    }
  }
  throw lastError;
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function plainText(value) {
  return String(value || "")
    .replace(/<br\s*\/?\s*>/gi, " · ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metadataValue(extmetadata, key) {
  return String(extmetadata?.[key]?.value || "").trim();
}

function canonicalLicense(licenseUrl, licenseShortName) {
  const value = `${licenseUrl} ${licenseShortName}`;
  if (/creativecommons\.org\/publicdomain\/zero\/1\.0|\bCC0\b/i.test(value)) {
    return "https://creativecommons.org/publicdomain/zero/1.0/";
  }
  const urlMatch = value.match(/creativecommons\.org\/licenses\/(by-sa|by)\/(1\.0|2\.0|2\.1|2\.5|3\.0|4\.0)/i);
  const nameMatch = value.match(/\bCC\s+(BY-SA|BY)\s+(1\.0|2\.0|2\.1|2\.5|3\.0|4\.0)\b/i);
  const match = urlMatch || nameMatch;
  if (!match) return "";
  return `https://creativecommons.org/licenses/${match[1].toLowerCase()}/${match[2]}/`;
}

function qualifiedCandidate(page, source, breed) {
  const image = page?.imageinfo?.[0];
  if (!image || !["image/jpeg", "image/png", "image/webp"].includes(image.mime)) return null;
  if (!image.url || !image.thumburl || !image.descriptionurl || !image.sha1) return null;
  if (!Number.isFinite(image.width) || !Number.isFinite(image.height)) return null;
  if (Math.min(image.width, image.height) < 450 || Math.max(image.width, image.height) < 720) return null;

  const extmetadata = image.extmetadata || {};
  const rawLicenseUrl = metadataValue(extmetadata, "LicenseUrl");
  const licenseShortName = plainText(metadataValue(extmetadata, "LicenseShortName"));
  const licenseUrl = canonicalLicense(rawLicenseUrl, licenseShortName);
  if (!licenseUrl) return null;

  const attribution = plainText(metadataValue(extmetadata, "Attribution"));
  const artist = plainText(metadataValue(extmetadata, "Artist"));
  const credit = plainText(metadataValue(extmetadata, "Credit"));
  if (!licenseUrl.includes("/publicdomain/zero/") && !attribution && !artist) return null;

  const description = plainText(metadataValue(extmetadata, "ImageDescription"));
  const haystack = `${page.title} ${description}`.toLowerCase();
  if (IDENTITY_WARNINGS.some((word) => haystack.includes(word))) return null;

  const alias = SEARCH_ALIASES[breed.id] || breed.name;
  const tokens = alias.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 3 && token !== "dog");
  const tokenMatches = tokens.filter((token) => haystack.includes(token)).length;
  const suspicious = SUSPICIOUS_WORDS.filter((word) => haystack.includes(word));
  const aspect = image.width / image.height;
  const aspectScore = Math.max(0, 18 - Math.abs(aspect - (4 / 3)) * 16);
  const resolutionScore = Math.min(20, Math.log2(Math.max(image.width, image.height) / 720 + 1) * 10);
  const subjectPenalty = /\b(puppy|puppies|litter)\b/i.test(haystack) ? 8 : 0;
  const eventPenalty = /\b(show|expo|handler|judge|winner|champion)\b/i.test(haystack) ? 6 : 0;
  const score = (source === "wikidata-p18" ? 80 : source === "commons-curated" ? 70 : source === "commons-category" ? 55 : 25)
    + tokenMatches * 9
    + (/\bdog\b/i.test(haystack) ? 5 : 0)
    + aspectScore
    + resolutionScore
    - subjectPenalty
    - eventPenalty
    - suspicious.length * 90;

  return {
    id: breed.id,
    name: breed.name,
    source,
    score: Math.round(score * 10) / 10,
    title: page.title,
    description,
    media: {
      originalUrl: image.url,
      displayUrl: image.thumburl,
      sourcePageUrl: image.descriptionurl,
      mime: image.mime,
      width: image.width,
      height: image.height,
      bytes: image.size,
      sha1: image.sha1
    },
    rights: {
      licenseShortName,
      licenseUrl,
      rawLicenseUrl,
      usageTerms: plainText(metadataValue(extmetadata, "UsageTerms")),
      copyrighted: metadataValue(extmetadata, "Copyrighted"),
      attribution,
      artist,
      credit
    },
    warnings: suspicious,
    candidateFingerprint: createHash("sha256").update(`${breed.id}|${image.sha1}|${licenseUrl}`).digest("hex")
  };
}

function imageInfoParams(url) {
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size|mime|sha1|extmetadata");
  url.searchParams.set("iiextmetadatalanguage", "en");
  url.searchParams.set("iiextmetadatafilter", "Artist|Credit|Attribution|LicenseShortName|LicenseUrl|UsageTerms|Copyrighted|ImageDescription|DateTimeOriginal");
  url.searchParams.set("iiurlwidth", "960");
  return url;
}

async function pagesForTitles(titles) {
  const pages = [];
  for (const group of chunks([...new Set(titles.filter(Boolean))], 40)) {
    const url = imageInfoParams(new URL("https://commons.wikimedia.org/w/api.php"));
    url.searchParams.set("redirects", "1");
    url.searchParams.set("titles", group.join("|"));
    const response = await requestJson(url);
    pages.push(...(response.query?.pages || []));
    await pause(100);
  }
  return pages;
}

async function pagesForCategory(category) {
  if (!category) return [];
  const url = imageInfoParams(new URL("https://commons.wikimedia.org/w/api.php"));
  url.searchParams.set("generator", "categorymembers");
  url.searchParams.set("gcmtitle", `Category:${category}`);
  url.searchParams.set("gcmtype", "file");
  url.searchParams.set("gcmlimit", "60");
  const response = await requestJson(url);
  await pause(120);
  return response.query?.pages || [];
}

async function pagesForSearch(term) {
  const url = imageInfoParams(new URL("https://commons.wikimedia.org/w/api.php"));
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `\"${term}\"`);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "40");
  const response = await requestJson(url);
  await pause(120);
  return response.query?.pages || [];
}

const qids = missing.map(({ id }) => firstPassById.get(id)?.wikidataQid).filter(Boolean);
const entities = {};
for (const group of chunks(qids, 50)) {
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("ids", group.join("|"));
  url.searchParams.set("props", "claims");
  Object.assign(entities, (await requestJson(url)).entities);
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const report = [];
for (let breedIndex = 0; breedIndex < missing.length; breedIndex += 1) {
  const breed = missing[breedIndex];
  const original = firstPassById.get(breed.id);
  const qid = original?.wikidataQid;
  const p373 = qid
    ? entities[qid]?.claims?.P373?.find(({ rank, mainsnak }) => rank !== "deprecated" && mainsnak?.snaktype === "value")?.mainsnak?.datavalue?.value
    : "";
  const alias = SEARCH_ALIASES[breed.id] || breed.name;
  const categoryNames = [...new Set([CATEGORY_ALIASES[breed.id], p373, breed.name, alias.replace(/ dog$/i, "")].filter(Boolean))];
  const pages = [];

  if (CURATED_COMMONS_TITLES[breed.id]) {
    pages.push(...(await pagesForTitles(CURATED_COMMONS_TITLES[breed.id])).map((page) => ({ page, source: "commons-curated" })));
  }
  if (original?.selection?.commonsFileTitle) {
    pages.push(...(await pagesForTitles([original.selection.commonsFileTitle])).map((page) => ({ page, source: "wikidata-p18" })));
  }
  for (const category of categoryNames) {
    pages.push(...(await pagesForCategory(category)).map((page) => ({ page, source: "commons-category" })));
    if (pages.length >= 80) break;
  }
  for (const term of [...new Set([alias, breed.name, ...(EXTRA_SEARCHES[breed.id] || [])])]) {
    pages.push(...(await pagesForSearch(term)).map((page) => ({ page, source: "commons-search" })));
  }

  const bySha1 = new Map();
  for (const { page, source } of pages) {
    const candidate = qualifiedCandidate(page, source, breed);
    if (!candidate) continue;
    const existing = bySha1.get(candidate.media.sha1);
    if (!existing || candidate.score > existing.score) bySha1.set(candidate.media.sha1, candidate);
  }
  const ranked = [...bySha1.values()]
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
  const candidates = [];
  for (const pool of [
    ranked.filter(({ source }) => source === "wikidata-p18").slice(0, 1),
    ranked.filter(({ source }) => source === "commons-curated").slice(0, 1),
    ranked.filter(({ source }) => source === "commons-category").slice(0, 3),
    ranked.filter(({ source }) => source === "commons-search").slice(0, 5)
  ]) {
    for (const candidate of pool) {
      if (!candidates.some(({ media }) => media.sha1 === candidate.media.sha1)) candidates.push(candidate);
      if (candidates.length === 6) break;
    }
    if (candidates.length === 6) break;
  }
  const breedDirectory = resolve(outputDirectory, breed.id);
  await mkdir(breedDirectory, { recursive: true });

  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
    const candidate = candidates[candidateIndex];
    const extension = candidate.media.mime === "image/png" ? "png" : candidate.media.mime === "image/webp" ? "webp" : "jpg";
    const localName = `${String(candidateIndex + 1).padStart(2, "0")}-${candidate.source.replaceAll("commons-", "")}-${Math.round(candidate.score)}.${extension}`;
    const localPath = resolve(breedDirectory, localName);
    await writeFile(localPath, await requestBytes(candidate.media.displayUrl));
    await pause(180);
    candidate.reviewAsset = localPath;
  }

  if (candidates.length) {
    const boardPath = resolve(outputDirectory, `${breed.id}.jpg`);
    await run("magick", [
      "montage",
      ...candidates.slice(0, 6).map(({ reviewAsset }) => reviewAsset),
      "-thumbnail", "300x225^",
      "-gravity", "center",
      "-extent", "300x225",
      "-border", "4",
      "-bordercolor", "#171514",
      "-background", "#fff8e8",
      "-fill", "#171514",
      "-font", "/System/Library/Fonts/Supplemental/Arial.ttf",
      "-pointsize", "16",
      "-title", `${breed.name} · choose 01–06`,
      "-tile", "3x2",
      "-geometry", "+12+28",
      boardPath
    ]);
  }

  report.push({
    id: breed.id,
    name: breed.name,
    previousReason: breed.reason,
    alias,
    wikidataQid: qid || null,
    commonsCategories: categoryNames,
    candidates
  });
  process.stdout.write(`[${breedIndex + 1}/${missing.length}] ${breed.id}: ${candidates.length} qualified candidates\n`);
}

await writeFile(resolve(outputDirectory, "report.json"), `${JSON.stringify({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  rosterCount: 205,
  reviewCount: missing.length,
  policy: {
    source: "Wikimedia Commons",
    runtimeHotlinking: false,
    minimumShortEdge: 450,
    acceptedLicenses: "CC0, CC BY, or CC BY-SA with normalized canonical license URLs",
    automaticApproval: false
  },
  breeds: report
}, null, 2)}\n`);

console.log(`Backfill review packet: ${outputDirectory}/report.json`);
