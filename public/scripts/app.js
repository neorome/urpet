import {
  LABELS,
  encodeAnswers,
  parseAnswers,
  rankBreeds,
  shareText,
  validateAnswers
} from "./breed-engine.js?v=20260811a";
import { DOGS, renderDogSvg } from "./dog-engine.js?v=20260811a";
import { BREED_PHOTOS } from "./breed-photos.js?v=20260811a";
import { initRescueFinder } from "./rescue-map.js?v=20260811a";
import "./external-links.js?v=20260811a";

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
const answerSummary = document.querySelector("#answer-summary");
const quickCompareCards = document.querySelector("#quick-compare-cards");
const breedCards = document.querySelector("#breed-cards");
const meetingQuestions = document.querySelector("#meeting-questions");
const saveButton = document.querySelector("#save-brief");
const shareButton = document.querySelector("#share-brief");
const printButton = document.querySelector("#print-brief");
const changeButton = document.querySelector("#change-answers");
const jumpToRescueButton = document.querySelector("#jump-to-rescue");
const resetButton = document.querySelector("#reset-answers");
const actionStatus = document.querySelector("#action-status");
const copyQuestionsButton = document.querySelector("#copy-questions");
const meetingCopyStatus = document.querySelector("#meeting-copy-status");

const savedDialog = document.querySelector("#saved-dialog");
const openSavedButton = document.querySelector("#open-saved");
const closeSavedButton = document.querySelector("#close-saved");
const savedCount = document.querySelector("#saved-count");
const savedList = document.querySelector("#saved-list");
const savedEmpty = document.querySelector("#saved-empty");
const clearSavedButton = document.querySelector("#clear-saved");
const resetDialog = document.querySelector("#reset-dialog");
const cancelResetButton = document.querySelector("#cancel-reset");
const confirmResetButton = document.querySelector("#confirm-reset");

const rescueFinderTitle = document.querySelector("#rescue-finder-title");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let currentStep = 0;
let currentAnswers = null;
let currentReport = null;
let rescueFinder = null;

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

function focusAndReveal(target, { instant = false } = {}) {
  if (!target) return;
  if (!target.matches("a, button, input, select, textarea, [tabindex]")) {
    target.setAttribute("tabindex", "-1");
  }
  if (instant) {
    target.scrollIntoView({ behavior: "auto", block: "start" });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
    });
    return;
  }
  window.requestAnimationFrame(() => {
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  });
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
    household: data.getAll("household").map(String).join("+"),
    stage: data.get("stage") || ""
  };
}

function fillForm(answers) {
  form.reset();
  for (const [name, value] of Object.entries(answers)) {
    const values = name === "household" ? value.split("+") : [value];
    values.forEach((entry) => {
      const input = form.querySelector(`input[name="${name}"][value="${entry}"]`);
      if (input) input.checked = true;
    });
  }
}

function answerLabel(key, value) {
  if (key !== "household") return LABELS[value] || value;
  return value.split("+").map((entry) => LABELS[entry] || entry).join(" · ");
}

function renderAnswerSummary(answers) {
  const entries = [
    ["weekday care", "company"],
    ["movement", "activity"],
    ["training", "training"],
    ["coat care", "grooming"],
    ["shedding", "shedding"],
    ["adult size", "size"],
    ["what u want", "goal"],
    ["household", "household"],
    ["search stage", "stage"]
  ];

  answerSummary.innerHTML = entries.map(([label, key]) => `<div>
    <dt>${escapeHtml(label)}</dt>
    <dd>${escapeHtml(answerLabel(key, answers[key]))}</dd>
  </div>`).join("");
}

