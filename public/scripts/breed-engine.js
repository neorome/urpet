import { BREEDS, CATALOG_VERSION } from "./breed-catalog.js?v=20260811a";

const REVIEWED_ON = CATALOG_VERSION;

const ANSWER_OPTIONS = Object.freeze({
  company: Object.freeze(["under-four", "reliable-break", "no-break-yet", "variable"]),
  activity: Object.freeze(["steady", "active", "very-active"]),
  training: Object.freeze(["routine", "ongoing", "skilled"]),
  grooming: Object.freeze(["simple", "regular", "professional"]),
  shedding: Object.freeze(["low", "moderate", "high"]),
  size: Object.freeze(["small", "medium", "large", "giant", "flexible"]),
  goal: Object.freeze(["companion", "walks", "adventure", "sport"]),
  household: Object.freeze(["adults", "children", "dog", "cats"]),
  stage: Object.freeze(["adult", "puppy", "either", "learning"])
});

const LABELS = Object.freeze({
  "under-four": "usually under four hours alone",
  "reliable-break": "a reliable care break on longer days",
  "no-break-yet": "long days without a reliable break yet",
  variable: "a schedule that changes a lot",
  steady: "short walks and home play",
  active: "about an hour of activity",
  "very-active": "long outings or dog sports",
  routine: "starter-level training",
  ongoing: "regular focused training",
  skilled: "a serious training project",
  simple: "simple coat care",
  regular: "regular brushing and upkeep",
  professional: "professional grooming",
  low: "low shedding",
  moderate: "moderate shedding",
  high: "shedding is not a deal-breaker",
  small: "small-dog logistics",
  medium: "medium-dog logistics",
  large: "large-dog logistics",
  giant: "giant-dog logistics",
  flexible: "flexible size",
  companion: "a close household companion",
  walks: "a neighborhood walking partner",
  adventure: "a hiking or adventure partner",
  sport: "training and dog sports",
  adults: "an adult household",
  children: "children in the household",
  dog: "a resident dog",
  cats: "cats or small pets",
  mixed: "a mixed household",
  adult: "an adult or rescue dog",
  puppy: "a puppy",
  either: "either a puppy or an adult dog",
  learning: "early-stage research"
});

const LEVEL = Object.freeze({
  steady: 1,
  active: 2,
  "very-active": 3,
  routine: 1,
  ongoing: 2,
  skilled: 3,
  simple: 1,
  regular: 2,
  professional: 3,
  low: 1,
  moderate: 2,
  high: 3
});

function isValidAnswer(key, value) {
  if (key === "household") {
    if (typeof value !== "string" || !value) return false;
    const selected = value.split("+");
    const unique = new Set(selected);
    return unique.size === selected.length
      && selected.every((option) => ANSWER_OPTIONS.household.includes(option))
      && !(unique.has("adults") && unique.size > 1);
  }
  return typeof value === "string" && ANSWER_OPTIONS[key]?.includes(value);
}

function validateAnswers(answers) {
  return Boolean(answers) && Object.keys(ANSWER_OPTIONS).every((key) => isValidAnswer(key, answers[key]));
}

function compareCapacity(required, available) {
  return LEVEL[required] - LEVEL[available];
}

function formatSizes(breed) {
  return breed.sizes.join(" / ");
}

function sizeMatches(breed, selectedSize) {
  return selectedSize === "flexible" || breed.sizes.includes(selectedSize);
}

function getMismatches(breed, answers) {
  const mismatches = [];

  if (!sizeMatches(breed, answers.size)) {
    mismatches.push(`You chose ${LABELS[answers.size]}; this breed’s adult-size band is ${formatSizes(breed)}.`);
  }
  if (compareCapacity(breed.activity, answers.activity) > 0) {
    mismatches.push(`Its ${LABELS[breed.activity]} baseline is above the activity you said is sustainable.`);
  }
  if (compareCapacity(breed.training, answers.training) > 0) {
    mismatches.push(`Its ${LABELS[breed.training]} baseline is above the training workload you selected.`);
  }
  if (compareCapacity(breed.grooming, answers.grooming) > 0) {
    mismatches.push(`Its ${LABELS[breed.grooming]} needs exceed the coat care you selected.`);
  }
  if (compareCapacity(breed.shedding, answers.shedding) > 0) {
    mismatches.push(`Its ${LABELS[breed.shedding]} level is above your shedding tolerance.`);
  }

  return mismatches;
}

function scoreBreed(breed, answers) {
  let score = 0;

  if (answers.size === "flexible") score += 1;
  else if (sizeMatches(breed, answers.size)) score += 7;

  for (const key of ["activity", "training", "grooming", "shedding"]) {
    const difference = compareCapacity(breed[key], answers[key]);
    if (difference === 0) score += 4;
    else if (difference < 0) score += 1;
  }

  if (breed.goals.includes(answers.goal)) score += 7;
  if (answers.stage === "adult" && ["greyhound", "whippet"].includes(breed.id)) score += 1;

  return score;
}

function matchingReasons(breed, answers) {
  const reasons = [];

  if (answers.size === "flexible") reasons.push(`You left size flexible; this breed spans the ${formatSizes(breed)} band${breed.sizes.length === 1 ? "" : "s"}.`);
  else if (sizeMatches(breed, answers.size)) reasons.push(`Its adult-size band includes your ${LABELS[answers.size]} choice.`);

  if (compareCapacity(breed.activity, answers.activity) <= 0) {
    reasons.push(`Its ${LABELS[breed.activity]} baseline stays within the routine you chose.`);
  }
  if (breed.goals.includes(answers.goal)) {
    reasons.push(`Its ${breed.purpose} background lines up with ${LABELS[answers.goal]}.`);
  }
  if (compareCapacity(breed.grooming, answers.grooming) <= 0 && compareCapacity(breed.shedding, answers.shedding) <= 0) {
    reasons.push(`Its ${LABELS[breed.grooming]} and ${LABELS[breed.shedding]} bands fit your coat limits.`);
  }
  if (compareCapacity(breed.training, answers.training) <= 0) {
    reasons.push(`Its ${LABELS[breed.training]} band stays within the training time you selected.`);
  }

  return reasons.slice(0, 3);
}

