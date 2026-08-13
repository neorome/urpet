import {
  encodeGuideAnswerIds,
  normalizePetAnswers,
  rankPetProfiles
} from "./all-pets-engine.js?v=20260813a";
import {
  activePetStepIds,
  answersWithSafeSkippedDefaults
} from "./all-pets-flow.js?v=20260813a";
import { PROFILE_PHOTOS } from "../data/profile-photos.js?v=20260813a";

const form = document.querySelector("#pet-conversation");
const steps = [...document.querySelectorAll(".pet-step")];
const backButton = document.querySelector("#pet-back");
const nextButton = document.querySelector("#pet-next");
const stepStatus = document.querySelector("#pet-step-status");
const progressBar = document.querySelector(".pet-progress .progress-track");
const progressFill = document.querySelector("#pet-progress-fill");
const formError = document.querySelector("#pet-form-error");
const formHint = document.querySelector("#pet-form-hint");
const laneFollowup = document.querySelector("#lane-followup");
const laneInstructions = document.querySelector("#lane-instructions");
const result = document.querySelector("#pet-result");
const resultTitle = document.querySelector("#pet-result-title");
const resultSummary = document.querySelector("#pet-result-summary");
const primaryResultAction = document.querySelector("#review-top-lead");
const leadsRoot = document.querySelector("#pet-leads");
const prepareFirst = document.querySelector("#prepare-first");
const blockedRoot = document.querySelector("#blocked-profiles");
const reptileGate = document.querySelector("#reptile-gate");
const printButton = document.querySelector("#print-pet-brief");
const changeButton = document.querySelector("#change-pet-answers");
const restartButton = document.querySelector("#restart-pet-brief");
const guide = document.querySelector("#community-guide");
const guideProfile = document.querySelector("#guide-profile");
const guideWidget = document.querySelector("#guide-turnstile");
const guideButton = document.querySelector("#run-community-guide");
const guideStatus = document.querySelector("#community-guide-status");
const guideQuestions = document.querySelector("#community-guide-questions");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let currentStep = 0;
let currentReport = null;
let turnstileWidgetId = null;
let turnstileToken = "";
let guideConfiguration = null;
let guidePreparationSequence = 0;

document.documentElement.classList.add("js");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function focusAndReveal(target) {
  if (!target) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView({
    behavior: reducedMotion.matches ? "auto" : "smooth",
    block: "start"
  });
}

function selectedMode() {
  return form.querySelector('input[name="mode"]:checked')?.value || "";
}

function checkedValues(name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(({ value }) => value);
}

function laneLimit() {
  if (selectedMode() === "kind") return 1;
  return 3;
}

function activeSteps() {
  const activeIds = activePetStepIds({ mode: selectedMode(), lanes: checkedValues("lanes") });
  return activeIds.map((id) => steps.find((step) => step.dataset.step === id)).filter(Boolean);
}

function updateLaneFollowup() {
  const mode = selectedMode();
  const needsLanes = mode === "kind" || mode === "compare";
  laneFollowup.hidden = !needsLanes;
  laneInstructions.textContent = mode === "compare" ? "Choose two or three pet types." : "Choose one pet type.";
  if (mode === "open") {
    form.querySelectorAll('input[name="lanes"]').forEach((input) => { input.checked = false; });
  }
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.textContent = "";
  formError.hidden = true;
}

function currentStepValid({ announce = false } = {}) {
  clearError();
  const step = activeSteps()[currentStep];
  if (!step) return false;

  if (step.dataset.step === "search") {
    const mode = selectedMode();
    const count = checkedValues("lanes").length;
    if (!mode) {
      if (announce) showError("Choose how you want to search.");
      return false;
    }
    if (mode === "kind" && count !== 1) {
      if (announce) showError("Choose exactly one pet lane for a known-kind search.");
      return false;
    }
    if (mode === "compare" && (count < 2 || count > 3)) {
      if (announce) showError("Choose two or three pet lanes to compare.");
      return false;
    }
    return true;
  }

  if (step.dataset.step === "care") {
    const care = checkedValues("care");
    if (!care.length) {
      if (announce) showError("Choose at least one food or maintenance boundary.");
      return false;
    }
    if (care.includes("no-specialist-food") && care.length > 1) {
      if (announce) showError("“None of these” cannot be combined with a specialist routine.");
      return false;
    }
    return true;
  }

  const valid = Boolean(step.querySelector('input[type="radio"]:checked'));
  if (!valid && announce) showError("Choose one answer before continuing.");
  return valid;
}

