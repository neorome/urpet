const DOGS = Object.freeze([
  {
    id: "miso",
    name: "MISO",
    role: "senior sniff inspector",
    line: "small schedule. enormous nose.",
    card: "#A9DDFF",
    accent: "#DFFF35",
    fur: "#E59B5A",
    patch: "#FFF8E8",
    ears: "flop",
    expression: "soft",
    accessory: "mug"
  },
  {
    id: "scout",
    name: "SCOUT",
    role: "assistant trail captain",
    line: "prepared for a very small expedition.",
    card: "#FFD56A",
    accent: "#A9DDFF",
    fur: "#D79343",
    patch: "#FFF8E8",
    ears: "mixed",
    expression: "soft",
    accessory: "camera"
  },
  {
    id: "pickle",
    name: "PICKLE",
    role: "licensed commotion manager",
    line: "no inside voice. excellent intentions.",
    card: "#DFFF35",
    accent: "#FF5A45",
    fur: "#B87943",
    patch: "#FFF8E8",
    ears: "mixed",
    expression: "wide",
    accessory: "bandana"
  },
  {
    id: "cleo",
    name: "CLEO",
    role: "quality control pup",
    line: "already checked the stop signs.",
    card: "#A9DDFF",
    accent: "#FF5A45",
    fur: "#2F3035",
    patch: "#FFF8E8",
    ears: "point",
    expression: "focus",
    accessory: "glasses"
  },
  {
    id: "bingo",
    name: "BINGO",
    role: "director of outside",
    line: "here for a good time immediately.",
    card: "#FF5A45",
    accent: "#DFFF35",
    fur: "#FFF1D5",
    patch: "#A45D3C",
    ears: "mixed",
    expression: "wide",
    accessory: "ball"
  },
  {
    id: "fig",
    name: "FIG",
    role: "low-key field researcher",
    line: "quietly judging the itinerary.",
    card: "#DFFF35",
    accent: "#C8B7FF",
    fur: "#56433A",
    patch: "#D8BCA7",
    ears: "point",
    expression: "focus",
    accessory: "bandana"
  }
]);

const DOG_BY_ID = new Map(DOGS.map((dog) => [dog.id, dog]));

