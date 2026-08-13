/**
 * Deterministic, source-linked screening for the reviewed urpet pet lanes.
 *
 * This is deliberately a requirements matcher, not a care guide or a claim
 * that a species is universally suitable. Profiles stay species-specific and
 * hard welfare conflicts are never hidden by a high preference score.
 */

export const PET_SOURCES = Object.freeze({
  catCare: "https://www.rspca.org.uk/documents/1494939/8736188/How%2Bto%2Btake%2Bcare%2Bof%2Byour%2Bcat.pdf/5f61af7d-d09b-a643-122d-dd100d8ab19b?t=1550587168178",
  catIndoor: "https://www.rspca.org.uk/documents/1494939/7712578/Cats_Meetingtheneedsofindoorcats.pdf/c6bb2dfc-7fe3-cd3c-5654-8ae269978f69?t=1552668640870",
  fish: "https://www.rspca.org.uk/adviceandwelfare/pets/fish",
  birdEnvironment: "https://www.rspca.org.uk/adviceandwelfare/pets/birds/environment",
  birdCompany: "https://www.rspca.org.uk/adviceandwelfare/pets/birds/company",
  rabbits: "https://www.rspca.org.uk/findapet/advice/families",
  guineaPigEnvironment: "https://www.rspca.org.uk/adviceandwelfare/pets/rodents/guineapigs/environment",
  guineaPigBehaviour: "https://www.rspca.org.uk/adviceandwelfare/pets/rodents/guineapigs/behaviour",
  hamsters: "https://www.rspca.org.uk/adviceandwelfare/pets/rodents/hamsters/behaviour",
  tortoise: "https://www.rspca.org.uk/documents/1494939/7712578/Spur-thighed%2C%20Hermann%27s%2C%20marginated%20and%20Horsfield%27s%20tortoises%20%28PDF%20124KB%29/a072c67f-ebce-a7cf-542c-c7a4061182f8?download=true&version=3.0",
  gecko: "https://www.rspca.org.uk/adviceandwelfare/pets/other/leopardgecko",
  snake: "https://www.rspca.org.uk/adviceandwelfare/pets/other/cornsnake",
  reptiles: "https://www.cdc.gov/healthy-pets/about/reptiles-and-amphibians.html"
});

export const PET_LANES = Object.freeze([
  { id: "dogs", label: "Dogs", description: "Continue into the reviewed 205-breed module." },
  { id: "cats", label: "Cats", description: "Start with an adult domestic cat profile." },
  { id: "aquariums", label: "Freshwater aquariums", description: "Start with a mature goldfish aquarium—not a bowl." },
  { id: "birds", label: "Companion birds", description: "Compare compatible budgerigar and cockatiel pairs." },
  { id: "rabbits", label: "Rabbits", description: "Start with a bonded domestic rabbit pair." },
  { id: "guinea-pigs", label: "Guinea pigs", description: "Start with a compatible pair." },
  { id: "hamsters", label: "Hamsters", description: "Start with one solo Syrian hamster." },
  { id: "tortoises", label: "Turtles & tortoises", description: "Only Hermann's tortoise is reviewed so far." },
  { id: "geckos", label: "Geckos", description: "Only the leopard gecko is reviewed so far." },
  { id: "snakes", label: "Snakes", description: "Only the captive-bred corn snake is reviewed so far." }
]);

export const RESEARCHING = Object.freeze([
  "Tropical community tanks, bettas, and other freshwater fish",
  "Large parrots and talking-bird selection",
  "Individual rabbit breeds and single-rabbit plans",
  "Dwarf, Chinese, and Roborovski hamsters",
  "Aquatic turtles, sliders, and other tortoise species",
  "Crested geckos and other gecko species",
  "Ball pythons, boas, other snakes, and all venomous species"
]);

const source = (label, href) => Object.freeze({ label, href });

