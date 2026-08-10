import test from "node:test";
import assert from "node:assert/strict";

import {
  SEARCH_RADIUS_METERS,
  buildRescueMapQuery,
  buildRescueMapUrl
} from "../public/scripts/rescue-search.js";

test("a representative local search opens a runnable nearby-shelter map", () => {
  const url = new URL(buildRescueMapUrl("  Durham, NC  "));
  const query = url.searchParams.get("Q");

  assert.equal(url.origin, "https://overpass-turbo.eu");
  assert.equal(url.pathname, "/");
  assert.equal(url.searchParams.get("R"), "1");
  assert.equal(query, buildRescueMapQuery("Durham, NC"));
  assert.match(query, new RegExp(`around:${SEARCH_RADIUS_METERS},\\{\\{geocodeCoords:Durham, NC\\}\\}`));
  assert.match(query, /nwr\["amenity"="animal_shelter"\]/);
  assert.match(query, /nwr\["animal_shelter"~"\(\^\|;\)dog\(;\|\$\)"\]/);
  assert.match(query, /out center tags;/);
});

test("local rescue searches reject blank and unreasonably long locations", () => {
  assert.equal(buildRescueMapUrl("   "), null);
  assert.equal(buildRescueMapUrl("x".repeat(121)), null);
  assert.equal(buildRescueMapUrl("Durham}};out;{{"), null);
});
