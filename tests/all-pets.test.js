import test from "node:test";
import assert from "node:assert/strict";

import {
  GUIDE_PROFILE_IDS,
  PET_LANES,
  PET_PROFILES,
  encodeGuideAnswerIds,
  encodePetAnswers,
  normalizePetAnswers,
  parsePetAnswers,
  rankPetProfiles,
  sharePetText
} from "../public/scripts/all-pets-engine.js";
import {
  normalizeSupportNote,
  qualifyingSupportNote
} from "../worker.js";
import {
  activePetStepIds,
  answersWithSafeSkippedDefaults
} from "../public/scripts/all-pets-flow.js";

const baseline = Object.freeze({
  mode: "kind",
  lanes: ["cats"],
  time: "steady",
  space: "compact",
  rhythm: "gentle",
  care: ["no-specialist-food"],
  household: "clear",
  vet: "general",
  horizon: "ten-plus"
});

function answers(overrides = {}) {
  return { ...baseline, ...overrides };
}

test("the doorway exposes exactly ten pet lanes and eleven species-specific profiles", () => {
  assert.equal(PET_LANES.length, 10);
  assert.equal(new Set(PET_LANES.map(({ id }) => id)).size, 10);
  assert.deepEqual(PET_LANES.map(({ id }) => id), [
    "dogs", "cats", "aquariums", "birds", "rabbits",
    "guinea-pigs", "hamsters", "tortoises", "geckos", "snakes"
  ]);
  assert.equal(PET_PROFILES.length, 11);
  assert.equal(PET_PROFILES.filter(({ laneId }) => laneId === "birds").length, 2);
  assert.equal(GUIDE_PROFILE_IDS.length, 10);
  assert.equal(PET_PROFILES.find(({ id }) => id === "dog-breed-module")?.href, "/dogs/");
});

test("answer normalization fails closed around lane counts and specialist-food choices", () => {
  assert.ok(normalizePetAnswers(baseline));
  assert.ok(normalizePetAnswers(answers({ mode: "open", lanes: [] })));
  assert.equal(normalizePetAnswers(answers({ mode: "kind", lanes: [] })), null);
  assert.equal(normalizePetAnswers(answers({ mode: "compare", lanes: ["cats"] })), null);
  assert.equal(normalizePetAnswers(answers({ mode: "compare", lanes: ["cats", "birds", "dogs", "snakes"] })), null);
  assert.equal(normalizePetAnswers(answers({ lanes: ["unknown"] })), null);
  assert.equal(normalizePetAnswers(answers({ care: ["no-specialist-food", "water-care"] })), null);
});

test("the conversation skips only questions irrelevant to the selected pet lanes", () => {
  assert.deepEqual(activePetStepIds({ mode: "kind", lanes: ["cats"] }), [
    "search", "time", "space", "rhythm", "horizon"
  ]);
  assert.deepEqual(activePetStepIds({ mode: "compare", lanes: ["cats", "birds"] }), [
    "search", "time", "space", "rhythm", "horizon"
  ]);
  assert.deepEqual(activePetStepIds({ mode: "kind", lanes: ["aquariums"] }), [
    "search", "time", "space", "rhythm", "care", "horizon"
  ]);
  assert.deepEqual(activePetStepIds({ mode: "kind", lanes: ["geckos"] }), [
    "search", "time", "space", "rhythm", "care", "household", "vet", "horizon"
  ]);
  assert.deepEqual(activePetStepIds({ mode: "open", lanes: [] }), [
    "search", "time", "space", "rhythm", "care", "household", "vet", "horizon"
  ]);
});

test("skipped specialist questions receive conservative valid defaults", () => {
  assert.deepEqual(answersWithSafeSkippedDefaults({ care: [], household: "", vet: "" }), {
    care: ["no-specialist-food"],
    household: "clear",
    vet: "general"
  });
  assert.deepEqual(answersWithSafeSkippedDefaults({
    care: ["live-insects"],
    household: "higher-risk",
    vet: "specialist-ready"
  }), {
    care: ["live-insects"],
    household: "higher-risk",
    vet: "specialist-ready"
  });
});

test("a reviewed cat can remain a research lead without implying a verdict", () => {
  const report = rankPetProfiles(baseline);
  assert.equal(report.status, "research_leads");
  assert.deepEqual(report.leads.map(({ id }) => id), ["domestic-cat-adult"]);
  assert.equal(report.leads[0].sources.length, 2);
  assert.equal(report.leads[0].questions.length, 3);
});

