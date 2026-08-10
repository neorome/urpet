import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { BREEDS } from "../public/scripts/breed-catalog.js";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "public");
const requiredAssets = [
  "index.html",
  "breeds/index.html",
  "photo-credits/index.html",
  "404.html",
  "styles.css",
  "scripts/app.js",
  "scripts/breed-engine.js",
  "scripts/breed-catalog.js",
  "scripts/breed-traits.js",
  "scripts/breed-photos.js",
  "scripts/rescue-search.js",
  "scripts/rescue-map.js",
  "scripts/external-links.js",
  "scripts/catalog.js",
  "scripts/dog-engine.js",
  "data/breed-photos.json",
  "favicon.svg",
  "apple-touch-icon.png",
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

const [
  home,
  catalog,
  credits,
  css,
  app,
  engine,
  rescueSearch,
  rescueMap,
  externalLinks,
  robots,
  sitemap,
  manifestText,
  photoManifestText,
  worker
] = await Promise.all([
  readFile(resolve(publicDir, "index.html"), "utf8"),
  readFile(resolve(publicDir, "breeds", "index.html"), "utf8"),
  readFile(resolve(publicDir, "photo-credits", "index.html"), "utf8"),
  readFile(resolve(publicDir, "styles.css"), "utf8"),
  readFile(resolve(publicDir, "scripts", "app.js"), "utf8"),
  readFile(resolve(publicDir, "scripts", "breed-engine.js"), "utf8"),
  readFile(resolve(publicDir, "scripts", "rescue-search.js"), "utf8"),
  readFile(resolve(publicDir, "scripts", "rescue-map.js"), "utf8"),
  readFile(resolve(publicDir, "scripts", "external-links.js"), "utf8"),
  readFile(resolve(publicDir, "robots.txt"), "utf8"),
  readFile(resolve(publicDir, "sitemap.xml"), "utf8"),
  readFile(resolve(publicDir, "site.webmanifest"), "utf8"),
  readFile(resolve(publicDir, "data", "breed-photos.json"), "utf8"),
  readFile(resolve(root, "worker.js"), "utf8")
]);

const manifest = JSON.parse(manifestText);
const photoManifest = JSON.parse(photoManifestText);

function metadata(html, canonical) {
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1] || "";
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1] || "";
  assert.ok(title.length >= 35 && title.length <= 60, `${canonical} title must be 35–60 characters, got ${title.length}`);
  assert.ok(description.length >= 120 && description.length <= 160, `${canonical} description must be 120–160 characters, got ${description.length}`);
  assert.match(html, /<html lang="en">/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replaceAll(".", "\\.").replaceAll("/", "\\/")}">`));
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${canonical} must have exactly one h1`);
  assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//i, `${canonical} must not load third-party scripts`);
  assert.doesNotMatch(html, /<img[^>]+src="https?:\/\//i, `${canonical} must not hotlink third-party images`);
  return { title, description };
}

const homeMeta = metadata(home, "https://urdog.dev/");
metadata(catalog, "https://urdog.dev/breeds/");
metadata(credits, "https://urdog.dev/photo-credits/");

const jsonLdText = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
assert.ok(jsonLdText, "Home JSON-LD must be present");
const jsonLd = JSON.parse(jsonLdText);
const appNode = jsonLd["@graph"].find((entry) => entry["@type"] === "WebApplication");
const siteNode = jsonLd["@graph"].find((entry) => entry["@type"] === "WebSite");
assert.equal(siteNode.url, "https://urdog.dev/");
assert.equal(appNode.applicationCategory, "LifestyleApplication");
assert.equal(appNode.offers.price, "0");
assert.equal(appNode.offers.priceCurrency, "USD");

assert.match(home, /<meta name="robots" content="index, follow,/);
assert.match(home, /<meta property="og:image" content="https:\/\/urdog\.dev\/social-card\.png">/);
assert.match(home, /<meta name="twitter:card" content="summary_large_image">/);
assert.equal((home.match(/<fieldset\b/g) || []).length, 9, "the matcher must expose nine questions");
assert.equal((home.match(/type="radio"/g) || []).length, 29, "the matcher must expose all 29 exclusive choices");
assert.equal((home.match(/type="checkbox"/g) || []).length, 4, "household context must expose four combinable choices");
assert.equal((home.match(/<legend>/g) || []).length, 9, "every matcher question needs a legend");
for (const id of [...home.matchAll(/type="(?:radio|checkbox)"[^>]+id="([^"]+)"/g)].map((match) => match[1])) {
  assert.match(home, new RegExp(`<label[^>]+for="${id}"`), `Choice ${id} needs a label`);
}
assert.match(home, /id="result"[^>]*hidden/);
assert.ok(home.indexOf('id="result-actions"') < 0, "result actions use a labeled class, not a duplicate landmark id");
assert.ok(home.indexOf('id="save-brief"') < home.indexOf('id="breed-cards"'), "brief actions must appear before the long breed cards");
assert.match(home, /id="reset-answers"/);
assert.match(home, /id="reset-dialog"/);
assert.match(home, /Saved briefs stay on this device/);
assert.match(home, /id="jump-to-rescue"/);
assert.match(home, /id="copy-questions"/);
assert.match(home, /id="clear-saved"/);
assert.match(home, /id="rescue-use-location"/);
assert.match(home, /id="rescue-map"[^>]+role="region"/);
assert.match(home, /id="rescue-list"/);
assert.match(home, /No map service is contacted before u do/);
assert.match(home, /OpenStreetMap contributors/);
assert.doesNotMatch(home, /overpass-turbo\.eu|rescue-map-link/);
assert.match(home, /https:\/\/www\.petfinder\.com\/search\/dogs-for-adoption\//);
assert.match(home, /mailto:team@neorome\.dev\?subject=ur%20dog%20support/);
assert.match(home, /mailto:team@neorome\.dev\?subject=Sponsor%20ur%20dog/);
assert.match(home, /href="\/breeds\/">all 205 breeds<\/a>/);
assert.match(home, /All 205 AKC-recognized breeds/);
assert.match(home, /href="https:\/\/buymeacoffee\.com\/baneydonovan"/);
assert.ok(
  home.indexOf("buymeacoffee.com/baneydonovan") > home.indexOf('id="result"'),
  "the tip request must follow the completed-result section"
);
assert.doesNotMatch(home, /data tricks|AI-powered|scientifically proven|compatibility score|no account|no uploads|no fake perfect/i);
for (const page of [home, catalog, credits, app]) {
  assert.doesNotMatch(page, /staff illustration|not a breed portrait|no mystery|optional\. no guilt/i);
}

assert.equal(BREEDS.length, 205);
assert.equal(photoManifest.approvedCount, 205);
assert.equal(photoManifest.missingCount, 0);
assert.equal((catalog.match(/data-breed(?:\s|>)/g) || []).length, 205, "catalog page must contain 205 crawlable rows");
assert.equal((catalog.match(/class="catalog-card"/g) || []).length, 205);
assert.equal((catalog.match(/class="catalog-photo"/g) || []).length, 205);
assert.doesNotMatch(catalog, /catalog-photo--fallback/);
for (const breed of BREEDS) {
  const escapedName = breed.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(catalog, new RegExp(`<strong>${escapedName}<\\/strong>`));
}

assert.equal((credits.match(/class="credit-card"/g) || []).length, 205);
assert.equal((credits.match(/>Commons source file/g) || []).length, 205);
assert.equal((credits.match(/>license terms/g) || []).length, 205);
assert.match(credits, /205 credited photos/i);
assert.doesNotMatch(app, /breed-photo--fallback/);
assert.doesNotMatch(css, /breed-photo--fallback|catalog-photo--fallback/);

assert.match(robots, /^User-agent: \*/m);
assert.match(robots, /^Allow: \/$/m);
assert.match(robots, /Sitemap: https:\/\/urdog\.dev\/sitemap\.xml/);
for (const location of [
  "https://urdog.dev/",
  "https://urdog.dev/breeds/",
  "https://urdog.dev/photo-credits/"
]) {
  assert.match(sitemap, new RegExp(`<loc>${location.replaceAll(".", "\\.").replaceAll("/", "\\/")}<\\/loc>`));
}
assert.equal((sitemap.match(/<url>/g) || []).length, 3);

assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.match(manifest.description, /205-breed lifestyle matcher/);
assert.equal(manifest.icons.length, 2);
for (const icon of manifest.icons) {
  await access(resolve(publicDir, icon.src.replace(/^\//, "")));
}

assert.match(worker, /www\.urdog\.dev/);
assert.match(worker, /Content-Security-Policy/);
assert.match(worker, /X-Robots-Tag/);
assert.match(worker, /img-src 'self' data: https:\/\/tile\.openstreetmap\.org/);
assert.match(worker, /geolocation=\(self\)/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /@media print/);
assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, "CSS braces must balance");
assert.match(app, /navigator\.share/);
assert.match(app, /navigator\.clipboard/);
assert.match(app, /BREED_PHOTOS/);
assert.match(app, /focusAndReveal\(resultTitle, \{ instant \}\)/);
assert.match(app, /location\.hash === "#result"/);
assert.match(app, /Saved briefs cleared from this browser\./);
assert.doesNotMatch(app, /setTimeout\(/, "result handoff must not depend on a timer");
assert.match(engine, /import \{ BREEDS, CATALOG_VERSION \}/);
assert.match(rescueSearch, /https:\/\/nominatim\.openstreetmap\.org\/search/);
assert.doesNotMatch(rescueSearch, /geocodeCoords|overpass-turbo|overpass-api/);
assert.match(rescueSearch, /animal shelter/);
assert.match(rescueSearch, /addressdetails/);
assert.match(rescueSearch, /extratags/);
assert.match(rescueMap, /navigator\.geolocation\.getCurrentPosition/);
assert.match(rescueMap, /tile\.openstreetmap\.org/);
assert.match(rescueMap, /script\.src = LEAFLET_SCRIPT/);
assert.match(rescueMap, /Icon\.Default\.imagePath = "\/vendor\/leaflet\/images\/"/);
assert.match(rescueMap, /scrollWheelZoom: false/);
assert.doesNotMatch(app, /window\.open|buildRescueMapUrl/);
assert.match(externalLinks, /showModal\(\)/);
assert.match(externalLinks, /stay here/);
assert.match(externalLinks, /noopener noreferrer external/);
assert.match(app, /external-links\.js/);
assert.match(catalog, /scripts\/external-links\.js/);
assert.match(credits, /scripts\/external-links\.js/);

const budgets = {
  "index.html": 55_000,
  "breeds/index.html": 300_000,
  "photo-credits/index.html": 300_000,
  "styles.css": 105_000,
  "scripts/app.js": 28_000,
  "scripts/breed-engine.js": 22_000,
  "scripts/rescue-search.js": 8_000,
  "scripts/rescue-map.js": 20_000,
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
  `Static verification passed: 205 crawlable breeds, ${photoManifest.approvedCount} credited photos, nine matcher questions, ${homeMeta.title.length}-character title, and ${homeMeta.description.length}-character description.`
);
