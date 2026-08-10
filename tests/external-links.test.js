import test from "node:test";
import assert from "node:assert/strict";

import {
  destinationFor,
  destinationLabel,
  destinationReason
} from "../public/scripts/external-links.js";

test("only off-site HTTP destinations require the leaving-site dialog", () => {
  assert.equal(destinationFor("/breeds/", "https://urdog.dev/"), null);
  assert.equal(destinationFor("https://www.urdog.dev/photo-credits/", "https://urdog.dev/"), null);
  assert.equal(destinationFor("mailto:team@neorome.dev", "https://urdog.dev/"), null);
  assert.equal(destinationFor("javascript:alert(1)", "https://urdog.dev/"), null);
  assert.equal(destinationFor("https://www.petfinder.com/search/dogs-for-adoption/", "https://urdog.dev/")?.hostname, "www.petfinder.com");
});

test("known destinations receive plain, useful departure copy", () => {
  const petfinder = destinationFor("https://www.petfinder.com/search/dogs-for-adoption/", "https://urdog.dev/");
  const coffee = destinationFor("https://buymeacoffee.com/baneydonovan", "https://urdog.dev/");

  assert.equal(destinationLabel(petfinder), "Petfinder");
  assert.match(destinationReason(petfinder), /individual dog listings/i);
  assert.equal(destinationLabel(coffee), "Buy Me a Coffee");
  assert.match(destinationReason(coffee), /tip/i);
});

test("unknown sites show a readable hostname without leaking credentials", () => {
  const destination = destinationFor("https://user:pass@example.com/path", "https://urdog.dev/");
  assert.equal(destinationLabel(destination), "example.com");
  assert.doesNotMatch(destinationReason(destination), /user|pass/);
});
