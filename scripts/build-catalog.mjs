import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  BREEDS,
  CATALOG_VERSION,
  GROUP_SOURCE,
  REGISTRY_EFFECTIVE_ON,
  REGISTRY_SOURCE
} from "../public/scripts/breed-catalog.js";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "public", "breeds", "index.html");
const photoManifest = JSON.parse(
  await readFile(resolve(root, "public", "data", "breed-photos.json"), "utf8")
);
const photosByBreed = new Map(photoManifest.breeds.map((photo) => [photo.id, photo]));

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayGroup(group) {
  return group.replace("-", " ");
}

function breedItem(breed) {
  const search = [breed.name, breed.group, ...breed.secondaryGroups].join(" ").toLowerCase();
  const photo = photosByBreed.get(breed.id);
  if (!photo) throw new Error(`Missing reviewed photo for ${breed.id}.`);
  const media = `<figure class="catalog-photo">
              <img src="${escapeHtml(photo.localPath)}" alt="${escapeHtml(photo.alt)}" width="720" height="540" loading="lazy" decoding="async">
              <figcaption><a href="/photo-credits/#${escapeHtml(breed.id)}">${escapeHtml(photo.rights.licenseShortName)} photo credit</a></figcaption>
            </figure>`;
  return `          <li class="catalog-card" data-breed data-name="${escapeHtml(search)}" data-group="${escapeHtml(breed.group)}">
${media}
            <div class="catalog-card__top">
              <span>${escapeHtml(displayGroup(breed.group))} group</span>
              <strong>${escapeHtml(breed.name)}</strong>
            </div>
            <dl class="catalog-facts">
              <div><dt>adult size</dt><dd>${escapeHtml(breed.sizes.join(" / "))}</dd></div>
              <div><dt>activity</dt><dd>${escapeHtml(breed.activity.replace("-", " "))}</dd></div>
              <div><dt>training</dt><dd>${escapeHtml(breed.training)}</dd></div>
              <div><dt>coat</dt><dd>${escapeHtml(breed.grooming)}</dd></div>
              <div><dt>shedding</dt><dd>${escapeHtml(breed.shedding)}</dd></div>
            </dl>
            <p>${escapeHtml(breed.caution)}</p>
            <a href="${escapeHtml(breed.source)}" target="_blank" rel="noopener noreferrer external">research this breed at AKC <span aria-hidden="true">↗</span></a>
          </li>`;
}

function renderPage() {
  const title = "All 205 Dog Breeds: Browse the Complete List | urpet";
  const description = "Browse all 205 AKC-recognized dog breeds by group, size, activity, training, grooming, and shedding, then build a shortlist for your lifestyle.";
  const list = BREEDS.map(breedItem).join("\n");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="theme-color" content="#FFF8E8">
    <meta name="color-scheme" content="light">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="urpet">
    <link rel="canonical" href="https://urdog.dev/breeds/">
    <link rel="alternate" hreflang="en" href="https://urdog.dev/breeds/">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="stylesheet" href="/styles.css?v=20260821a">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="urpet">
    <meta property="og:url" content="https://urdog.dev/breeds/">
    <meta property="og:title" content="all 205 dog breeds — urpet">
    <meta property="og:description" content="Browse the complete breed desk, then build a shortlist around your actual life.">
    <meta property="og:image" content="https://urdog.dev/social-card.png">
    <meta property="og:image:alt" content="urpet breed matcher with a playful illustrated dog at the match desk">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": "https://urdog.dev/breeds/#page",
        "url": "https://urdog.dev/breeds/",
        "name": "All 205 Dog Breeds",
        "description": "${description}",
        "isPartOf": {"@id": "https://urdog.dev/#website"},
        "mainEntity": {
          "@type": "ItemList",
          "name": "205 AKC-recognized dog breeds",
          "numberOfItems": 205
        }
      }
    </script>
  </head>
  <body class="catalog-page">
    <a class="skip-link" href="#catalog">skip to all breeds</a>
    <header class="site-header" aria-label="Primary">
      <a class="brand" href="/" aria-label="urpet home">
        <span class="brand__tag" aria-hidden="true"><span>u</span></span>
        <span class="brand__words">urpet</span>
      </a>
      <a class="header-link" href="/dogs/">build my dog fit brief <span aria-hidden="true">→</span></a>
    </header>

    <main id="catalog">
      <section class="catalog-hero" aria-labelledby="catalog-title">
        <p class="eyebrow"><span aria-hidden="true">✦</span> the whole dog desk</p>
        <h1 id="catalog-title">all 205<br><em>dog breeds.</em></h1>
        <p>Browse every breed currently recognized by the American Kennel Club, then compare the care bands with your routine.</p>
        <div class="catalog-proof">
          <strong>205 / 205</strong>
          <span>registry breeds present</span>
          <small>registry effective ${REGISTRY_EFFECTIVE_ON}; catalog reviewed ${CATALOG_VERSION}</small>
        </div>
      </section>

      <section class="catalog-controls" aria-label="Filter the breed catalog">
        <label for="catalog-search">find a breed</label>
        <input id="catalog-search" type="search" inputmode="search" autocomplete="off" placeholder="try “poodle” or “hound”">
        <label for="catalog-group">group</label>
        <select id="catalog-group">
          <option value="all">all groups</option>
          <option value="sporting">sporting</option>
          <option value="hound">hound</option>
          <option value="working">working</option>
          <option value="terrier">terrier</option>
          <option value="toy">toy</option>
          <option value="non-sporting">non-sporting</option>
          <option value="herding">herding</option>
        </select>
        <p id="catalog-count" aria-live="polite">showing all 205 breeds</p>
        <button class="button button--text" id="catalog-reset" type="button" hidden>clear filters</button>
      </section>

      <ol class="catalog-list" id="breed-catalog">