export const PET_PROFILES = Object.freeze([
  {
    id: "dog-breed-module",
    laneId: "dogs",
    label: "Dog breed research",
    eyebrow: "continue to the dog module",
    summary: "A dog is not one broad match. Use the existing nine-question module to compare all 205 reviewed breed profiles with your ordinary week.",
    evidence: ["Breed behavior and care bands vary materially.", "The dog module keeps individual breed tradeoffs visible."],
    sources: [],
    questions: [
      "What does an ordinary weekday look like for this individual dog?",
      "Which health screens and veterinary records apply to this breed or mix?",
      "What happens when the dog is alone, handled, or around your household?"
    ],
    href: "/dogs/",
    time: ["steady", "substantial"],
    spaces: ["compact", "room"],
    rhythms: ["gentle", "social"],
    horizons: ["ten-plus", "multidecade"]
  },
  {
    id: "domestic-cat-adult",
    laneId: "cats",
    label: "Adult domestic cat",
    eyebrow: "cat research lead",
    summary: "Daily feeding, litter care, play, refuge, vertical resting choices, and interaction led by the cat—not a promise of constant handling.",
    evidence: ["Can work in a compact home when it still provides separate resources, refuge, and enrichment.", "Does not require live feeder food or a specialist reptile setup."],
    sources: [source("RSPCA cat care", PET_SOURCES.catCare), source("RSPCA indoor-cat environment", PET_SOURCES.catIndoor)],
    questions: [
      "Where does this adult cat choose to hide, rest, and climb?",
      "What litter, play, and resource routine is already working?",
      "How does this cat show that handling or company is becoming too much?"
    ],
    time: ["steady", "substantial"],
    spaces: ["compact", "room"],
    rhythms: ["gentle", "social", "observe"],
    horizons: ["ten-plus", "multidecade"]
  },
  {
    id: "goldfish-mature-aquarium-pair",
    laneId: "aquariums",
    label: "Mature goldfish aquarium",
    eyebrow: "freshwater research lead",
    summary: "A planned, mature, filtered, species-appropriate aquarium with water-quality work. Goldfish can live up to 25 years and are not bowl pets.",
    evidence: ["Fits someone who wants a quiet animal to observe.", "Makes habitat preparation and maintenance the central job."],
    sources: [source("RSPCA fish welfare", PET_SOURCES.fish)],
    questions: [
      "How was the aquarium cycled, and what do current water tests show?",
      "What filtration, adult tank size, and outage plan support these fish?",
      "Why is this exact pair or group compatible at adult size?"
    ],
    requires: ["water-care"],
    time: ["habitat", "substantial"],
    spaces: ["specialist"],
    rhythms: ["observe"],
    horizons: ["ten-plus", "multidecade"]
  },
  {
    id: "budgerigar-pair",
    laneId: "birds",
    label: "Compatible budgerigar pair",
    eyebrow: "companion-bird research lead",
    summary: "Social colony birds needing compatible company, daily care and enrichment, and substantial safe flight opportunity—not cage-only decoration.",
    evidence: ["Matches a household open to social, vocal animals.", "Keeps pair compatibility and daily safe flight ahead of appearance."],
    sources: [source("RSPCA bird environment", PET_SOURCES.birdEnvironment), source("RSPCA bird company", PET_SOURCES.birdCompany)],
    questions: [
      "How will these birds get at least six hours of safe indoor flight?",
      "What evidence shows this pair is compatible?",
      "Which avian veterinarian and backup carer can support them?"
    ],
    time: ["substantial"],
    spaces: ["room", "specialist"],
    rhythms: ["social"],
    horizons: ["ten-plus", "multidecade"]
  },
  {
    id: "cockatiel-pair",
    laneId: "birds",
    label: "Compatible cockatiel pair",
    eyebrow: "companion-bird research lead",
    summary: "A social, vocal pair with a large flight-capable environment, daily care, and enrichment. This is not a small decorative-cage plan.",
    evidence: ["Matches sustained social-animal care better than a quiet-observation brief.", "Requires the same flight-space and compatibility checks as other reviewed colony birds."],
    sources: [source("RSPCA bird environment", PET_SOURCES.birdEnvironment), source("RSPCA bird company", PET_SOURCES.birdCompany)],
    questions: [
      "How will these birds get at least six hours of safe indoor flight?",
      "How loud are these individuals during an ordinary morning and evening?",
      "What evidence shows this pair is compatible, and who is their avian vet?"
    ],
    time: ["substantial"],
    spaces: ["room", "specialist"],
    rhythms: ["social"],
    horizons: ["ten-plus", "multidecade"]
  },
  {
    id: "bonded-domestic-rabbit-pair",
    laneId: "rabbits",
    label: "Bonded domestic rabbit pair",
    eyebrow: "rabbit research lead",
    summary: "An intelligent, social bonded pair needing substantial movement space, enrichment, daily hygiene, suitable housing, and gentle handling.",
    evidence: ["Pairs social companionship with a relatively quiet home.", "Puts movement space and adult responsibility ahead of a small-hutch assumption."],
    sources: [source("RSPCA family pet guidance", PET_SOURCES.rabbits)],
    questions: [
      "What evidence shows this pair is bonded and should stay together?",
      "Where is their full-time movement and enrichment space?",
      "Which adult owns daily care, holiday cover, and veterinary decisions?"
    ],
    time: ["substantial", "steady"],
    spaces: ["room"],
    rhythms: ["gentle", "social"],
    horizons: ["ten-plus", "multidecade"]
  },
  {
    id: "compatible-guinea-pig-pair",
    laneId: "guinea-pigs",
    label: "Compatible guinea pig pair",
    eyebrow: "guinea-pig research lead",
    summary: "Social animals needing compatible guinea pig company, daily spot cleaning, regular deep cleaning, refuge, forage, exercise, and supported handling.",
    evidence: ["Matches a gentle social-animal routine.", "Makes companionship and cleaning non-negotiable."],
    sources: [source("RSPCA guinea pig environment", PET_SOURCES.guineaPigEnvironment), source("RSPCA guinea pig behaviour", PET_SOURCES.guineaPigBehaviour)],
    questions: [
      "What evidence shows these guinea pigs are compatible?",
      "How large are their refuge and exercise areas when fully set up?",
      "Who owns daily spot cleaning, weekly deep cleaning, and holiday care?"
    ],
    time: ["steady", "substantial"],
    spaces: ["room", "compact"],
    rhythms: ["gentle", "social"],
    horizons: ["under-ten", "ten-plus", "multidecade"]
  },
  {
    id: "syrian-hamster-solo",
    laneId: "hamsters",
    label: "Solo Syrian hamster",
    eyebrow: "hamster research lead",
    summary: "A solitary, nocturnal hamster with a secure enriched environment, protected sleep, safe nighttime exercise, and separation from household predators.",
    evidence: ["Can suit someone comfortable observing nighttime activity.", "Solo housing is a requirement, not a sign that daily care can be skipped."],
    sources: [source("RSPCA hamster behaviour", PET_SOURCES.hamsters)],
    questions: [
      "What enclosure and wheel dimensions support full nighttime movement?",
      "How will sleep be protected from daytime handling?",
      "How is the enclosure secured from cats, dogs, falls, and escape?"
    ],
    time: ["steady"],
    spaces: ["compact", "room"],
    rhythms: ["observe", "night"],
    horizons: ["under-ten", "ten-plus", "multidecade"]
  },
  {
    id: "captive-bred-hermanns-tortoise",
    laneId: "tortoises",
    label: "Captive-bred Hermann's tortoise",
    eyebrow: "tortoise research lead",
    summary: "A terrestrial reptile with a prepared specialist environment, minimal handling, experienced veterinary care, holiday cover, and a multidecade commitment.",
    evidence: ["Matches habitat-focused care and observation.", "Makes whole-life facilities and finance explicit."],
    sources: [source("RSPCA tortoise guidance", PET_SOURCES.tortoise), source("CDC reptile safety", PET_SOURCES.reptiles)],
    questions: [
      "What proves captive-bred origin and lawful transfer?",
      "How are heat, light, habitat, holiday cover, and power loss handled?",
      "Which experienced reptile veterinarian has reviewed the plan?"
    ],
    reptile: true,
    specialistVet: true,
    multidecade: true,
    time: ["habitat", "substantial"],
    spaces: ["specialist"],
    rhythms: ["observe", "gentle"],
    horizons: ["multidecade"]
  },
  {
    id: "captive-bred-leopard-gecko",
    laneId: "geckos",
    label: "Captive-bred leopard gecko",
    eyebrow: "gecko research lead",
    summary: "A solitary reptile with an enriched heat- and light-managed enclosure, limited animal-led handling, live invertebrate feeding, and reptile-vet access.",
    evidence: ["Matches habitat-focused care and limited handling.", "Makes feeder-insect care and supplementation visible before acquisition."],
    sources: [source("RSPCA leopard gecko care", PET_SOURCES.gecko), source("CDC reptile safety", PET_SOURCES.reptiles)],
    questions: [
      "Show me the heat, light, hide, and supplementation plan before the gecko arrives.",
      "How are feeder insects housed, gut-loaded, and handled humanely?",
      "Which reptile veterinarian and backup carer can support this animal?"
    ],
    reptile: true,
    specialistVet: true,
    requires: ["live-insects"],
    time: ["habitat", "steady"],
    spaces: ["specialist"],
    rhythms: ["observe", "gentle", "night"],
    horizons: ["ten-plus", "multidecade"]
  },
  {
    id: "captive-bred-corn-snake",
    laneId: "snakes",
    label: "Captive-bred corn snake",
    eyebrow: "snake research lead",
    summary: "A solitary nonvenomous snake with a secure temperature-managed vivarium, limited appropriate handling, frozen-thawed rodent feeding, and reptile-vet access.",
    evidence: ["Matches quiet observation and habitat-focused care.", "The 10–15 year commitment and frozen-rodent routine are visible upfront."],
    sources: [source("RSPCA corn snake care", PET_SOURCES.snake), source("CDC reptile safety", PET_SOURCES.reptiles)],
    questions: [
      "How is this enclosure secured, heated, ventilated, and enriched?",
      "How are frozen-thawed rodents stored and handled hygienically?",
      "What proves captive-bred origin, lawful transfer, and reptile-vet access?"
    ],
    reptile: true,
    specialistVet: true,
    requires: ["frozen-rodents"],
    time: ["habitat", "steady"],
    spaces: ["specialist"],
    rhythms: ["observe", "gentle", "night"],
    horizons: ["ten-plus", "multidecade"]
  }
]);