function currentRequirement() {
  const step = activeSteps()[currentStep];
  if (!step || currentStepValid()) return "Ready to continue.";
  if (step.dataset.step === "search") {
    const mode = selectedMode();
    if (!mode) return "Choose how you want to search.";
    return mode === "kind" ? "Choose one pet type." : "Choose two or three pet types.";
  }
  if (step.dataset.step === "care") return "Choose at least one routine.";
  return "Choose one answer to continue.";
}

function showStep(index, { focus = true } = {}) {
  const visibleSteps = activeSteps();
  currentStep = Math.max(0, Math.min(index, visibleSteps.length - 1));
  clearError();
  const current = visibleSteps[currentStep];
  steps.forEach((step) => { step.hidden = step !== current; });

  const visible = currentStep + 1;
  stepStatus.innerHTML = `question <strong>${visible}</strong> of ${visibleSteps.length}`;
  progressBar.setAttribute("aria-valuemax", String(visibleSteps.length));
  progressBar.setAttribute("aria-valuenow", String(visible));
  progressFill.style.width = `${(visible / visibleSteps.length) * 100}%`;
  backButton.hidden = currentStep === 0;
  nextButton.innerHTML = currentStep === visibleSteps.length - 1
    ? `build my research brief <span aria-hidden="true">→</span>`
    : `next question <span aria-hidden="true">→</span>`;
  formHint.textContent = currentRequirement();

  if (focus) {
    const legend = current.querySelector("legend");
    legend.setAttribute("tabindex", "-1");
    legend.focus({ preventScroll: true });
  }
}

function gatherAnswers() {
  const data = new FormData(form);
  return normalizePetAnswers(answersWithSafeSkippedDefaults({
    mode: data.get("mode"),
    lanes: data.getAll("lanes"),
    time: data.get("time"),
    space: data.get("space"),
    rhythm: data.get("rhythm"),
    care: data.getAll("care"),
    household: data.get("household"),
    vet: data.get("vet"),
    horizon: data.get("horizon")
  }));
}

function sourceLinks(profile) {
  if (profile.href) {
    return `<a class="button button--secondary" href="${escapeHtml(profile.href)}">open the dog matcher <span aria-hidden="true">→</span></a>`;
  }
  return profile.sources.map(({ label, href }) => `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer external">${escapeHtml(label)} <span aria-hidden="true">↗</span></a>`).join("");
}

function renderLead(profile, index) {
  const reasons = profile.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");
  const evidence = profile.evidence.map((point) => `<li>${escapeHtml(point)}</li>`).join("");
  const questions = profile.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("");
  const photo = PROFILE_PHOTOS[profile.id];
  const photoMarkup = photo ? `<figure class="pet-lead__photo">
    <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" width="1200" height="800" loading="lazy" decoding="async">
    <figcaption><a href="${escapeHtml(photo.source)}" target="_blank" rel="noopener noreferrer external">${escapeHtml(photo.creator)}</a> · <a href="${escapeHtml(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer external">${escapeHtml(photo.license)}</a> · cropped</figcaption>
  </figure>` : "";
  const links = sourceLinks(profile);
  if (index > 0) {
    return `<li class="pet-lead pet-lead--alternative" data-profile-id="${escapeHtml(profile.id)}">
      <details>
        <summary><span><small>alternative 0${index + 1}</small><strong>${escapeHtml(profile.label)}</strong></span><span aria-hidden="true">+</span></summary>
        <div class="pet-lead--alternative__inside">
          <p>${escapeHtml(profile.summary)}</p>
          <p><strong>why it may fit</strong> ${escapeHtml(profile.reasons.slice(0, 2).join(" ") || "It clears the hard limits in this brief.")}</p>
          <p><strong>check first</strong> ${escapeHtml(profile.questions[0] || profile.summary)}</p>
          <details class="pet-lead__notes">
            <summary>sources and research notes</summary>
            <div>
              <section><h4>fit notes</h4><ul>${reasons}</ul></section>
              <section><h4>source notes</h4><ul>${evidence}</ul></section>
              <section><h4>questions to ask</h4><ol>${questions}</ol></section>
              <div class="pet-lead__actions">${links}</div>
            </div>
          </details>
        </div>
      </details>
    </li>`;
  }
  const visibleAction = profile.href ? `<div class="pet-lead__actions">${links}</div>` : "";
  const researchAction = profile.href ? "" : `<div class="pet-lead__actions">${links}</div>`;
  return `<li class="pet-lead pet-lead--primary" data-profile-id="${escapeHtml(profile.id)}">
    ${photoMarkup}
    <div class="pet-lead__main">
      <p class="pet-lead__rank">0${index + 1} · ${escapeHtml(profile.eyebrow)}</p>
      <h3>${escapeHtml(profile.label)}</h3>
      <p class="pet-lead__summary">${escapeHtml(profile.summary)}</p>
      <p class="pet-lead__fit"><strong>why it fits</strong> ${escapeHtml(profile.reasons.slice(0, 2).join(" ") || "It clears the hard limits in this brief.")}</p>
      <p class="pet-lead__caution"><strong>check first</strong> ${escapeHtml(profile.questions[0] || profile.summary)}</p>
      ${visibleAction}
      <details class="pet-lead__notes">
        <summary>sources and research notes</summary>
        <div>
          <section><h4>fit notes</h4><ul>${reasons}</ul></section>
          <section><h4>source notes</h4><ul>${evidence}</ul></section>
          <section><h4>questions to ask</h4><ol>${questions}</ol></section>
          ${researchAction}
        </div>
      </details>
    </div>
  </li>`;
}

