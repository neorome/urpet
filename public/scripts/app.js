import {
  LABELS,
  encodeAnswers,
  parseAnswers,
  rankBreeds,
  shareText,
  validateAnswers
} from "./breed-engine.js?v=20260810b";
import { DOGS, renderDogSvg } from "./dog-engine.js?v=20260810b";
import { BREED_PHOTOS } from "./breed-photos.js?v=20260810b";

const STORAGE_KEY = "urdog-fit-briefs-v1";
const MAX_SAVED = 8;

const form = document.querySelector("#breed-form");
const steps = [...document.querySelectorAll(".match-step")];
const backButton = document.querySelector("#back-step");
const nextButton = document.querySelector("#next-step");
const stepStatus = document.querySelector("#step-status");
const progressBar = document.querySelector(".progress-track");
const progressFill = document.querySelector("#progress-fill");
const deskNote = document.querySelector("#desk-note");
const heroDog = document.querySelector("#hero-dog");

const result = document.querySelector("#result");
const resultTitle = document.querySelector("#result-title");
const resultSummary = document.querySelector("#result-summary");
const readiness = document.querySelector("#readiness");
const readinessTitle = document.querySelector("#readiness-title");
const readinessText = document.querySelector("#readiness-text");
const breedCards = document.querySelector("#breed-cards");
const meetingQuestions = document.querySelector("#meeting-questions");
const saveButton = document.querySelector("#save-brief");
const shareButton = document.querySelector("#share-brief");
const printButton = document.querySelector("#print-brief");
const changeButton = document.querySelector("#change-answers");
const actionStatus = document.querySelector("#action-status");

const savedDialog = document.querySelector("#saved-dialog");
const openSavedButton = document.querySelector("#open-saved");
const closeSavedButton = document.querySelector("#close-saved");
const savedCount = document.querySelector("#saved-count");
const savedList = document.querySelector("#saved-list");
const savedEmpty = document.querySelector("#saved-empty");

let currentStep = 0;
let currentAnswers = null;
let currentReport = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentStepHasAnswer() {
  return Boolean(steps[currentStep]?.querySelector("input:checked"));
}

function renderDeskDog(stepIndex) {
  const dog = DOGS[stepIndex % DOGS.length];
  heroDog.innerHTML = renderDogSvg(dog, `desk-${stepIndex}`);
  heroDog.classList.remove("is-checking");
  window.requestAnimationFrame(() => heroDog.classList.add("is-checking"));
}

function showStep(index, { focus = true } = {}) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));

  steps.forEach((step, stepIndex) => {
    step.hidden = stepIndex !== currentStep;
  });

  const visibleNumber = currentStep + 1;
  stepStatus.innerHTML = `step <strong>${visibleNumber}</strong> of ${steps.length}`;
  progressBar.setAttribute("aria-valuenow", String(visibleNumber));
  progressFill.style.width = `${(visibleNumber / steps.length) * 100}%`;
  backButton.hidden = currentStep === 0;
  nextButton.disabled = !currentStepHasAnswer();
  nextButton.innerHTML = currentStep === steps.length - 1
    ? `build my shortlist <span aria-hidden="true">→</span>`
    : `next question <span aria-hidden="true">→</span>`;

  const notes = [
    "checking the ordinary weekday.",
    "measuring the non-heroic walk.",
    "filing the training paperwork.",
    "consulting the comb department.",
    "promoting the lint roller.",
    "testing the car-door math.",
    "noting what u actually want.",
    "the whole household gets a vote.",
    "adult dog? puppy? clipboard ready."
  ];
  deskNote.textContent = notes[currentStep];
  renderDeskDog(currentStep);

  if (focus) {
    const legend = steps[currentStep].querySelector("legend");
    legend.setAttribute("tabindex", "-1");
    legend.focus({ preventScroll: true });
  }
}

function gatherAnswers() {
  const data = new FormData(form);
  return {
    company: data.get("company") || "",
    activity: data.get("activity") || "",
    training: data.get("training") || "",
    grooming: data.get("grooming") || "",
    shedding: data.get("shedding") || "",
    size: data.get("size") || "",
    goal: data.get("goal") || "",
    household: data.get("household") || "",
    stage: data.get("stage") || ""
  };
}

function fillForm(answers) {
  for (const [name, value] of Object.entries(answers)) {
    const input = form.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }
}

function glanceMarkup(breed) {
  const entries = [
    ["adult size", breed.sizes.join(" / ")],
    ["activity", LABELS[breed.activity]],
    ["training", LABELS[breed.training]],
    ["coat", LABELS[breed.grooming]],
    ["shedding", LABELS[breed.shedding]]
  ];

  return entries.map(([key, value]) => `<li><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></li>`).join("");
}