export const ANSWER_OPTIONS = Object.freeze({
  mode: ["open", "kind", "compare"],
  time: ["steady", "substantial", "habitat"],
  space: ["compact", "room", "specialist"],
  rhythm: ["observe", "gentle", "social", "night"],
  care: ["no-specialist-food", "water-care", "live-insects", "frozen-rodents"],
  household: ["clear", "higher-risk"],
  vet: ["general", "finding-specialist", "specialist-ready"],
  horizon: ["under-ten", "ten-plus", "multidecade"]
});

const laneIds = new Set(PET_LANES.map(({ id }) => id));
const optionSets = Object.fromEntries(Object.entries(ANSWER_OPTIONS).map(([key, values]) => [key, new Set(values)]));

export function normalizePetAnswers(input = {}) {
  const normalized = {
    mode: String(input.mode || ""),
    lanes: [...new Set(Array.isArray(input.lanes) ? input.lanes.map(String) : [])],
    time: String(input.time || ""),
    space: String(input.space || ""),
    rhythm: String(input.rhythm || ""),
    care: [...new Set(Array.isArray(input.care) ? input.care.map(String) : [])],
    household: String(input.household || ""),
    vet: String(input.vet || ""),
    horizon: String(input.horizon || "")
  };

  if (!optionSets.mode.has(normalized.mode)) return null;
  if (!normalized.lanes.every((id) => laneIds.has(id))) return null;
  if (normalized.mode === "kind" && normalized.lanes.length !== 1) return null;
  if (normalized.mode === "compare" && (normalized.lanes.length < 2 || normalized.lanes.length > 3)) return null;
  if (normalized.mode === "open" && normalized.lanes.length > 3) return null;
  for (const key of ["time", "space", "rhythm", "household", "vet", "horizon"]) {
    if (!optionSets[key].has(normalized[key])) return null;
  }
  if (!normalized.care.length || !normalized.care.every((id) => optionSets.care.has(id))) return null;
  if (normalized.care.includes("no-specialist-food") && normalized.care.length > 1) return null;
  return normalized;
}