function renderBlocked(profile) {
  const conflicts = profile.conflicts.map((conflict) => `<li>${escapeHtml(conflict)}</li>`).join("");
  const sources = profile.sources?.length ? `<div class="blocked-profile__sources">${sourceLinks(profile)}</div>` : "";
  return `<li class="blocked-profile">
    <div>
      <p class="blocked-profile__status">prepare first</p>
      <h4>${escapeHtml(profile.label)}</h4>
      <p class="blocked-profile__first">${escapeHtml(profile.conflicts[0])}</p>
    </div>
    <details>
      <summary>see every conflict and source</summary>
      <ul>${conflicts}</ul>
      ${sources}
    </details>
  </li>`;
}

function renderReport(report) {
  currentReport = report;
  leadsRoot.innerHTML = report.leads.length
    ? `<ol class="pet-lead-list">${report.leads.map(renderLead).join("")}</ol>`
    : "";
  blockedRoot.innerHTML = report.blocked.length
    ? `<ol class="blocked-profile-list">${report.blocked.map(renderBlocked).join("")}</ol>`
    : "";
  prepareFirst.hidden = report.blocked.length === 0;
  prepareFirst.querySelector("details").open = false;
  reptileGate.hidden = !report.hasReptileGate;
  primaryResultAction.hidden = report.leads.length === 0;

  if (report.leads.length) {
    resultSummary.textContent = report.leads.length === 1
      ? "Start with this source-linked lead, then verify the individual animal, provider, veterinary access, cost, and local rules."
      : `${report.leads.length} possibilities. Start with the first; the others are compact alternatives.`;
  } else {
    resultSummary.textContent = "No reviewed profile clears every hard limit in this brief. The conflicts below are plans to resolve—not reasons to hide an animal’s needs.";
  }

  result.hidden = false;
  guide.hidden = true;
  guideQuestions.hidden = true;
  guideQuestions.replaceChildren();
  guideStatus.textContent = "";
  focusAndReveal(resultTitle);
  void prepareCommunityGuide(report);
}

function buildReport() {
  const answers = gatherAnswers();
  const report = answers ? rankPetProfiles(answers) : null;
  if (!report) {
    showError("This answer set could not be checked. Review the current question and try again.");
    return;
  }
  renderReport(report);
}

function enforceLaneLimit(changed) {
  if (!changed.checked) return;
  const checked = [...form.querySelectorAll('input[name="lanes"]:checked')];
  const limit = laneLimit();
  if (checked.length <= limit) return;
  changed.checked = false;
  showError(limit === 1 ? "A known-kind search uses one lane." : "Choose no more than three priority lanes.");
}

function enforceCareChoice(changed) {
  if (!changed.checked) return;
  const careInputs = [...form.querySelectorAll('input[name="care"]')];
  if (changed.value === "no-specialist-food") {
    careInputs.forEach((input) => {
      if (input !== changed) input.checked = false;
    });
  } else {
    const none = form.querySelector('#care-none');
    if (none) none.checked = false;
  }
}

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-urdog-turnstile]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.urdogTurnstile = "true";
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  });
}