test("specialist food and habitat requirements become hard conflicts", () => {
  const fish = rankPetProfiles(answers({ lanes: ["aquariums"], space: "compact", rhythm: "observe" }));
  assert.equal(fish.leads.length, 0);
  assert.match(fish.blocked[0].conflicts.join(" "), /filtered aquarium|water-quality/i);
  assert.match(fish.blocked[0].conflicts.join(" "), /bowl|specialist aquarium/i);

  const gecko = rankPetProfiles(answers({ lanes: ["geckos"], space: "specialist", rhythm: "observe", vet: "specialist-ready" }));
  assert.equal(gecko.leads.length, 0);
  assert.match(gecko.blocked[0].conflicts.join(" "), /live invertebrates/i);

  const snake = rankPetProfiles(answers({ lanes: ["snakes"], space: "specialist", rhythm: "observe", vet: "specialist-ready" }));
  assert.equal(snake.leads.length, 0);
  assert.match(snake.blocked[0].conflicts.join(" "), /frozen-thawed rodents/i);
});

test("reptile household, vet, and whole-life gates cannot be outvoted", () => {
  const report = rankPetProfiles(answers({
    lanes: ["tortoises"],
    time: "habitat",
    space: "specialist",
    rhythm: "observe",
    household: "higher-risk",
    vet: "general",
    horizon: "ten-plus"
  }));
  assert.equal(report.leads.length, 0);
  assert.equal(report.hasReptileGate, true);
  const conflicts = report.blocked[0].conflicts.join(" ");
  assert.match(conflicts, /child under five|adult 65\+|immunocompromised/i);
  assert.match(conflicts, /reptile veterinarian/i);
  assert.match(conflicts, /multidecade/i);
});

test("social rhythm and movement space remain hard welfare boundaries", () => {
  const birds = rankPetProfiles(answers({ lanes: ["birds"], rhythm: "observe", space: "compact", time: "substantial" }));
  assert.equal(birds.leads.length, 0);
  assert.ok(birds.blocked.every(({ conflicts }) => conflicts.some((item) => /flight-capable/i.test(item))));
  assert.ok(birds.blocked.every(({ conflicts }) => conflicts.some((item) => /vocal, social/i.test(item))));

  const rabbit = rankPetProfiles(answers({ lanes: ["rabbits"], space: "compact", rhythm: "gentle" }));
  assert.equal(rabbit.leads.length, 0);
  assert.match(rabbit.blocked[0].conflicts.join(" "), /movement space/i);

  const hamster = rankPetProfiles(answers({ lanes: ["hamsters"], rhythm: "social", horizon: "under-ten" }));
  assert.equal(hamster.leads.length, 0);
  assert.match(hamster.blocked[0].conflicts.join(" "), /nocturnal, solitary/i);
});

test("fully supported reptile profiles can appear only as research leads", () => {
  const gecko = rankPetProfiles(answers({
    lanes: ["geckos"],
    time: "habitat",
    space: "specialist",
    rhythm: "observe",
    care: ["live-insects"],
    vet: "specialist-ready",
    horizon: "ten-plus"
  }));
  assert.deepEqual(gecko.leads.map(({ id }) => id), ["captive-bred-leopard-gecko"]);
  assert.equal(gecko.leads[0].sources.length, 2);
});

test("guide IDs contain only the normalized closed answer vocabulary", () => {
  const ids = encodeGuideAnswerIds({
    ...baseline,
    mode: "compare",
    lanes: ["cats", "dogs"]
  });
  assert.deepEqual(ids, [
    "mode-compare",
    "lane-cats",
    "lane-dogs",
    "time-steady",
    "space-compact",
    "rhythm-gentle",
    "care-no-specialist-food",
    "household-clear",
    "vet-general",
    "horizon-ten-plus"
  ]);
});

test("pet briefs round-trip through a shareable query and keep prepare-first language honest", () => {
  const query = encodePetAnswers({
    ...baseline,
    mode: "compare",
    lanes: ["cats", "birds"]
  });
  assert.match(query, /m=compare/);
  assert.match(query, /l=cats\.birds/);
  assert.deepEqual(parsePetAnswers(`https://urdog.dev/?${query}#pet-result`), {
    ...baseline,
    mode: "compare",
    lanes: ["cats", "birds"]
  });
  assert.equal(parsePetAnswers("?m=kind"), null);
  const leads = rankPetProfiles(baseline);
  assert.match(sharePetText(leads), /Adult domestic cat/);
  const blocked = rankPetProfiles(answers({ lanes: ["geckos"], space: "specialist", rhythm: "observe" }));
  assert.match(sharePetText(blocked), /no reviewed fit yet/i);
});

test("support keywords accept urpet and the legacy urdog spelling", () => {
  assert.equal(normalizeSupportNote(" UR-PET! "), "urpet");
  assert.equal(qualifyingSupportNote("tokens for urpet"), true);
  assert.equal(qualifyingSupportNote("my UR-DOG tip"), true);
  assert.equal(qualifyingSupportNote("dog only"), false);
});