function hardConflicts(profile, answers) {
  const conflicts = [];
  const hasCare = (id) => answers.care.includes(id);

  for (const requirement of profile.requires || []) {
    if (!hasCare(requirement)) {
      const messages = {
        "water-care": "A mature, filtered aquarium and regular water-quality work must be ready before fish arrive.",
        "live-insects": "This profile requires keeping, supplementing, and feeding varied live invertebrates.",
        "frozen-rodents": "This profile requires hygienic storage and feeding of frozen-thawed rodents—not live prey."
      };
      conflicts.push(messages[requirement]);
    }
  }

  if (profile.reptile && answers.household === "higher-risk") {
    conflicts.push("CDC advises households with a child under five, an adult 65+, or an immunocompromised person to consider another pet because reptiles can carry Salmonella.");
  }
  if (profile.specialistVet && answers.vet !== "specialist-ready") {
    conflicts.push("An experienced reptile veterinarian must be identified before acquisition.");
  }
  if (profile.multidecade && answers.horizon !== "multidecade") {
    conflicts.push("This animal needs a multidecade whole-life plan, including finance, facilities, and holiday cover.");
  }
  if (profile.spaces && !profile.spaces.includes(answers.space)) {
    const messages = {
      "goldfish-mature-aquarium-pair": "A prepared specialist aquarium is required; a bowl or same-day setup is not a safe plan.",
      "budgerigar-pair": "This pair needs a large flight-capable environment and substantial safe daily flight time.",
      "cockatiel-pair": "This pair needs a large flight-capable environment and substantial safe daily flight time.",
      "bonded-domestic-rabbit-pair": "A small-hutch or compact-only plan does not provide the movement space this bonded pair needs.",
      "captive-bred-hermanns-tortoise": "A stable specialist enclosure must be prepared before the tortoise arrives.",
      "captive-bred-leopard-gecko": "A heat-, light-, and hide-managed specialist enclosure must be prepared first.",
      "captive-bred-corn-snake": "A secure, ventilated, temperature-managed vivarium must be prepared first."
    };
    if (messages[profile.id]) conflicts.push(messages[profile.id]);
  }
  if (profile.id === "syrian-hamster-solo" && answers.rhythm === "social") {
    conflicts.push("A nocturnal, solitary Syrian hamster is not a daytime social-companion plan.");
  }
  if (["budgerigar-pair", "cockatiel-pair"].includes(profile.id) && answers.rhythm !== "social") {
    conflicts.push("This vocal, social bird pair conflicts with a quiet-observation or limited-interaction brief.");
  }
  if (profile.horizons && !profile.horizons.includes(answers.horizon)) {
    if (profile.id === "goldfish-mature-aquarium-pair") conflicts.push("Goldfish may live up to 25 years; this brief needs at least a 10+ year plan.");
    if (profile.id === "captive-bred-corn-snake") conflicts.push("Corn snakes may live 10–15 years in captivity; this brief needs a 10+ year plan.");
  }
  return [...new Set(conflicts)];
}

