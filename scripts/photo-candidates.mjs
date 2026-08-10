import { createHash } from "node:crypto";
import { BREEDS } from "../public/scripts/breed-catalog.js";

const USER_AGENT = "urdog.dev/1.0 (https://urdog.dev; photo provenance build)";
const ALLOWED_LICENSE_URLS = new Set([
  "https://creativecommons.org/publicdomain/zero/1.0/",
  "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
  "https://creativecommons.org/licenses/by/4.0/",
  "https://creativecommons.org/licenses/by/4.0",
  "https://creativecommons.org/licenses/by/3.0/",
  "https://creativecommons.org/licenses/by/3.0",
  "https://creativecommons.org/licenses/by/2.5",
  "https://creativecommons.org/licenses/by/2.0",
  "https://creativecommons.org/licenses/by-sa/4.0",
  "https://creativecommons.org/licenses/by-sa/3.0",
  "http://creativecommons.org/licenses/by-sa/3.0/",
  "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
  "https://creativecommons.org/licenses/by-sa/3.0/rs/deed.en",
  "https://creativecommons.org/licenses/by-sa/2.5",
  "https://creativecommons.org/licenses/by-sa/2.1/es/deed.en",
  "https://creativecommons.org/licenses/by-sa/2.0"
]);

async function requestJson(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/json" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function qidFromUrl(url) {
  return String(url).split("/").at(-1);
}

function metadataValue(extmetadata, key) {
  return String(extmetadata?.[key]?.value || "").trim();
}

function plainText(value) {
  return String(value)
    .replace(/<br\s*\/?\s*>/gi, " · ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const sparql = new URL("https://query.wikidata.org/sparql");
sparql.searchParams.set("query", "SELECT ?item ?akc WHERE { ?item wdt:P13890 ?akc . }");
sparql.searchParams.set("format", "json");
const rows = (await requestJson(sparql)).results.bindings;
const qidsBySlug = new Map();

for (const row of rows) {
  const slug = row.akc.value;
  const values = qidsBySlug.get(slug) || [];
  values.push(qidFromUrl(row.item.value));
  qidsBySlug.set(slug, values);
}

const roster = BREEDS.map((breed) => {
  const matchedSlug = breed.sourceSlugs.find((slug) => qidsBySlug.has(slug));
  const qids = matchedSlug ? qidsBySlug.get(matchedSlug) : [];
  return {
    id: breed.id,
    name: breed.name,
    sourceSlug: matchedSlug || breed.sourceSlugs[0],
    wikidataQid: qids?.[0] || null,
    qidAmbiguity: qids?.length > 1 ? qids : []
  };
});

const entities = {};
for (const qids of chunks(roster.map(({ wikidataQid }) => wikidataQid).filter(Boolean), 50)) {
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("ids", qids.join("|"));
  url.searchParams.set("props", "claims|labels");
  url.searchParams.set("languages", "en");
  Object.assign(entities, (await requestJson(url)).entities);
}

const candidates = roster.map((breed) => {
  const statements = breed.wikidataQid ? entities[breed.wikidataQid]?.claims?.P18 || [] : [];
  const usable = statements
    .filter(({ rank, mainsnak }) => rank !== "deprecated" && mainsnak?.snaktype === "value" && mainsnak?.datavalue?.value)
    .sort((left, right) => {
      const rank = { preferred: 0, normal: 1 };
      return (rank[left.rank] ?? 2) - (rank[right.rank] ?? 2) || String(left.id).localeCompare(String(right.id));
    });
  const selected = usable[0];
  return {
    ...breed,
    statementId: selected?.id || null,
    commonsFileTitle: selected ? `File:${selected.mainsnak.datavalue.value}` : null
  };
});

const commonsByTitle = new Map();
for (const titles of chunks(candidates.map(({ commonsFileTitle }) => commonsFileTitle).filter(Boolean), 40)) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", titles.join("|"));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size|mime|sha1|extmetadata");
  url.searchParams.set("iiextmetadatalanguage", "en");
  url.searchParams.set("iiextmetadatafilter", "Artist|Credit|Attribution|LicenseShortName|LicenseUrl|UsageTerms|Copyrighted|ImageDescription|DateTimeOriginal");
  url.searchParams.set("iiurlwidth", "1200");
  const result = await requestJson(url);
  for (const page of result.query?.pages || []) {
    commonsByTitle.set(page.title, page);
  }
}

const records = candidates.map((candidate) => {
  if (!candidate.wikidataQid) return { ...candidate, status: "missing-qid", reasons: ["No exact AKC-slug Wikidata mapping."] };
  if (!candidate.commonsFileTitle) return { ...candidate, status: "missing-p18", reasons: ["No usable Wikidata P18 statement."] };
  const page = commonsByTitle.get(candidate.commonsFileTitle);
  const image = page?.imageinfo?.[0];
  if (!image) return { ...candidate, status: "missing-commons-file", reasons: ["Commons did not return image metadata."] };

  const rights = {
    licenseShortName: plainText(metadataValue(image.extmetadata, "LicenseShortName")),
    licenseUrl: metadataValue(image.extmetadata, "LicenseUrl"),
    usageTerms: plainText(metadataValue(image.extmetadata, "UsageTerms")),
    copyrighted: metadataValue(image.extmetadata, "Copyrighted"),
    attribution: plainText(metadataValue(image.extmetadata, "Attribution")),
    artist: plainText(metadataValue(image.extmetadata, "Artist")),
    credit: plainText(metadataValue(image.extmetadata, "Credit"))
  };
  const reasons = [];
  if (!["image/jpeg", "image/png", "image/webp"].includes(image.mime)) reasons.push("Unsupported image MIME.");
  if (!image.url || !image.thumburl || !image.descriptionurl) reasons.push("Missing required media URL.");
  if (!Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width < 400 || image.height < 400) reasons.push("Image is under 400px on one edge.");
  if (!ALLOWED_LICENSE_URLS.has(rights.licenseUrl)) reasons.push("License URL is outside the narrow allowlist.");
  if (!rights.licenseShortName || !rights.usageTerms) reasons.push("Incomplete license metadata.");
  if (rights.licenseUrl !== "https://creativecommons.org/publicdomain/zero/1.0/" && !rights.attribution && !rights.artist) reasons.push("CC BY image has no usable creator credit.");

  return {
    id: candidate.id,
    name: candidate.name,
    sourceSlug: candidate.sourceSlug,
    wikidataQid: candidate.wikidataQid,
    qidAmbiguity: candidate.qidAmbiguity,
    selection: {
      method: "wikidata-p18",
      statementId: candidate.statementId,
      commonsFileTitle: candidate.commonsFileTitle
    },
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
    rights,
    status: reasons.length ? "rejected" : "needs-visual-review",
    reasons,
    candidateFingerprint: createHash("sha256").update(`${candidate.id}|${image.sha1}|${rights.licenseUrl}`).digest("hex")
  };
});

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  rosterCount: BREEDS.length,
  licensePolicy: { allowedLicenseUrls: [...ALLOWED_LICENSE_URLS] },
  counts: records.reduce((counts, record) => ({ ...counts, [record.status]: (counts[record.status] || 0) + 1 }), {}),
  breeds: records
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
