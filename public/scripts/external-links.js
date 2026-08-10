const SITE_NAMES = Object.freeze({
  "akc.org": "American Kennel Club",
  "bluecross.org.uk": "Blue Cross",
  "buymeacoffee.com": "Buy Me a Coffee",
  "creativecommons.org": "Creative Commons",
  "github.com": "GitHub",
  "openstreetmap.org": "OpenStreetMap",
  "petfinder.com": "Petfinder",
  "rspca.org.uk": "RSPCA",
  "wikimedia.org": "Wikimedia Commons"
});

const SITE_REASONS = Object.freeze({
  "akc.org": "The American Kennel Club hosts the breed profile and sets its own privacy practices.",
  "bluecross.org.uk": "Blue Cross hosts independent pet-care guidance on its own website.",
  "buymeacoffee.com": "Buy Me a Coffee processes tips on its own website; ur dog never sees payment details.",
  "creativecommons.org": "Creative Commons hosts the license terms for this photo.",
  "github.com": "GitHub hosts ur dog’s public correction form on its own website.",
  "openstreetmap.org": "OpenStreetMap hosts the map source and community editing tools.",
  "petfinder.com": "Petfinder hosts individual dog listings; its privacy practices are its own.",
  "rspca.org.uk": "RSPCA hosts independent animal-welfare guidance on its own website.",
  "wikimedia.org": "Wikimedia Commons hosts the original photo and creator record."
});

function registrableLabel(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
  const known = Object.keys(SITE_NAMES).find((domain) => host === domain || host.endsWith(`.${domain}`));
  return known || host;
}

function destinationFor(href, base = globalThis.location?.href || "https://urdog.dev/") {
  try {
    const destination = new URL(href, base);
    const current = new URL(base);
    if (!["http:", "https:"].includes(destination.protocol)) return null;
    const destinationHost = destination.hostname.replace(/^www\./, "");
    const currentHost = current.hostname.replace(/^www\./, "");
    if (destinationHost === currentHost || destinationHost === "urdog.dev") return null;
    destination.username = "";
    destination.password = "";
    return destination;
  } catch {
    return null;
  }
}

function destinationLabel(destination) {
  const key = registrableLabel(destination?.hostname);
  return SITE_NAMES[key] || key || "this website";
}

function destinationReason(destination) {
  const key = registrableLabel(destination?.hostname);
  return SITE_REASONS[key] || `This next page is run by ${key || "another website"}, not ur dog.`;
}

function createDialog() {
  const dialog = document.createElement("dialog");
  dialog.className = "exit-dialog";
  dialog.setAttribute("aria-labelledby", "exit-dialog-title");
  dialog.setAttribute("aria-describedby", "exit-dialog-reason");
  dialog.innerHTML = `<div class="exit-dialog__accent" aria-hidden="true"></div>
    <div class="exit-dialog__body">
      <p class="section-kicker">leaving ur dog</p>
      <h2 id="exit-dialog-title">open another website?</h2>
      <p id="exit-dialog-reason"></p>
      <p class="exit-dialog__host" id="exit-dialog-host"></p>
      <div class="exit-dialog__actions">
        <button class="button button--secondary" type="button" data-exit-stay>stay here</button>
        <a class="button button--primary" href="#" target="_blank" rel="noopener noreferrer external" data-exit-continue>continue <span aria-hidden="true">↗</span></a>
      </div>
    </div>`;
  document.body.append(dialog);
  return dialog;
}

function installExternalLinkDialog() {
  if (typeof document === "undefined" || document.querySelector(".exit-dialog")) return;
  const dialog = createDialog();
  const title = dialog.querySelector("#exit-dialog-title");
  const reason = dialog.querySelector("#exit-dialog-reason");
  const host = dialog.querySelector("#exit-dialog-host");
  const stay = dialog.querySelector("[data-exit-stay]");
  const proceed = dialog.querySelector("[data-exit-continue]");
  let opener = null;

  function close() {
    dialog.close();
  }

  stay.addEventListener("click", close);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener("close", () => {
    const target = opener;
    opener = null;
    target?.focus({ preventScroll: true });
  });
  proceed.addEventListener("click", () => {
    opener = null;
    dialog.close();
  });

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest?.("a[href]");
    if (!anchor || anchor.closest(".exit-dialog") || anchor.hasAttribute("download")) return;
    const destination = destinationFor(anchor.href, window.location.href);
    if (!destination) return;

    event.preventDefault();
    opener = anchor;
    const label = destinationLabel(destination);
    title.textContent = `open ${label}?`;
    reason.textContent = destinationReason(destination);
    host.textContent = destination.hostname.replace(/^www\./, "");
    proceed.href = destination.toString();
    proceed.innerHTML = `continue to ${label} <span aria-hidden="true">↗</span>`;
    dialog.showModal();
    stay.focus();
  }, true);
}

if (typeof document !== "undefined") installExternalLinkDialog();

export {
  destinationFor,
  destinationLabel,
  destinationReason,
  installExternalLinkDialog
};