function renderQuickCompare(report, answers) {
  quickCompareCards.innerHTML = report.recommendations.map((item, index) => {
    const { breed, cleanFit, mismatches } = item;
    const goalMatch = breed.goals.includes(answers.goal);
    const limitText = cleanFit
      ? "clears your stated limits"
      : `${mismatches.length} limit tradeoff${mismatches.length === 1 ? "" : "s"}`;
    const goalText = goalMatch
      ? `matches ${LABELS[answers.goal]}`
      : `not centered on ${LABELS[answers.goal]}`;
    const firstCheck = mismatches[0] || breed.cautions[0] || breed.caution;

    return `<article data-fit="${cleanFit ? "clean" : "near"}">
      <p class="quick-compare__rank">0${index + 1} · ${escapeHtml(breed.group.replace("-", " "))}</p>
      <h4>${escapeHtml(breed.name)}</h4>
      <ul>
        <li data-state="${cleanFit ? "yes" : "check"}"><strong>limits</strong><span>${escapeHtml(limitText)}</span></li>
        <li data-state="${goalMatch ? "yes" : "check"}"><strong>goal</strong><span>${escapeHtml(goalText)}</span></li>
      </ul>
      <p><strong>check first:</strong> ${escapeHtml(firstCheck)}</p>
      <a href="${escapeHtml(breed.source)}" target="_blank" rel="noopener noreferrer external">breed profile <span aria-hidden="true">↗</span></a>
    </article>`;
  }).join("");
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
  if (!photo) throw new Error(`Missing reviewed photo for ${breed.id}.`);
  return `<figure class="breed-photo">
    <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" width="720" height="540" loading="lazy" decoding="async">
    <figcaption>${escapeHtml(photo.attribution)} · <a href="/photo-credits/#${escapeHtml(breed.id)}">${escapeHtml(photo.licenseShortName)}</a></figcaption>
  </figure>`;
}

function renderRecommendations(report) {
  breedCards.innerHTML = report.recommendations.map((item, index) => {
    const { breed, cleanFit, mismatches, reasons } = item;
    const fitLabel = cleanFit ? "clears your stated limits" : `${mismatches.length} limit tradeoff${mismatches.length === 1 ? "" : "s"} to resolve`;
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
    return "All three clear the size and care limits u chose. Goal matches are marked separately.";
  }
  if (report.cleanCount === 0) {
    return "No breed cleared every limit. These are the nearest three; each conflict is marked.";
  }
  const nearCount = 3 - report.cleanCount;
  return `${report.cleanCount} cleared every limit. ${nearCount === 1 ? "The other result shows" : "The other two results show"} the tradeoff${nearCount === 1 ? "" : "s"} to resolve.`;
}

function createBrief(answers, { updateUrl = true, scroll = true, instant = false } = {}) {
  if (!validateAnswers(answers)) return false;
  const report = rankBreeds(answers);
  if (!report) return false;

  currentAnswers = answers;
  currentReport = report;
  renderAnswerSummary(answers);
  renderQuickCompare(report, answers);
  renderRecommendations(report);
  renderChecklist(report);

  resultSummary.textContent = reportSummary(report);
  readiness.dataset.level = report.readiness.level;
  readinessTitle.textContent = report.readiness.title;
  readinessText.textContent = report.readiness.text;
  result.hidden = false;
  result.classList.remove("is-entering");
  actionStatus.textContent = "";
  meetingCopyStatus.textContent = "";

  if (updateUrl) {
    const query = encodeAnswers(answers);
    history.replaceState({ urdog: true }, "", `/?${query}#result`);
  }

  syncSaveButton();
  window.requestAnimationFrame(() => result.classList.add("is-entering"));
  if (scroll) focusAndReveal(resultTitle, { instant });
  return true;
}

function readSaved() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry.query !== "string") return [];
      const answers = parseAnswers(entry.query);
      if (!answers) return [];
      const query = encodeAnswers(answers);
      if (!query || seen.has(query)) return [];
      seen.add(query);
      return [{ ...entry, query }];
    }).slice(0, MAX_SAVED);
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
  clearSavedButton.hidden = entries.length === 0;

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
    const savedDate = new Date(entry.savedAt || "");
    const savedLabel = Number.isNaN(savedDate.getTime())
      ? ""
      : `saved ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(savedDate)} · `;
    detail.textContent = `${savedLabel}${LABELS[answers.activity]} · ${LABELS[answers.size]} · ${LABELS[answers.goal]}`;
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