function selectDiverse(candidates, count) {
  const selected = [];
  const usedGroups = new Set();

  while (selected.length < count) {
    const differentGroup = candidates.find((item) => !selected.includes(item) && !usedGroups.has(item.breed.group));
    const fallback = candidates.find((item) => !selected.includes(item));
    const next = differentGroup || fallback;
    if (!next) break;
    selected.push(next);
    usedGroups.add(next.breed.group);
  }

  return selected;
}

function readinessFor(answers) {
  if (answers.company === "no-break-yet") {
    return {
      level: "plan-first",
      title: "fix the weekday care gap first.",
      text: "No breed label makes long, regular absences disappear. Arrange a reliable person, walker, daycare, or schedule change before choosing the dog."
    };
  }

  if (answers.company === "variable") {
    return {
      level: "check-plan",
      title: "turn the changing schedule into a dog-care plan.",
      text: "Write down the longest ordinary absence and who covers exercise, toileting, and company on that day. Then verify it with the specific dog’s provider."
    };
  }

  return {
    level: "research",
    title: "your routine is ready for deeper research.",
    text: "The next job is meeting real dogs and checking the assumptions in this brief with the people who know them."
  };
}

function buildChecklist(answers) {
  const household = new Set(answers.household.split("+"));
  const questions = [
    "What does a normal Tuesday of exercise, enrichment, rest, and company look like for this dog?",
    "How has this individual dog handled being left alone, and what signs of stress have you observed?",
    "What behavior has been seen in a home or foster setting, not only in a kennel or brief meeting?",
    "What medical care, medication, grooming, or training is already part of this dog’s routine?",
    "What support and return policy applies if the placement is not workable?"
  ];

  if (household.has("children")) {
    questions.push("Has this individual dog lived with children of similar ages, and what introduction and supervision plan is recommended?");
  }
  if (household.has("cats")) {
    questions.push("Has this dog lived with cats or small animals, what was observed, and what separation or introduction plan is recommended?");
  }
  if (household.has("dog")) {
    questions.push("How should this dog meet the resident dog, and what resource, play, or separation issues should we plan for?");
  }

  if (["puppy", "either"].includes(answers.stage)) {
    questions.push("Which breed-specific health screens were completed on both parents, and where can I verify the actual results?");
    questions.push("How were the puppies raised and socialized, and how was this puppy matched to my household?");
  }
  if (["adult", "either"].includes(answers.stage)) {
    questions.push("Which likes, dislikes, triggers, routines, and handling needs are known for this specific adult dog?");
  }

  return questions;
}

function rankBreeds(answers) {
  if (!validateAnswers(answers)) return null;

  const evaluated = BREEDS.map((breed) => {
    const mismatches = getMismatches(breed, answers);
    return {
      breed,
      score: scoreBreed(breed, answers),
      mismatches,
      cleanFit: mismatches.length === 0,
      reasons: matchingReasons(breed, answers)
    };
  }).sort((left, right) => {
    if (left.mismatches.length !== right.mismatches.length) return left.mismatches.length - right.mismatches.length;
    if (left.score !== right.score) return right.score - left.score;
    return left.breed.name.localeCompare(right.breed.name);
  });

  const clean = selectDiverse(evaluated.filter((item) => item.cleanFit), 3);
  const filled = [...clean];
  if (filled.length < 3) {
    const near = selectDiverse(evaluated.filter((item) => !item.cleanFit && !filled.includes(item)), 3 - filled.length);
    filled.push(...near);
  }

  return {
    recommendations: filled,
    cleanCount: clean.length,
    readiness: readinessFor(answers),
    checklist: buildChecklist(answers)
  };
}

const QUERY_KEYS = Object.freeze({
  company: "c",
  activity: "a",
  training: "t",
  grooming: "g",
  shedding: "s",
  size: "z",
  goal: "w",
  household: "h",
  stage: "p"
});

function encodeAnswers(answers) {
  if (!validateAnswers(answers)) return "";
  const params = new URLSearchParams();
  for (const [key, shortKey] of Object.entries(QUERY_KEYS)) params.set(shortKey, answers[key]);
  return params.toString();
}

function parseAnswers(input) {
  let params;
  try {
    if (input instanceof URLSearchParams) params = input;
    else if (input instanceof URL) params = input.searchParams;
    else {
      const raw = String(input || "");
      params = raw.includes("?") ? new URL(raw, "https://urdog.dev").searchParams : new URLSearchParams(raw.replace(/^\?/, ""));
    }
  } catch {
    return null;
  }

  const answers = {};
  for (const [key, shortKey] of Object.entries(QUERY_KEYS)) answers[key] = params.get(shortKey) || "";
  if (answers.household === "mixed") answers.household = "children+dog+cats";
  return validateAnswers(answers) ? answers : null;
}

function shareText(report) {
  const names = report?.recommendations?.map(({ breed }) => breed.name).join(", ");
  return names ? `My urpet shortlist: ${names}. Three starting points, the tradeoffs, and questions to ask before choosing.` : "";
}

export {
  ANSWER_OPTIONS,
  BREEDS,
  LABELS,
  REVIEWED_ON,
  buildChecklist,
  encodeAnswers,
  parseAnswers,
  rankBreeds,
  shareText,
  validateAnswers
};
