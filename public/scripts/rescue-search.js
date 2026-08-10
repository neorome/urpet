const MAX_LOCATION_LENGTH = 120;
const SEARCH_RADIUS_METERS = 50_000;

function normalizeLocation(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  return /[{}]/u.test(normalized) ? "" : normalized;
}

function normalizeCoordinates(latitude, longitude) {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return {
    latitude: Math.round(latitude * 1000) / 1000,
    longitude: Math.round(longitude * 1000) / 1000
  };
}

function buildGeocodeUrl(location) {
  const normalized = normalizeLocation(location);
  if (!normalized || normalized.length > MAX_LOCATION_LENGTH) return null;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", normalized);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  return url.toString();
}

function buildShelterSearchUrl(latitude, longitude) {
  const coordinates = normalizeCoordinates(latitude, longitude);
  if (!coordinates) return null;
  const latitudeDelta = SEARCH_RADIUS_METERS / 111_320;
  const longitudeScale = Math.max(0.1, Math.cos(coordinates.latitude * (Math.PI / 180)));
  const longitudeDelta = Math.min(180, SEARCH_RADIUS_METERS / (111_320 * longitudeScale));
  const left = Math.max(-180, coordinates.longitude - longitudeDelta);
  const right = Math.min(180, coordinates.longitude + longitudeDelta);
  const top = Math.min(90, coordinates.latitude + latitudeDelta);
  const bottom = Math.max(-90, coordinates.latitude - latitudeDelta);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", "animal shelter");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("viewbox", [left, top, right, bottom].map((value) => value.toFixed(4)).join(","));
  url.searchParams.set("bounded", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("limit", "40");
  return url.toString();
}

function safeWebUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function providerCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
}

function distanceKilometers(origin, destination) {
  const radians = (degrees) => degrees * (Math.PI / 180);
  const latitudeDistance = radians(destination.latitude - origin.latitude);
  const longitudeDistance = radians(destination.longitude - origin.longitude);
  const a = Math.sin(latitudeDistance / 2) ** 2
    + Math.cos(radians(origin.latitude))
    * Math.cos(radians(destination.latitude))
    * Math.sin(longitudeDistance / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function addressFromResult(row) {
  const address = row?.address && typeof row.address === "object" ? row.address : {};
  const street = [address.house_number, address.road || address.pedestrian || address.path].filter(Boolean).join(" ");
  const locality = address.city || address.town || address.village || address.hamlet || address.municipality || address.county;
  const regionAndPostcode = [address.state || address.province, address.postcode].filter(Boolean).join(" ");
  return [street, locality, regionAndPostcode, address.country]
    .filter(Boolean)
    .join(", ");
}

function parseRescueResults(rows, origin) {
  const normalizedOrigin = providerCoordinates(origin?.latitude, origin?.longitude);
  if (!normalizedOrigin || !Array.isArray(rows)) return [];
  const seen = new Set();
  const shelters = [];

  for (const row of rows) {
    const coordinates = providerCoordinates(row?.lat, row?.lon);
    if (!coordinates) continue;
    const osmType = String(row.osm_type || "");
    const osmId = Number(row.osm_id);
    if (!["node", "way", "relation"].includes(osmType) || !Number.isInteger(osmId)) continue;
    if (row.type !== "animal_shelter" && !row.extratags?.animal_shelter) continue;
    const address = row.address && typeof row.address === "object" ? row.address : {};
    const namedetails = row.namedetails && typeof row.namedetails === "object" ? row.namedetails : {};
    const name = String(namedetails.name || address.amenity || address.office || "").trim();
    if (!name) continue;
    const key = `${osmType}:${osmId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const distanceKm = distanceKilometers(normalizedOrigin, coordinates);
    if (distanceKm > SEARCH_RADIUS_METERS / 1000) continue;
    const extras = row.extratags && typeof row.extratags === "object" ? row.extratags : {};
    shelters.push({
      id: key,
      name,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      distanceKm,
      address: addressFromResult(row),
      phone: String(extras.phone || extras["contact:phone"] || ""),
      website: safeWebUrl(extras.website || extras["contact:website"] || extras.url || ""),
      openingHours: String(extras.opening_hours || ""),
      osmUrl: `https://www.openstreetmap.org/${osmType}/${encodeURIComponent(osmId)}`
    });
  }

  return shelters.sort((left, right) => left.distanceKm - right.distanceKm || left.name.localeCompare(right.name));
}

function parseGeocodeResults(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const coordinates = providerCoordinates(row?.lat, row?.lon);
    const label = String(row?.display_name || "").trim();
    if (!coordinates || !label) return [];
    return [{
      ...coordinates,
      label,
      type: String(row.type || row.addresstype || "place")
    }];
  });
}

export {
  MAX_LOCATION_LENGTH,
  SEARCH_RADIUS_METERS,
  buildGeocodeUrl,
  buildShelterSearchUrl,
  normalizeCoordinates,
  normalizeLocation,
  parseGeocodeResults,
  parseRescueResults,
  safeWebUrl
};
