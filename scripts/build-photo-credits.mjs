import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "public", "photo-credits", "index.html");
const manifest = JSON.parse(
  await readFile(resolve(root, "public", "data", "breed-photos.json"), "utf8")
);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function creditItem(photo) {
  const creator = photo.rights.attribution || photo.rights.artist || "Creator information on the Commons source page";
  return `        <li class="credit-card" id="${escapeHtml(photo.id)}">
          <img src="${escapeHtml(photo.localPath)}" alt="${escapeHtml(photo.alt)}" width="720" height="540" loading="lazy" decoding="async">
          <div>
            <p class="section-kicker">${escapeHtml(photo.rights.licenseShortName)}</p>
            <h2>${escapeHtml(photo.name)}</h2>
            <p><strong>creator / required credit:</strong> ${escapeHtml(creator)}</p>
            <p><strong>urpet changes:</strong> ${escapeHtml(photo.derivative.changes)}</p>
            <p class="credit-links">
              <a href="${escapeHtml(photo.source.sourcePageUrl)}" target="_blank" rel="noopener noreferrer external">Commons source file <span aria-hidden="true">↗</span></a>
              <a href="${escapeHtml(photo.rights.licenseUrl)}" target="_blank" rel="noopener noreferrer external">license terms <span aria-hidden="true">↗</span></a>
            </p>
          </div>
        </li>`;
}

function renderPage() {
  const credits = manifest.breeds.map(creditItem).join("\n");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Dog Photo Credits & Licenses | urpet</title>
    <meta name="description" content="Creator credits, Wikimedia Commons source files, license links, and modification notes for every real dog-breed photo used by the urpet matcher.">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#FFF8E8">
    <link rel="canonical" href="https://urdog.dev/photo-credits/">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/styles.css?v=20260813b">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="urpet">
    <meta property="og:url" content="https://urdog.dev/photo-credits/">
    <meta property="og:title" content="dog photo credits — urpet">
    <meta property="og:description" content="Every real breed photo gets a creator credit, source-file link, license, and modification note.">
  </head>
  <body class="credits-page">
    <a class="skip-link" href="#credits">skip to photo credits</a>
    <header class="site-header" aria-label="Primary">
      <a class="brand" href="/" aria-label="urpet home">
        <span class="brand__tag" aria-hidden="true"><span>u</span></span>
        <span class="brand__words">urpet</span>
      </a>
      <a class="header-link" href="/breeds/">browse all 205 breeds <span aria-hidden="true">→</span></a>
    </header>
    <main id="credits">
      <section class="credits-hero">
        <p class="eyebrow"><span aria-hidden="true">✦</span> photo credits</p>
        <h1>credit where<br><em>credit is due.</em></h1>
        <p>Creator, source-file, license, and modification details for every breed photo on urpet.</p>
        <p><strong>${manifest.approvedCount} credited photos</strong> · reviewed ${manifest.reviewedAt}</p>
      </section>
      <ol class="credit-list">
${credits}
      </ol>
      <section class="credits-policy">
        <h2>spot a credit problem?</h2>
        <p><a href="https://github.com/neorome/urpet/issues/new" target="_blank" rel="noopener noreferrer external">Open a correction</a> with the breed name and Commons file link.</p>
      </section>
    </main>
    <footer class="site-footer">
      <a class="brand brand--footer" href="/" aria-label="urpet home">
        <span class="brand__tag" aria-hidden="true"><span>u</span></span>
        <span class="brand__words">urpet</span>
      </a>
      <p>credit the human. meet the dog.</p>
      <nav class="footer-contact" aria-label="Research links">
        <a href="/">all-pets matcher</a>
        <a href="mailto:team@neorome.dev?subject=urpet%20pet%20suggestion">suggest a pet</a>
      </nav>
      <p>Photo rights belong to their respective creators under the licenses linked above.</p>
    </footer>
    <script type="module" src="/scripts/external-links.js?v=20260811a"></script>
  </body>
</html>
`;
}

const html = renderPage();
if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8");
  if (current !== html) throw new Error("public/photo-credits/index.html is stale; run npm run build:credits");
  console.log("Photo credits page is current.");
} else {
  await mkdir(resolve(root, "public", "photo-credits"), { recursive: true });
  await writeFile(outputPath, html);
  console.log(`Built photo credits for ${manifest.breeds.length} approved files.`);
}
