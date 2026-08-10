const MAX_LOCATION_LENGTH = 120;
const SEARCH_RADIUS_METERS = 50_000;

function normalizeLocation(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  return /[{}]/u.test(normalized) ? "" : normalized;
}

function buildRescueMapQuery(location) {
  const normalized = normalizeLocation(location);
  if (!normalized || normalized.length > MAX_LOCATION_LENGTH) return null;

  const coordinates = `{{geocodeCoords:${normalized}}}`;
  return `[out:json][timeout:25];
(
  nwr["amenity"="animal_shelter"](around:${SEARCH_RADIUS_METERS},${coordinates});
  nwr["animal_shelter"~"(^|;)dog(;|$)"](around:${SEARCH_RADIUS_METERS},${coordinates});
);
out center tags;`;
}

function buildRescueMapUrl(location) {
  const query = buildRescueMapQuery(location);
  if (!query) return null;

  const url = new URL("https://overpass-turbo.eu/");
  url.searchParams.set("Q", query);
  url.searchParams.set("R", "1");
  return url.toString();
}

export {
  MAX_LOCATION_LENGTH,
  SEARCH_RADIUS_METERS,
  buildRescueMapQuery,
  buildRescueMapUrl,
  normalizeLocation
};
