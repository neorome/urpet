import {
  encodeGuideAnswerIds,
  normalizePetAnswers,
  rankPetProfiles
} from "./all-pets-engine.js?v=20260812b";

const form = document.querySelector("#pet-conversation");
const steps = [...document.querySelectorAll(".pet-step")];
const backButton = document.querySelector("#pet-back");
const nextButton = document.querySelector("#pet-next");
const stepStatus = document.querySelector("#pet-step-status");
const progressBar = document.querySelector(".pet-progress .progress-track");
const progressFill = document.querySelector("#pet-progress-fill");
const formError = document.querySelector("#pet-form-error");
const result = document.querySelector("#pet-result");
const resultTitle = document.querySelector("#pet-result-title");
const resultSummary = document.querySelector("#pet-result-summary");
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
  const step = steps[currentStep];
  if (!step) return false;

  if (currentStep === 1) {
    const mode = selectedMode();
    const count = checkedValues("lanes").length;
    if (mode === "kind" && count !== 1) {
      if (announce) showError("Choose exactly one pet lane for a known-kind search.");
      return false;
    }
    if (mode === "compare" && (count < 2 || count > 3)) {
      if (announce) showError("Choose two or three pet lanes to compare.");
      return false;
    }
    if (mode === "open" && count > 3) {
      if (announce) showError("Choose up to three priority lanes, or leave every lane unchecked.");
      return false;
    }
    return true;
  }

  if (currentStep === 5) {
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

function showStep(index, { focus = true } = {}) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  clearError();
  steps.forEach((step, stepIndex) => {
    step.hidden = stepIndex !== currentStep;
  });

  const visible = currentStep + 1;
  stepStatus.innerHTML = `question <strong>${visible}</strong> of ${steps.length}`;
  progressBar.setAttribute("aria-valuenow", String(visible));
  progressFill.style.width = `${(visible / steps.length) * 100}%`;
  backButton.hidden = currentStep === 0;
  nextButton.innerHTML = currentStep === steps.length - 1
    ? `build my research brief <span aria-hidden="true">→</span>`
    : `next question <span aria-hidden="true">→</span>`;
  nextButton.disabled = !currentStepValid();

  if (focus) {
    const legend = steps[currentStep].querySelector("legend");
    legend.setAttribute("tabindex", "-1");
    legend.focus({ preventScroll: true });
  }
}

function gatherAnswers() {
  const data = new FormData(form);
  return normalizePetAnswers({
    mode: data.get("mode"),
    lanes: data.getAll("lanes"),
    time: data.get("time"),
    space: data.get("space"),
    rhythm: data.get("rhythm"),
    care: data.getAll("care"),
    household: data.get("household"),
    vet: data.get("vet"),
    horizon: data.get("horizon")
  });
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
  return `<article class="pet-profile-card" data-profile-id="${escapeHtml(profile.id)}">
    <header>
      <p class="pet-profile-card__rank">0${index + 1} · ${escapeHtml(profile.eyebrow)}</p>
      <h3>${escapeHtml(profile.label)}</h3>
      <p>${escapeHtml(profile.summary)}</p>
    </header>
    <div class="pet-profile-card__body">
      <section>
        <h4>why it stayed in</h4>
        <ul>${reasons}</ul>
      </section>
      <section>
        <h4>what the source makes clear</h4>
        <ul>${evidence}</ul>
      </section>
      <section class="pet-profile-card__questions">
        <h4>ask before choosing</h4>
        <ol>${questions}</ol>
      </section>
    </div>
    <footer>${sourceLinks(profile)}</footer>
  </article>`;
}

function renderBlocked(profile) {
  const conflicts = profile.conflicts.map((conflict) => `<li>${escapeHtml(conflict)}</li>`).join("");
  const sources = profile.sources?.length ? `<p class="blocked-profile__sources">${sourceLinks(profile)}</p>` : "";
  return `<article class="blocked-profile">
    <p class="blocked-profile__status">prepare first</p>
    <h4>${escapeHtml(profile.label)}</h4>
    <ul>${conflicts}</ul>
    ${sources}
  </article>`;
}

function renderReport(report) {
  currentReport = report;
  leadsRoot.innerHTML = report.leads.map(renderLead).join("");
  blockedRoot.innerHTML = report.blocked.map(renderBlocked).join("");
  prepareFirst.hidden = report.blocked.length === 0;
  reptileGate.hidden = !report.hasReptileGate;

  if (report.leads.length) {
    const leadLabel = report.leads.length === 1 ? "one source-linked lead" : `${report.leads.length} source-linked leads`;
    resultSummary.textContent = `This brief has ${leadLabel}. Each still needs an individual-animal, provider, veterinary, cost, and local-rules check.`;
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
  const eligible = report.leads.filter(({ id }) => id !== "dog-breed-module");
  if (!eligible.length) return;

  try {
    const response = await fetch("/api/community/status", {
      headers: { accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) return;
    const status = await response.json();
    if (!status.guideEnabled || typeof status.turnstileSiteKey !== "string") return;
    guideConfiguration = status;
    guideProfile.replaceChildren(...eligible.map((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.label;
      return option;
    }));
    await loadTurnstileScript();
    if (!window.turnstile) return;
    guide.hidden = false;
    turnstileWidgetId = window.turnstile.render(guideWidget, {
      sitekey: status.turnstileSiteKey,
      action: status.turnstileAction || "community_guide",
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
    guide.hidden = true;
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
  if (event.target.name === "lanes") enforceLaneLimit(event.target);
  if (event.target.name === "care") enforceCareChoice(event.target);
  clearError();
  nextButton.disabled = !currentStepValid();
});

form.addEventListener("submit", (event) => event.preventDefault());

nextButton.addEventListener("click", () => {
  if (!currentStepValid({ announce: true })) return;
  if (currentStep < steps.length - 1) {
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
  currentReport = null;
  result.hidden = true;
  guide.hidden = true;
  resetTurnstile();
  showStep(0, { focus: false });
  focusAndReveal(steps[0].querySelector("legend"));
});
guideButton.addEventListener("click", runCommunityGuide);

showStep(0, { focus: false });
