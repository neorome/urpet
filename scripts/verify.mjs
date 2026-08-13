import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { BREEDS } from "../public/scripts/breed-catalog.js";
import { PET_LANES, PET_PROFILES } from "../public/scripts/all-pets-engine.js";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "public");
const requiredAssets = [
  "index.html",
  "dogs/index.html",
  "breeds/index.html",
  "photo-credits/index.html",
  "404.html",
  "styles.css",
  "scripts/all-pets.js",
  "scripts/all-pets-engine.js",
  "scripts/app.js",
  "scripts/breed-engine.js",
  "scripts/breed-catalog.js",
  "scripts/breed-traits.js",
  "scripts/breed-photos.js",
  "scripts/rescue-search.js",
  "scripts/rescue-map.js",
  "scripts/honduras-rescues.js",
  "scripts/external-links.js",
  "scripts/catalog.js",
  "scripts/dog-engine.js",
  "data/breed-photos.json",
  "favicon.svg",
  "apple-touch-icon.png",
  "social-card.svg",
  "social-card.png",
  "robots.txt",
  "sitemap.xml",
  "site.webmanifest",
  "vendor/leaflet/leaflet.css",
  "vendor/leaflet/leaflet.js",
  "vendor/leaflet/LICENSE",
  "vendor/leaflet/images/marker-icon.png",
  "vendor/leaflet/images/marker-icon-2x.png",
  "vendor/leaflet/images/marker-shadow.png"
];

await Promise.all(requiredAssets.map((file) => access(resolve(publicDir, file))));

const readPublic = (path) => readFile(resolve(publicDir, path), "utf8");
const [
  home,
  dogs,
  catalog,
  credits,
  css,
  allPetsApp,
  allPetsEngine,
  dogApp,
  dogEngine,
  rescueSearch,
  rescueMap,
  hondurasRescues,
  externalLinks,
  robots,
  sitemap,
  manifestText,
  photoManifestText,
  worker,
  packageText,
  migration,
  prd
] = await Promise.all([
  readPublic("index.html"),
  readPublic("dogs/index.html"),
  readPublic("breeds/index.html"),
  readPublic("photo-credits/index.html"),
  readPublic("styles.css"),
  readPublic("scripts/all-pets.js"),
  readPublic("scripts/all-pets-engine.js"),
  readPublic("scripts/app.js"),
  readPublic("scripts/breed-engine.js"),
  readPublic("scripts/rescue-search.js"),
  readPublic("scripts/rescue-map.js"),
  readPublic("scripts/honduras-rescues.js"),
  readPublic("scripts/external-links.js"),
  readPublic("robots.txt"),
  readPublic("sitemap.xml"),
  readPublic("site.webmanifest"),
  readPublic("data/breed-photos.json"),
  readFile(resolve(root, "worker.js"), "utf8"),
  readFile(resolve(root, "package.json"), "utf8"),
  readFile(resolve(root, "migrations", "0001_community.sql"), "utf8"),
  readFile(resolve(root, "docs", "urpet-prd.html"), "utf8")
]);

const manifest = JSON.parse(manifestText);
const photoManifest = JSON.parse(photoManifestText);
const packageJson = JSON.parse(packageText);

