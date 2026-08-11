import test from "node:test";
import assert from "node:assert/strict";

import {
  SEARCH_RADIUS_METERS,
  buildGeocodeUrl,
  buildShelterSearchUrl,
  mergeRescueResults,
  normalizeCoordinates,
  normalizeLocation,
  parseDirectoryResults,
  parseRescueResults
} from "../public/scripts/rescue-search.js";
import { HONDURAS_RESCUES } from "../public/scripts/honduras-rescues.js";

test("coordinates are validated and deliberately rounded before leaving the browser", () => {
  assert.deepEqual(normalizeCoordinates(35.9940329, -78.898619), {
    latitude: 35.994,
    longitude: -78.899
  });
  assert.equal(normalizeCoordinates(91, 0), null);
  assert.equal(normalizeCoordinates(0, -181), null);
  assert.equal(normalizeCoordinates("35.9", -78.8), null);
});

test("a coordinate search creates a bounded shelter lookup with address and contact fields", () => {
  const url = new URL(buildShelterSearchUrl(35.9940329, -78.898619));
  const viewbox = url.searchParams.get("viewbox").split(",").map(Number);

  assert.equal(url.origin, "https://nominatim.openstreetmap.org");
  assert.equal(url.pathname, "/search");
  assert.equal(url.searchParams.get("q"), "animal shelter");
  assert.equal(url.searchParams.get("bounded"), "1");
  assert.equal(url.searchParams.get("addressdetails"), "1");
  assert.equal(url.searchParams.get("extratags"), "1");
  assert.equal(url.searchParams.get("namedetails"), "1");
  assert.equal(viewbox.length, 4);
  assert.ok(viewbox[0] < -78.899 && viewbox[2] > -78.899);
  assert.ok(viewbox[1] > 35.994 && viewbox[3] < 35.994);
  assert.equal(SEARCH_RADIUS_METERS, 50_000);
});

test("manual locations are normalized and geocoded only through an explicit URL builder", () => {
  assert.equal(normalizeLocation("  Durham,   NC "), "Durham, NC");
  assert.equal(normalizeLocation("Durham}};out;{{"), "");
  assert.equal(buildGeocodeUrl("   "), null);
  assert.equal(buildGeocodeUrl("x".repeat(121)), null);

  const url = new URL(buildGeocodeUrl("  Durham, NC  "));
  assert.equal(url.origin, "https://nominatim.openstreetmap.org");
  assert.equal(url.pathname, "/search");
  assert.equal(url.searchParams.get("q"), "Durham, NC");
  assert.equal(url.searchParams.get("format"), "jsonv2");
  assert.equal(url.searchParams.get("limit"), "5");
});

test("OSM shelter results become an address-rich nearest-first list", () => {
  const rows = [
    {
      osm_type: "way",
      osm_id: 7,
      type: "animal_shelter",
      lat: "36.1",
      lon: "-78.9",
      address: { amenity: "Second Chance", road: "Hope Road", town: "Oxford", state: "North Carolina", postcode: "27565", country: "United States" },
      extratags: { website: "https://example.org", phone: "555-0100", opening_hours: "Mo-Fr 09:00-17:00" }
    },
    {
      osm_type: "node",
      osm_id: 2,
      type: "animal_shelter",
      lat: "36.001",
      lon: "-78.899",
      address: { amenity: "City Animal Shelter", house_number: "10", road: "Main St", city: "Durham", state: "North Carolina", postcode: "27701", country: "United States" },
      extratags: {}
    },
    {
      osm_type: "node",
      osm_id: 2,
      type: "animal_shelter",
      lat: "36.001",
      lon: "-78.899",
      address: { amenity: "duplicate" }
    },
    { osm_type: "relation", osm_id: 99, type: "animal_shelter", address: { amenity: "No usable center" } },
    { osm_type: "node", osm_id: 100, type: "animal_shelter", lat: "35.99", lon: "-78.89", address: {} }
  ];

  const shelters = parseRescueResults(rows, { latitude: 35.994, longitude: -78.899 });
  assert.equal(shelters.length, 2);
  assert.equal(shelters[0].name, "City Animal Shelter");
  assert.equal(shelters[0].address, "10 Main St, Durham, North Carolina 27701, United States");
  assert.equal(shelters[1].name, "Second Chance");
  assert.equal(shelters[1].website, "https://example.org/");
  assert.equal(shelters[1].openingHours, "Mo-Fr 09:00-17:00");
  assert.ok(shelters[0].distanceKm < shelters[1].distanceKm);
});

test("unsafe contact URLs and malformed provider rows fail closed", () => {
  const shelters = parseRescueResults([
    {
      osm_type: "node",
      osm_id: 1,
      type: "animal_shelter",
      lat: "35.99",
      lon: "-78.89",
      address: { amenity: "Safe name" },
      extratags: { website: "javascript:alert(1)", phone: "<img src=x>" }
    },
    null
  ], { latitude: 35.994, longitude: -78.899 });

  assert.equal(shelters.length, 1);
  assert.equal(shelters[0].website, "");
  assert.equal(shelters[0].phone, "<img src=x>");
});

test("Tegucigalpa gets a useful Honduras rescue contact even when OpenStreetMap has none", () => {
  const origin = { latitude: 14.1058135, longitude: -87.2047053 };
  const rescues = parseDirectoryResults(HONDURAS_RESCUES, origin);

  assert.ok(HONDURAS_RESCUES.length >= 10, "the directory should cover more than one Honduran region");
  assert.equal(rescues[0].name, "Organización Ari");
  assert.equal(rescues[0].address, "Tegucigalpa, Francisco Morazán, Honduras");
  assert.equal(rescues[0].locationPrecision, "city");
  assert.equal(rescues[0].phone, "+504 3158-2017");
  assert.equal(rescues[0].sourceLabel, "Honduras rescue directory");
});

test("Honduras directory pins stay local and merge with mapped shelters nearest-first", () => {
  const origin = { latitude: 15.5053535, longitude: -88.0250839 };
  const directory = parseDirectoryResults(HONDURAS_RESCUES, origin);
  const farAway = parseDirectoryResults(HONDURAS_RESCUES, { latitude: 40.7128, longitude: -74.006 });
  const mapped = [{ id: "node:1", name: "Mapped shelter", distanceKm: 0.1 }];
  const merged = mergeRescueResults(directory, mapped, mapped);

  assert.equal(farAway.length, 0);
  assert.equal(merged[0].name, "Refugio Amor y Abrigo");
  assert.equal(merged.filter(({ id }) => id === "node:1").length, 1);
  assert.ok(directory.some(({ name }) => name === "Refugio Amor y Abrigo"));
});
