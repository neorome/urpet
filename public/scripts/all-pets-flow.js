const SPECIALIST_CARE_LANES = new Set(["aquariums", "tortoises", "geckos", "snakes"]);
const REPTILE_LANES = new Set(["tortoises", "geckos", "snakes"]);

export const PET_STEP_IDS = Object.freeze(["search", "time", "space", "rhythm", "care", "household", "vet", "horizon"]);

function includesLane(lanes, allowed) {
  return lanes.some((lane) => allowed.has(lane));
}

export function activePetStepIds({ mode = "", lanes = [] } = {}) {
  const broadSearch = mode === "open" || !mode;
  const needsSpecialistCare = broadSearch || includesLane(lanes, SPECIALIST_CARE_LANES);
  const needsReptileGates = broadSearch || includesLane(lanes, REPTILE_LANES);

  return PET_STEP_IDS.filter((id) => {
    if (id === "care") return needsSpecialistCare;
    if (id === "household" || id === "vet") return needsReptileGates;
    return true;
  });
}

export function answersWithSafeSkippedDefaults(input = {}) {
  return {
    ...input,
    care: Array.isArray(input.care) && input.care.length ? input.care : ["no-specialist-food"],
    household: input.household || "clear",
    vet: input.vet || "general"
  };
}