function metadata(html, canonical) {
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1] || "";
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1] || "";
  assert.ok(title.length >= 35 && title.length <= 65, `${canonical} title must be 35–65 characters, got ${title.length}`);
  assert.ok(description.length >= 115 && description.length <= 165, `${canonical} description must be 115–165 characters, got ${description.length}`);
  assert.match(html, /<html lang="en">/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replaceAll(".", "\\.").replaceAll("/", "\\/")}">`));
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${canonical} must have exactly one h1`);
  assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//i, `${canonical} must not load third-party scripts initially`);
  assert.doesNotMatch(html, /<img[^>]+src="https?:\/\//i, `${canonical} must not hotlink third-party images`);
  return { title, description };
}

const homeMeta = metadata(home, "https://urdog.dev/");
metadata(dogs, "https://urdog.dev/dogs/");
metadata(catalog, "https://urdog.dev/breeds/");
metadata(credits, "https://urdog.dev/photo-credits/");

assert.equal(packageJson.name, "urpet");
assert.equal(manifest.name, "urpet — pet research matcher");
assert.equal(manifest.short_name, "urpet");
for (const page of [home, dogs, catalog, credits]) {
  assert.match(page, />urpet</);
  assert.doesNotMatch(page, /\bur dog\b/i);
}
assert.match(prd, /Option A/);
assert.match(prd, /Option B/);
assert.match(prd, /Option C · selected/);
assert.equal((prd.match(/class="device"/g) || []).length, 3, "PRD needs one desktop mockup for each option");
assert.equal((prd.match(/class="device mobile"/g) || []).length, 3, "PRD needs one mobile mockup for each option");
assert.match(prd, /Product and repository name: urpet/);
assert.doesNotMatch(prd, /\/Users\/|CEREBRAS_API_KEY\s*=|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/);

const jsonLd = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || "{}");
const appNode = jsonLd["@graph"].find((entry) => entry["@type"] === "WebApplication");
const siteNode = jsonLd["@graph"].find((entry) => entry["@type"] === "WebSite");
assert.equal(siteNode.url, "https://urdog.dev/");
assert.equal(siteNode.name, "urpet");
assert.equal(appNode.applicationCategory, "LifestyleApplication");
assert.equal(appNode.isAccessibleForFree, true);
assert.equal(appNode.offers.price, "0");

assert.equal(PET_LANES.length, 10);
assert.equal(PET_PROFILES.length, 11);
assert.equal((home.match(/class="pet-step"/g) || []).length, 9, "all-pets flow must have nine progressive questions");
assert.equal((home.match(/name="lanes"/g) || []).length, 10, "all-pets flow must show exactly ten lanes");
assert.equal((home.match(/<legend>/g) || []).length, 9);
for (const id of [...home.matchAll(/type="(?:radio|checkbox)"[^>]+id="([^"]+)"/g)].map((match) => match[1])) {
  assert.match(home, new RegExp(`<label[^>]+for="${id}"`), `All-pets choice ${id} needs a label`);
}
assert.match(home, /id="pet-result"[^>]*hidden/);
assert.match(home, /id="community-guide"[^>]*hidden/);
assert.match(home, /id="reptile-gate"[^>]*hidden/);
assert.match(home, /how “urpet” support is used/);
assert.match(home, /legacy name “urdog”/);
assert.match(home, /75% is earmarked/);
assert.match(home, /Buy Me a Coffee cannot purchase Cerebras credits automatically/);
assert.match(home, /mailto:team@neorome\.dev\?subject=urpet%20pet%20suggestion/);
assert.match(home, /href="\/dogs\/">dog matcher<\/a>/);
assert.match(home, /href="https:\/\/buymeacoffee\.com\/baneydonovan"/);
assert.ok(home.indexOf("buymeacoffee.com/baneydonovan") > home.indexOf('id="pet-result"'), "support must follow the complete result");
assert.match(allPetsApp, /fetch\("\/api\/community\/status"/);
assert.match(allPetsApp, /encodeGuideAnswerIds/);
assert.match(allPetsApp, /prefers-reduced-motion/);
assert.match(allPetsEngine, /hardConflicts/);
assert.match(allPetsEngine, /CDC advises households/);

assert.equal((dogs.match(/<fieldset\b/g) || []).length, 9, "dog module must preserve nine questions");
assert.equal((dogs.match(/type="radio"/g) || []).length, 29, "dog module must preserve its radio choices");
assert.equal((dogs.match(/type="checkbox"/g) || []).length, 4, "dog household context must remain combinable");
assert.match(dogs, /id="result"[^>]*hidden/);
assert.match(dogs, /id="save-brief"/);
assert.match(dogs, /id="reset-dialog"/);
assert.match(dogs, /id="rescue-use-location"/);
assert.match(dogs, /id="rescue-map"[^>]+role="region"/);
assert.match(dogs, /No map service is contacted before u do/);
assert.match(dogs, /https:\/\/www\.petfinder\.com\/search\/dogs-for-adoption\//);
assert.match(dogApp, /`\/dogs\/\?\$\{query\}#result`/);
assert.match(dogApp, /new URL\("\/dogs\/"/);
assert.match(dogApp, /urdog-fit-briefs-v1/, "legacy storage key must preserve saved briefs");

assert.equal(BREEDS.length, 205);
assert.equal(photoManifest.approvedCount, 205);
assert.equal(photoManifest.missingCount, 0);
assert.equal((catalog.match(/data-breed(?:\s|>)/g) || []).length, 205);
assert.equal((catalog.match(/class="catalog-photo"/g) || []).length, 205);
assert.doesNotMatch(catalog, /catalog-photo--fallback/);
for (const breed of BREEDS) {
  const escapedName = breed.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(catalog, new RegExp(`<strong>${escapedName}<\\/strong>`));
}
assert.equal((credits.match(/class="credit-card"/g) || []).length, 205);
assert.equal((credits.match(/>Commons source file/g) || []).length, 205);
assert.equal((credits.match(/>license terms/g) || []).length, 205);
assert.match(credits, /github\.com\/neorome\/urpet\/issues\/new/);

assert.match(robots, /^User-agent: \*/m);
assert.match(robots, /Sitemap: https:\/\/urdog\.dev\/sitemap\.xml/);
for (const location of [
  "https://urdog.dev/",
  "https://urdog.dev/dogs/",
  "https://urdog.dev/breeds/",
  "https://urdog.dev/photo-credits/"
]) {
  assert.match(sitemap, new RegExp(`<loc>${location.replaceAll(".", "\\.").replaceAll("/", "\\/")}<\\/loc>`));
}
assert.equal((sitemap.match(/<url>/g) || []).length, 4);
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
for (const icon of manifest.icons) await access(resolve(publicDir, icon.src.replace(/^\//, "")));

assert.match(worker, /www\.urdog\.dev/);
assert.match(worker, /\["\/breeds", "\/dogs", "\/photo-credits"\]/);
assert.match(worker, /\/api\/community\/status/);
assert.match(worker, /verifyBmcSignature/);
assert.match(worker, /qualifyingSupportNote/);
assert.match(worker, /TURNSTILE_HOSTNAMES/);
assert.match(worker, /GUIDE_RATE_LIMIT/);
assert.match(worker, /Content-Security-Policy/);
assert.match(worker, /https:\/\/challenges\.cloudflare\.com/);
assert.match(worker, /X-Robots-Tag/);
assert.match(worker, /geolocation=\(self\)/);
assert.match(migration, /owner_seed_ten_dollar_limit/);
for (const tableName of ["support_payments", "support_events", "guide_usage"]) {
  const columns = migration.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName} \\(([\\s\\S]*?)\\n\\);`))?.[1] || "";
  assert.doesNotMatch(columns, /support_note|\bemail\b|ip_address|prompt_text|model_output/);
}

assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /@media print/);
assert.match(css, /@media \(max-width: 390px\)/);
assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, "CSS braces must balance");
assert.match(dogApp, /navigator\.share/);
assert.match(dogApp, /navigator\.clipboard/);
assert.match(dogApp, /focusAndReveal\(resultTitle, \{ instant \}\)/);
assert.doesNotMatch(dogApp, /setTimeout\(/);
assert.match(dogEngine, /import \{ BREEDS, CATALOG_VERSION \}/);
assert.match(rescueSearch, /https:\/\/nominatim\.openstreetmap\.org\/search/);
assert.doesNotMatch(rescueSearch, /geocodeCoords|overpass-turbo|overpass-api/);
assert.match(rescueMap, /navigator\.geolocation\.getCurrentPosition/);
assert.match(rescueMap, /tile\.openstreetmap\.org/);
assert.match(rescueMap, /scrollWheelZoom: false/);
assert.match(rescueMap, /parseDirectoryResults\(HONDURAS_RESCUES, origin\)/);
assert.match(hondurasRescues, /Tegucigalpa/);
assert.match(hondurasRescues, /San Pedro Sula/);
assert.match(externalLinks, /showModal\(\)/);
assert.match(externalLinks, /stay here/);
assert.match(dogApp, /external-links\.js/);
assert.match(catalog, /scripts\/external-links\.js/);
assert.match(credits, /scripts\/external-links\.js/);

const budgets = {
  "index.html": 60_000,
  "dogs/index.html": 60_000,
  "breeds/index.html": 300_000,
  "photo-credits/index.html": 300_000,
  "styles.css": 120_000,
  "scripts/all-pets.js": 24_000,
  "scripts/all-pets-engine.js": 30_000,
  "scripts/app.js": 28_000,
  "scripts/breed-engine.js": 22_000,
  "scripts/rescue-search.js": 9_000,
  "scripts/rescue-map.js": 20_000,
  "scripts/honduras-rescues.js": 6_000,
  "scripts/external-links.js": 9_000,
  "scripts/breed-catalog.js": 25_000,
  "scripts/breed-traits.js": 35_000,
  "scripts/breed-photos.js": 170_000,
  "scripts/dog-engine.js": 45_000,
  "social-card.png": 500_000
};

for (const [file, maxBytes] of Object.entries(budgets)) {
  const { size } = await stat(resolve(publicDir, file));
  assert.ok(size <= maxBytes, `${file} exceeds its ${maxBytes.toLocaleString()} byte budget (${size.toLocaleString()} bytes)`);
}

console.log(
  `Static verification passed: urpet has ${PET_LANES.length} reviewed lanes, ${PET_PROFILES.length} profiles, ${BREEDS.length} dog breeds, ${photoManifest.approvedCount} credited photos, and a ${homeMeta.title.length}-character title.`
);