function breedPhotoMarkup(breed) {
  const photo = BREED_PHOTOS[breed.id];
  if (photo) {
    return `<figure class="breed-photo">
      <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" width="720" height="540" loading="lazy" decoding="async">
      <figcaption>${escapeHtml(photo.attribution)} · <a href="/photo-credits/#${escapeHtml(breed.id)}">${escapeHtml(photo.licenseShortName)}</a></figcaption>
    </figure>`;
  }

  return `<div class="breed-photo breed-photo--fallback" aria-hidden="true"><span>u</span></div>`;
}

function renderRecommendations(report) {
  breedCards.innerHTML = report.recommendations.map((item, index) => {
    const { breed, cleanFit, mismatches, reasons } = item;
    const fitLabel = cleanFit ? "within your stated limits" : `${mismatches.length} tradeoff${mismatches.length === 1 ? "" : "s"} to resolve`;
    const cautionMarkup = (breed.cautions.length ? breed.cautions : [breed.caution])
      .map((caution) => `<li>${escapeHtml(caution)}</li>`)
      .join("");
    const mismatchMarkup = cleanFit
      ? ""
      : `<div class="near-match"><strong>why this is only a near match:</strong><ul>${mismatches.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul></div>`;

    return `<article class="breed-card" data-fit="${cleanFit ? "clean" : "near"}">
      ${breedPhotoMarkup(breed)}
      <header class="breed-card__head">
        <span class="breed-number" aria-hidden="true">0${index + 1}</span>
        <div>
          <p>${escapeHtml(breed.group.replace("-", " "))} group · ${escapeHtml(fitLabel)}</p>
          <h3>${escapeHtml(breed.name)}</h3>
        </div>
      </header>
      <ul class="breed-glance" aria-label="${escapeHtml(breed.name)} care bands">${glanceMarkup(breed)}</ul>
      <aside class="breed-catch">
        <h4>what to verify first</h4>
        <ul>${cautionMarkup}</ul>
        ${mismatchMarkup}
      </aside>
      <section class="why-fit" aria-labelledby="why-${escapeHtml(breed.id)}">
        <h4 id="why-${escapeHtml(breed.id)}">why it landed here</h4>
        <ul>${reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
      </section>
      <footer class="breed-card__footer">
        <a href="${escapeHtml(breed.source)}" target="_blank" rel="noopener noreferrer external">read the AKC breed profile <span aria-hidden="true">↗</span></a>
        <small>broad fit bands reviewed ${escapeHtml(breed.reviewedOn)}</small>
      </footer>
    </article>`;
  }).join("");
}

function renderChecklist(report) {
  meetingQuestions.replaceChildren();
  report.checklist.forEach((question) => {
    const item = document.createElement("li");
    item.textContent = question;
    meetingQuestions.append(item);
  });
}

function reportSummary(report) {
  if (report.cleanCount === 3) {
    return "All three fit the limits u chose. Meet individual dogs to check the rest.";
  }
  if (report.cleanCount === 0) {
    return "No breed cleared every limit. These are the nearest three; each conflict is marked.";
  }
  return `${report.cleanCount} cleared every limit. The other result shows the tradeoff to resolve.`;
}

function createBrief(answers, { updateUrl = true, scroll = true } = {}) {
  if (!validateAnswers(answers)) return false;
  const report = rankBreeds(answers);
  if (!report) return false;

  currentAnswers = answers;
  currentReport = report;
  renderRecommendations(report);
  renderChecklist(report);

  resultSummary.textContent = reportSummary(report);
  readiness.dataset.level = report.readiness.level;
  readinessTitle.textContent = report.readiness.title;
  readinessText.textContent = report.readiness.text;
  result.hidden = false;
  actionStatus.textContent = "";

  if (updateUrl) {
    const query = encodeAnswers(answers);
    history.replaceState({ urdog: true }, "", `/?${query}#result`);
  }

  syncSaveButton();
  if (scroll) result.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => resultTitle.focus({ preventScroll: true }), scroll ? 450 : 0);
  return true;
}

function readSaved() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.query === "string" && parseAnswers(entry.query))
      .slice(0, MAX_SAVED);
  } catch {
    return [];
  }
}

function writeSaved(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_SAVED)));
    return true;
  } catch {
    return false;
  }
}

function currentQuery() {
  return currentAnswers ? encodeAnswers(currentAnswers) : "";
}

function syncSavedCount() {
  const count = readSaved().length;
  savedCount.textContent = String(count);
  savedCount.setAttribute("aria-label", `${count} saved brief${count === 1 ? "" : "s"}`);
}

function syncSaveButton() {
  const query = currentQuery();
  const isSaved = Boolean(query) && readSaved().some((entry) => entry.query === query);
  saveButton.setAttribute("aria-pressed", String(isSaved));
  saveButton.textContent = isSaved ? "saved on this device ✓" : "save on this device";
}