function preferenceScore(profile, answers) {
  let score = 0;
  if (answers.lanes.includes(profile.laneId)) score += 12;
  if (profile.time?.includes(answers.time)) score += 4;
  if (profile.spaces?.includes(answers.space)) score += 4;
  if (profile.rhythms?.includes(answers.rhythm)) score += 4;
  if (profile.horizons?.includes(answers.horizon)) score += 2;
  if (answers.vet === "specialist-ready" && profile.specialistVet) score += 2;
  if (answers.time === "habitat" && ["aquariums", "tortoises", "geckos", "snakes"].includes(profile.laneId)) score += 3;
  return score;
}

function matchReasons(profile, answers) {
  const reasons = [];
  if (profile.time?.includes(answers.time)) reasons.push("Its care rhythm aligns with the kind of daily work you selected.");
  if (profile.spaces?.includes(answers.space)) reasons.push("Your stated space approach can support the reviewed setup.");
  if (profile.rhythms?.includes(answers.rhythm)) reasons.push("Its interaction and activity rhythm is close to what you want.");
  if (profile.horizons?.includes(answers.horizon)) reasons.push("Your commitment horizon covers the reviewed minimum.");
  if (!reasons.length) reasons.push("It remains in your chosen lane, but the setup details need closer review.");
  return reasons.slice(0, 3);
}