function getDog(id) {
  return DOG_BY_ID.get(id) || null;
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function earsMarkup(type, fur, patch) {
  const common = `fill="${fur}" stroke="#171514" stroke-width="8" stroke-linejoin="round"`;
  const inner = `fill="${patch}" stroke="#171514" stroke-width="5"`;

  switch (type) {
    case "point":
      return `<path d="M111 119 126 30l61 77Z" ${common}/><path d="m136 83 3-30 25 43Z" ${inner}/><path d="m233 106 64-75 9 96Z" ${common}/><path d="m263 94 25-38-2 54Z" ${inner}/>`;
    case "round":
      return `<ellipse cx="132" cy="91" rx="54" ry="48" ${common}/><ellipse cx="275" cy="91" rx="54" ry="48" ${common}/><ellipse cx="132" cy="92" rx="25" ry="22" ${inner}/><ellipse cx="275" cy="92" rx="25" ry="22" ${inner}/>`;
    case "long":
      return `<path d="M138 91c-48-25-73 10-57 81 9 39 48 36 65-8l22-57Z" ${common}/><path d="M269 91c48-25 73 10 57 81-9 39-48 36-65-8l-22-57Z" ${common}/><path d="M113 116c-8 16-5 37 4 50" fill="none" stroke="${patch}" stroke-width="12" stroke-linecap="round"/><path d="M294 116c8 16 5 37-4 50" fill="none" stroke="${patch}" stroke-width="12" stroke-linecap="round"/>`;
    case "mixed":
      return `<path d="M143 106 102 35l-20 100Z" ${common}/><path d="m116 92-12-31-8 48Z" ${inner}/><path d="M268 94c47-24 73 8 54 71-11 37-48 29-62-12l-18-45Z" ${common}/><path d="M294 117c7 15 3 31-6 43" fill="none" stroke="${patch}" stroke-width="11" stroke-linecap="round"/>`;
    case "flop":
    default:
      return `<path d="M147 101c-44-35-79-12-75 52 3 47 45 52 70 10l28-48Z" ${common}/><path d="M260 101c44-35 79-12 75 52-3 47-45 52-70 10l-28-48Z" ${common}/><path d="M108 120c-7 16-4 32 5 44" fill="none" stroke="${patch}" stroke-width="12" stroke-linecap="round"/><path d="M299 120c7 16 4 32-5 44" fill="none" stroke="${patch}" stroke-width="12" stroke-linecap="round"/>`;
  }
}

function expressionMarkup(type) {
  if (type === "focus") {
    return `<path d="m157 148 28 7M250 148l-28 7" fill="none" stroke="#171514" stroke-width="8" stroke-linecap="round"/><circle cx="174" cy="169" r="8" fill="#171514"/><circle cx="233" cy="169" r="8" fill="#171514"/>`;
  }

  if (type === "wide") {
    return `<circle cx="174" cy="167" r="16" fill="#FFF8E8" stroke="#171514" stroke-width="6"/><circle cx="233" cy="167" r="16" fill="#FFF8E8" stroke="#171514" stroke-width="6"/><circle cx="178" cy="169" r="7" fill="#171514"/><circle cx="229" cy="169" r="7" fill="#171514"/>`;
  }

  return `<path d="M158 170q16 15 31 0M218 170q16 15 31 0" fill="none" stroke="#171514" stroke-width="8" stroke-linecap="round"/>`;
}

function accessoryMarkup(type, accent) {
  switch (type) {
    case "mug":
      return `<g transform="translate(271 240) rotate(-7)"><path d="M0 0h60v57H8Q0 57 0 49Z" fill="${accent}" stroke="#171514" stroke-width="7"/><path d="M60 12h10q23 0 16 25-5 17-26 13" fill="none" stroke="#171514" stroke-width="7"/><path d="M15-10q8-16 0-28M36-10q8-16 0-28" fill="none" stroke="#171514" stroke-width="5" stroke-linecap="round"/></g>`;
    case "bandana":
      return `<path d="m153 226 51 77 52-77Z" fill="${accent}" stroke="#171514" stroke-width="7" stroke-linejoin="round"/><circle cx="204" cy="256" r="7" fill="#171514"/>`;
    case "glasses":
      return `<g fill="none" stroke="#171514" stroke-width="8"><circle cx="173" cy="169" r="26"/><circle cx="235" cy="169" r="26"/><path d="M199 169h10M147 161l-25-8M261 161l25-8"/></g>`;
    case "ball":
      return `<g transform="translate(289 270)"><circle r="43" fill="${accent}" stroke="#171514" stroke-width="8"/><path d="M-37-18q39 11 61-24M-25 35Q-5 5 37 18" fill="none" stroke="#171514" stroke-width="6"/></g>`;
    case "camera":
      return `<g transform="translate(254 246) rotate(-5)"><rect width="91" height="65" rx="12" fill="${accent}" stroke="#171514" stroke-width="7"/><path d="M17 0 29-17h31L71 0" fill="${accent}" stroke="#171514" stroke-width="7"/><circle cx="47" cy="32" r="19" fill="#A9DDFF" stroke="#171514" stroke-width="7"/><circle cx="77" cy="14" r="5" fill="#171514"/></g>`;
    default:
      return "";
  }
}

function renderDogSvg(dog, instance = "art") {
  if (!dog || !DOG_BY_ID.has(dog.id)) return "";

  const label = escapeText(`${dog.name}, ${dog.role}`);
  const instanceId = String(instance).replace(/[^a-z0-9-]/gi, "").slice(0, 24) || "art";
  const clipId = `dog-head-${escapeText(dog.id)}-${escapeText(instanceId)}`;

  return `<svg class="dog-art" viewBox="0 0 408 360" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="${clipId}"><path d="M120 126q13-53 84-53t84 53v58q0 79-84 79t-84-79Z"/></clipPath></defs>
    <path class="dog-art__spark" d="m55 55 7 19 20 7-20 8-7 19-8-19-19-8 19-7Z" fill="${dog.accent}" stroke="#171514" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="344" cy="71" r="15" fill="#FFF8E8" stroke="#171514" stroke-width="6"/>
    <path class="dog-art__tail" d="M319 254q64-24 38-76-13-25-34-9-16 12-1 29 12 14 30 0" fill="none" stroke="#171514" stroke-width="30" stroke-linecap="round"/>
    <path class="dog-art__tail" d="M319 254q64-24 38-76-13-25-34-9-16 12-1 29 12 14 30 0" fill="none" stroke="${dog.fur}" stroke-width="17" stroke-linecap="round"/>
    <path d="M112 235q14-42 92-42t92 42l16 102H96Z" fill="${dog.fur}" stroke="#171514" stroke-width="8" stroke-linejoin="round"/>
    <path d="M132 300v37M276 300v37" stroke="#171514" stroke-width="31" stroke-linecap="round"/>
    <path d="M132 300v37M276 300v37" stroke="${dog.fur}" stroke-width="18" stroke-linecap="round"/>
    ${earsMarkup(dog.ears, dog.fur, dog.patch)}
    <path d="M120 126q13-53 84-53t84 53v58q0 79-84 79t-84-79Z" fill="${dog.fur}" stroke="#171514" stroke-width="8"/>
    <g clip-path="url(#${clipId})"><ellipse cx="267" cy="112" rx="58" ry="42" fill="${dog.patch}" transform="rotate(18 267 112)"/></g>
    ${expressionMarkup(dog.expression)}
    <ellipse cx="204" cy="205" rx="54" ry="39" fill="${dog.patch}" stroke="#171514" stroke-width="6"/>
    <path d="M188 195q16-14 32 0-2 22-16 22t-16-22Z" fill="#171514"/>
    <path d="M204 217q0 17-20 20m20-20q0 17 20 20" fill="none" stroke="#171514" stroke-width="6" stroke-linecap="round"/>
    <path d="M137 233q67 25 134 0" fill="none" stroke="#171514" stroke-width="9" stroke-linecap="round"/>
    <path d="M176 243q28 20 56 0v24q-28 24-56 0Z" fill="${dog.accent}" stroke="#171514" stroke-width="6"/>
    <circle cx="204" cy="270" r="15" fill="#FFF8E8" stroke="#171514" stroke-width="6"/>
    <text x="204" y="276" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="900" fill="#171514">${escapeText(dog.name.slice(0, 1))}</text>
    ${accessoryMarkup(dog.accessory, dog.accent)}
  </svg>`;
}

export { DOGS, getDog, renderDogSvg };