function resetAnswers() {
  form.reset();
  currentAnswers = null;
  currentReport = null;
  result.hidden = true;
  result.classList.remove("is-entering");
  answerSummary.replaceChildren();
  quickCompareCards.replaceChildren();
  breedCards.replaceChildren();
  meetingQuestions.replaceChildren();
  meetingCopyStatus.textContent = "";
  rescueFinder?.reset();
  history.replaceState({ urdog: true }, "", "/");
  showStep(0, { focus: false });
  focusAndReveal(steps[0].querySelector("legend"));
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

async function copyMeetingQuestions() {
  if (!currentReport) return;
  const text = currentReport.checklist.map((question, index) => `${index + 1}. ${question}`).join("\n");
  try {
    await copyText(`Questions to ask before bringing a dog home\n\n${text}`);
    meetingCopyStatus.textContent = "Questions copied.";
  } catch {
    meetingCopyStatus.textContent = "Copy was blocked. Print or save the full brief instead.";
  }
}

form.addEventListener("change", (event) => {
  if (!event.target.matches("input")) return;
  if (event.target.name === "household" && event.target.checked) {
    const householdInputs = [...form.querySelectorAll('input[name="household"]')];
    if (event.target.value === "adults") {
      householdInputs.forEach((input) => {
        if (input !== event.target) input.checked = false;
      });
    } else {
      const adultsOnly = form.querySelector('#household-adults');
      if (adultsOnly) adultsOnly.checked = false;
    }
  }
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
copyQuestionsButton.addEventListener("click", copyMeetingQuestions);
changeButton.addEventListener("click", () => {
  showStep(0, { focus: false });
  focusAndReveal(steps[0].querySelector("legend"));
});
jumpToRescueButton.addEventListener("click", () => focusAndReveal(rescueFinderTitle));
resetButton.addEventListener("click", () => {
  if (typeof resetDialog.showModal === "function") resetDialog.showModal();
  else resetDialog.setAttribute("open", "");
  cancelResetButton.focus();
});
cancelResetButton.addEventListener("click", () => resetDialog.close());
confirmResetButton.addEventListener("click", () => {
  resetDialog.close();
  resetAnswers();
});
resetDialog.addEventListener("click", (event) => {
  if (event.target === resetDialog) resetDialog.close();
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
  if (writeSaved(entries)) actionStatus.textContent = "Removed a saved brief from this browser.";
  else actionStatus.textContent = "This browser did not allow the saved brief to be removed.";
  renderSavedDialog();
  syncSavedCount();
  syncSaveButton();
});

clearSavedButton.addEventListener("click", () => {
  if (!readSaved().length) return;
  if (!window.confirm("Clear every saved dog fit brief from this browser?")) return;
  if (!writeSaved([])) {
    actionStatus.textContent = "This browser did not allow saved briefs to be cleared.";
    return;
  }
  actionStatus.textContent = "Saved briefs cleared from this browser.";
  renderSavedDialog();
  syncSavedCount();
  syncSaveButton();
});

window.addEventListener("popstate", () => {
  const answers = parseAnswers(window.location.href);
  if (answers) {
    fillForm(answers);
    createBrief(answers, { updateUrl: false, scroll: location.hash === "#result", instant: true });
  } else {
    result.hidden = true;
    currentAnswers = null;
    currentReport = null;
  }
});

syncSavedCount();
rescueFinder = initRescueFinder();
showStep(0, { focus: false });

const linkedAnswers = parseAnswers(window.location.href);
if (linkedAnswers) {
  fillForm(linkedAnswers);
  showStep(steps.length - 1, { focus: false });
  createBrief(linkedAnswers, { updateUrl: false, scroll: location.hash === "#result", instant: true });
}