export function rankPetProfiles(input) {
  const answers = normalizePetAnswers(input);
  if (!answers) return null;

  const selected = answers.lanes.length ? new Set(answers.lanes) : null;
  const candidates = PET_PROFILES
    .filter((profile) => !selected || selected.has(profile.laneId))
    .map((profile) => {
      const conflicts = hardConflicts(profile, answers);
      return {
        ...profile,
        conflicts,
        reasons: matchReasons(profile, answers),
        score: preferenceScore(profile, answers),
        status: conflicts.length ? "prepare_first" : "possible_with_review"
      };
    })
    .sort((a, b) => a.conflicts.length - b.conflicts.length || b.score - a.score || a.label.localeCompare(b.label));

  const leads = candidates.filter(({ conflicts }) => conflicts.length === 0).slice(0, 3);
  const blocked = candidates.filter(({ conflicts }) => conflicts.length > 0).slice(0, 3);
  const hasReptileGate = answers.household === "higher-risk" && candidates.some(({ reptile }) => reptile);

  return {
    answers,
    leads,
    blocked,
    hasReptileGate,
    status: leads.length ? "research_leads" : "prepare_first"
  };
}

export function encodeGuideAnswerIds(answers) {
  const normalized = normalizePetAnswers(answers);
  if (!normalized) return [];
  return [
    `mode-${normalized.mode}`,
    ...normalized.lanes.map((id) => `lane-${id}`),
    `time-${normalized.time}`,
    `space-${normalized.space}`,
    `rhythm-${normalized.rhythm}`,
    ...normalized.care.map((id) => `care-${id}`),
    `household-${normalized.household}`,
    `vet-${normalized.vet}`,
    `horizon-${normalized.horizon}`
  ];
}

export const GUIDE_PROFILE_IDS = Object.freeze(PET_PROFILES.filter(({ id }) => id !== "dog-breed-module").map(({ id }) => id));

const GUIDE_COMMON_QUESTIONS = Object.freeze([
  "What does a realistic seven-day care routine look like, including feeding, cleaning, observation, exercise, and enrichment where relevant?",
  "What current veterinary records, health history, and species-appropriate professional support are available for this individual or group?",
  "What is the plan for housing rules, full costs, emergencies, holidays, equipment or power failures, and backup care?"
]);

export const GUIDE_QUESTION_BANKS = Object.freeze(Object.fromEntries(
  PET_PROFILES
    .filter(({ id }) => GUIDE_PROFILE_IDS.includes(id))
    .map((profile) => [
      profile.id,
      Object.freeze([...profile.questions, ...GUIDE_COMMON_QUESTIONS].map((text, index) => Object.freeze({
        id: `${profile.id}:q${index + 1}`,
        text
      })))
    ])
));