async function prepareCommunityGuide(report) {
  const preparationSequence = ++guidePreparationSequence;
  hideCommunityGuide();
  const eligible = report.leads.filter(({ id }) => id !== "dog-breed-module");
  if (!eligible.length) return;

  try {
    const response = await fetch("/api/community/status", {
      headers: { accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) return;
    const status = await response.json();
    if (preparationSequence !== guidePreparationSequence) return;
    if (!status.guideEnabled || typeof status.turnstileSiteKey !== "string" || !status.turnstileSiteKey) return;
    guideConfiguration = status;
    guideProfile.replaceChildren(...eligible.map((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.label;
      return option;
    }));
    guide.hidden = false;
  } catch {
    if (preparationSequence === guidePreparationSequence) hideCommunityGuide();
  }
}

function hideCommunityGuide() {
  guide.hidden = true;
  guide.open = false;
  guideConfiguration = null;
  turnstileToken = "";
  guideButton.disabled = true;
  guideStatus.textContent = "";
  guideQuestions.hidden = true;
  guideQuestions.replaceChildren();
  if (window.turnstile && turnstileWidgetId !== null) {
    window.turnstile.remove(turnstileWidgetId);
  }
  turnstileWidgetId = null;
  guideWidget.replaceChildren();
}

async function renderTurnstile() {
  const configuration = guideConfiguration;
  if (!guide.open || !configuration || turnstileWidgetId !== null) return;
  guideStatus.textContent = "Loading private verification…";
  try {
    await loadTurnstileScript();
    if (!guide.open || guideConfiguration !== configuration || !window.turnstile || turnstileWidgetId !== null) return;
    turnstileWidgetId = window.turnstile.render(guideWidget, {
      sitekey: configuration.turnstileSiteKey,
      action: configuration.turnstileAction || "community_guide",
      theme: "auto",
      callback(token) {
        turnstileToken = token;
        guideButton.disabled = false;
        guideStatus.textContent = "Verification complete. The one-shot guide is ready.";
      },
      "expired-callback"() {
        turnstileToken = "";
        guideButton.disabled = true;
        guideStatus.textContent = "Verification expired. Complete it again to continue.";
      },
      "error-callback"() {
        turnstileToken = "";
        guideButton.disabled = true;
        guideStatus.textContent = "Verification is unavailable. Your deterministic brief still works.";
      }
    });
  } catch {
    guideStatus.textContent = "Verification is unavailable. Your deterministic brief still works.";
  }
}

function resetTurnstile() {
  turnstileToken = "";
  guideButton.disabled = true;
  if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
}

async function runCommunityGuide() {
  if (!currentReport || !turnstileToken || !guideConfiguration) return;
  const profileId = guideProfile.value;
  if (!currentReport.leads.some(({ id }) => id === profileId)) return;

  guideButton.disabled = true;
  guideStatus.textContent = "Building three questions…";
  guideQuestions.hidden = true;
  guideQuestions.replaceChildren();
  try {
    const response = await fetch("/api/community/guide", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        profileId,
        answerIds: encodeGuideAnswerIds(currentReport.answers),
        turnstileToken
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(body.nextQuestions) || body.nextQuestions.length !== 3) {
      throw new Error("guide unavailable");
    }
    body.nextQuestions.forEach((question) => {
      const item = document.createElement("li");
      item.textContent = question;
      guideQuestions.append(item);
    });
    guideQuestions.hidden = false;
    guideStatus.textContent = "Three questions added. The deterministic brief above has not changed.";
  } catch {
    guideStatus.textContent = "The shared guide is resting. Your source-linked brief above is complete and unchanged.";
  } finally {
    resetTurnstile();
  }
}

form.addEventListener("change", (event) => {
  if (!event.target.matches("input")) return;
  if (event.target.name === "mode") updateLaneFollowup();
  if (event.target.name === "lanes") enforceLaneLimit(event.target);
  if (event.target.name === "care") enforceCareChoice(event.target);
  clearError();
  formHint.textContent = currentRequirement();
});

form.addEventListener("submit", (event) => event.preventDefault());

nextButton.addEventListener("click", () => {
  if (!currentStepValid({ announce: true })) return;
  if (currentStep < activeSteps().length - 1) {
    showStep(currentStep + 1);
    return;
  }
  buildReport();
});

backButton.addEventListener("click", () => showStep(currentStep - 1));
printButton.addEventListener("click", () => window.print());
changeButton.addEventListener("click", () => {
  showStep(0, { focus: false });
  focusAndReveal(steps[0].querySelector("legend"));
});
restartButton.addEventListener("click", () => {
  form.reset();
  updateLaneFollowup();
  currentReport = null;
  result.hidden = true;
  guidePreparationSequence += 1;
  hideCommunityGuide();
  showStep(0, { focus: false });
  focusAndReveal(steps[0].querySelector("legend"));
});
guide.addEventListener("toggle", () => {
  if (guide.open) void renderTurnstile();
});
guideButton.addEventListener("click", runCommunityGuide);

updateLaneFollowup();
showStep(0, { focus: false });