function toggleSave() {
  if (!currentAnswers || !currentReport) return;
  const query = currentQuery();
  const entries = readSaved();
  const existingIndex = entries.findIndex((entry) => entry.query === query);

  if (existingIndex >= 0) {
    entries.splice(existingIndex, 1);
    if (writeSaved(entries)) actionStatus.textContent = "Removed this brief from this device.";
  } else {
    entries.unshift({
      query,
      names: currentReport.recommendations.map(({ breed }) => breed.name),
      savedAt: new Date().toISOString()
    });
    if (writeSaved(entries)) actionStatus.textContent = "Saved in this browser.";
    else actionStatus.textContent = "This browser did not allow local saving. The share link still works.";
  }

  syncSavedCount();
  syncSaveButton();
}

function renderSavedDialog() {
  const entries = readSaved();
  savedList.replaceChildren();
  savedEmpty.hidden = entries.length > 0;

  entries.forEach((entry) => {
    const answers = parseAnswers(entry.query);
    const report = answers ? rankBreeds(answers) : null;
    if (!report) return;

    const item = document.createElement("li");
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    const actions = document.createElement("div");
    const openLink = document.createElement("a");
    const removeButton = document.createElement("button");

    title.textContent = report.recommendations.map(({ breed }) => breed.name).join(" · ");
    detail.textContent = `${LABELS[answers.activity]} · ${LABELS[answers.size]} · ${LABELS[answers.goal]}`;
    openLink.href = `/?${entry.query}#result`;
    openLink.textContent = "open brief";
    removeButton.type = "button";
    removeButton.textContent = "remove";
    removeButton.dataset.removeQuery = entry.query;

    copy.append(title, detail);
    actions.append(openLink, removeButton);
    item.append(copy, actions);
    savedList.append(item);
  });
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Copy unavailable");
}

async function shareBrief() {
  if (!currentAnswers || !currentReport) return;
  const url = new URL(window.location.origin || "https://urdog.dev");
  url.search = encodeAnswers(currentAnswers);
  url.hash = "result";
  const text = shareText(currentReport);

  if (navigator.share) {
    try {
      await navigator.share({ title: "my ur dog fit brief", text, url: url.toString() });
      actionStatus.textContent = "Brief shared.";
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  try {
    await copyText(`${text} ${url}`);
    actionStatus.textContent = "Share link copied.";
  } catch {
    actionStatus.textContent = `Copy was blocked. Use this link: ${url}`;
  }
}

form.addEventListener("change", (event) => {
  if (!event.target.matches("input[type=radio]")) return;
  nextButton.disabled = !currentStepHasAnswer();
});

form.addEventListener("submit", (event) => event.preventDefault());

nextButton.addEventListener("click", () => {
  if (!currentStepHasAnswer()) return;
  if (currentStep < steps.length - 1) {
    showStep(currentStep + 1);
    return;
  }
  createBrief(gatherAnswers());
});

backButton.addEventListener("click", () => showStep(currentStep - 1));
saveButton.addEventListener("click", toggleSave);
shareButton.addEventListener("click", shareBrief);
printButton.addEventListener("click", () => window.print());
changeButton.addEventListener("click", () => {
  showStep(0, { focus: false });
  document.querySelector("#match-desk").scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => steps[0].querySelector("legend").focus({ preventScroll: true }), 450);
});

openSavedButton.addEventListener("click", () => {
  renderSavedDialog();
  if (typeof savedDialog.showModal === "function") savedDialog.showModal();
  else savedDialog.setAttribute("open", "");
});

closeSavedButton.addEventListener("click", () => savedDialog.close());
savedDialog.addEventListener("click", (event) => {
  if (event.target === savedDialog) savedDialog.close();
});
savedList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-query]");
  if (!button) return;
  const entries = readSaved().filter((entry) => entry.query !== button.dataset.removeQuery);
  writeSaved(entries);
  renderSavedDialog();
  syncSavedCount();
  syncSaveButton();
});

window.addEventListener("popstate", () => {
  const answers = parseAnswers(window.location.href);
  if (answers) {
    fillForm(answers);
    createBrief(answers, { updateUrl: false, scroll: false });
  } else {
    result.hidden = true;
    currentAnswers = null;
    currentReport = null;
  }
});

syncSavedCount();
showStep(0, { focus: false });

const linkedAnswers = parseAnswers(window.location.href);
if (linkedAnswers) {
  fillForm(linkedAnswers);
  showStep(steps.length - 1, { focus: false });
  createBrief(linkedAnswers, { updateUrl: false, scroll: false });
  window.requestAnimationFrame(() => result.scrollIntoView({ block: "start" }));
}