${list}
      </ol>
      <p class="catalog-empty" id="catalog-empty" hidden>No breed found. Try fewer letters or reset the group.</p>

      <section class="catalog-method" aria-labelledby="catalog-method-title">
        <div>
          <p class="section-kicker">how to read the catalog</p>
          <h2 id="catalog-method-title">broad bands for a first cut.</h2>
        </div>
        <div>
          <p><strong>Activity</strong> describes a sustainable routine. <strong>Training</strong> describes ongoing household involvement. <strong>Coat</strong> and <strong>shedding</strong> are separate jobs; shedding level is not an allergy guarantee.</p>
          <p>The breed roster and groups come from the <a href="${REGISTRY_SOURCE}" target="_blank" rel="noopener noreferrer external">official AKC recognition roster</a> and <a href="${GROUP_SOURCE}" target="_blank" rel="noopener noreferrer external">current group list</a>. Fit bands are urpet editorial guidance; each card links to the AKC breed profile.</p>
        </div>
      </section>

      <section class="catalog-next" aria-labelledby="catalog-next-title">
        <p class="section-kicker">need a shortlist?</p>
        <h2 id="catalog-next-title">match the list to ur Tuesday.</h2>
        <p>Answer nine questions to find three breeds to research.</p>
        <a class="button button--primary" href="/dogs/">build my dog fit brief <span aria-hidden="true">→</span></a>
      </section>

      <aside class="catalog-support">
        <p><strong>found this useful?</strong> A coffee keeps the catalog reviewed.</p>
        <a class="button button--coffee" href="https://buymeacoffee.com/baneydonovan" target="_blank" rel="noopener noreferrer external">keep the match desk open <span aria-hidden="true">↗</span></a>
      </aside>
    </main>

    <footer class="site-footer">
      <a class="brand brand--footer" href="/" aria-label="urpet home">
        <span class="brand__tag" aria-hidden="true"><span>u</span></span>
        <span class="brand__words">urpet</span>
      </a>
      <p>research first. meet the dog. keep the promise.</p>
      <nav class="footer-contact" aria-label="Research links">
        <a href="/">all-pets matcher</a>
        <a href="mailto:team@neorome.dev?subject=urpet%20pet%20suggestion">suggest a pet</a>
      </nav>
      <p>Educational breed research, not professional advice.</p>
    </footer>
    <script src="/scripts/catalog.js?v=20260811a" defer></script>
    <script type="module" src="/scripts/external-links.js?v=20260811a"></script>
    <script type="module" src="/scripts/pwa.js?v=20260821a"></script>
  </body>
</html>
`;
}

const html = renderPage();
if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8");
  if (current !== html) throw new Error("public/breeds/index.html is stale; run npm run build:catalog");
  console.log("Breed catalog page is current.");
} else {
  await mkdir(resolve(root, "public", "breeds"), { recursive: true });
  await writeFile(outputPath, html);
  console.log(`Built ${outputPath} with ${BREEDS.length} breeds.`);
}
