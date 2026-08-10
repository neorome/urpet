import test from "node:test";
import assert from "node:assert/strict";

import { BREEDS } from "../public/scripts/breed-catalog.js";
import {
  ANSWER_OPTIONS,
  encodeAnswers,
  parseAnswers,
  rankBreeds,
  validateAnswers
} from "../public/scripts/breed-engine.js";

const COMPLETE_ANSWERS = Object.freeze({
  company: "under-four",
  activity: "active",
  training: "ongoing",
  grooming: "regular",
  shedding: "moderate",
  size: "medium",
  goal: "walks",
  household: "adults",
  stage: "either"
});

const EXPECTED_GROUP_COUNTS = Object.freeze({
  sporting: 33,
  hound: 33,
  working: 32,
  terrier: 32,
  toy: 22,
  "non-sporting": 20,
  herding: 33
});

test("the catalog contains all 205 unique registry breeds", () => {
  assert.equal(BREEDS.length, 205);
  assert.equal(new Set(BREEDS.map(({ id }) => id)).size, 205);
  assert.equal(new Set(BREEDS.map(({ name }) => name)).size, 205);

  const counts = Object.fromEntries(
    Object.keys(EXPECTED_GROUP_COUNTS).map((group) => [
      group,
      BREEDS.filter((breed) => breed.group === group).length
    ])
  );
  assert.deepEqual(counts, EXPECTED_GROUP_COUNTS);
});

test("every breed has explicit fit bands, cautions, and an official research link", () => {
  const allowedSizes = new Set(["small", "medium", "large", "giant"]);
  const allowedActivity = new Set(["steady", "active", "very-active"]);
  const allowedTraining = new Set(["routine", "ongoing", "skilled"]);
  const allowedGrooming = new Set(["simple", "regular", "professional"]);
  const allowedShedding = new Set(["low", "moderate", "high"]);
  const allowedGoals = new Set(["companion", "walks", "adventure", "sport"]);

  for (const breed of BREEDS) {
    assert.ok(breed.sizes.length >= 1, `${breed.name} needs a size band`);
    assert.ok(breed.sizes.every((size) => allowedSizes.has(size)), `${breed.name} has an invalid size band`);
    assert.ok(allowedActivity.has(breed.activity), `${breed.name} needs an activity band`);
    assert.ok(allowedTraining.has(breed.training), `${breed.name} needs a training band`);
    assert.ok(allowedGrooming.has(breed.grooming), `${breed.name} needs a grooming band`);
    assert.ok(allowedShedding.has(breed.shedding), `${breed.name} needs a shedding band`);
    assert.ok(breed.goals.length >= 1 && breed.goals.every((goal) => allowedGoals.has(goal)));
    assert.ok(breed.caution.length >= 40, `${breed.name} needs useful caution copy`);
    assert.match(breed.source, /^https:\/\/www\.akc\.org\/dog-breeds\/[a-z0-9-]+\/$/);
    assert.equal(breed.reviewedOn, "2026-08-10");
  }
});

test("cross-group varieties remain one breed without losing their useful ranges", () => {
  const poodle = BREEDS.find(({ id }) => id === "poodle");
  const manchester = BREEDS.find(({ id }) => id === "manchester-terrier");

  assert.deepEqual(poodle.sizes, ["small", "medium", "large"]);
  assert.deepEqual(poodle.secondaryGroups, ["toy"]);
  assert.equal(poodle.sourceUrls.length, 3);
  assert.deepEqual(manchester.sizes, ["small", "medium"]);
  assert.deepEqual(manchester.secondaryGroups, ["toy"]);
  assert.equal(manchester.sourceUrls.length, 2);
});

test("complete answers validate and share links round-trip exactly", () => {
  assert.equal(validateAnswers(COMPLETE_ANSWERS), true);
  const query = encodeAnswers(COMPLETE_ANSWERS);
  assert.deepEqual(parseAnswers(query), COMPLETE_ANSWERS);

  for (const [key, options] of Object.entries(ANSWER_OPTIONS)) {
    assert.equal(validateAnswers({ ...COMPLETE_ANSWERS, [key]: options.at(-1) }), true);
  }
  assert.equal(validateAnswers({ ...COMPLETE_ANSWERS, activity: "heroic-saturday" }), false);
});

test("the matcher returns three unique, explainable research leads", () => {
  const scenarios = [
    COMPLETE_ANSWERS,
    { ...COMPLETE_ANSWERS, activity: "steady", training: "routine", grooming: "simple", shedding: "low", size: "small", goal: "companion" },
    { ...COMPLETE_ANSWERS, activity: "very-active", training: "skilled", grooming: "professional", shedding: "high", size: "large", goal: "sport" },
    { ...COMPLETE_ANSWERS, size: "giant", goal: "walks", stage: "adult" },
    { ...COMPLETE_ANSWERS, company: "no-break-yet", household: "mixed", stage: "puppy" }
  ];

  for (const answers of scenarios) {
    const report = rankBreeds(answers);
    assert.equal(report.recommendations.length, 3);
    assert.equal(new Set(report.recommendations.map(({ breed }) => breed.id)).size, 3);
    assert.ok(report.recommendations.every(({ reasons }) => reasons.length >= 1));
    assert.ok(report.checklist.length >= 5);

    for (const recommendation of report.recommendations.filter(({ cleanFit }) => cleanFit)) {
      assert.equal(recommendation.mismatches.length, 0);
      if (answers.size !== "flexible") {
        assert.ok(recommendation.breed.sizes.includes(answers.size));
      }
    }
  }
});

test("a missing weekday care plan is never disguised as a breed solution", () => {
  const report = rankBreeds({ ...COMPLETE_ANSWERS, company: "no-break-yet" });
  assert.equal(report.readiness.level, "plan-first");
  assert.match(report.readiness.title, /care gap/i);
  assert.match(report.readiness.text, /before choosing the dog/i);
});

test("the household and search path produce questions for the individual dog", () => {
  const report = rankBreeds({ ...COMPLETE_ANSWERS, household: "mixed", stage: "either" });
  const checklist = report.checklist.join(" ");
  assert.match(checklist, /children/i);
  assert.match(checklist, /cats/i);
  assert.match(checklist, /resident dog/i);
  assert.match(checklist, /health screens/i);
  assert.match(checklist, /specific adult dog/i);
});
