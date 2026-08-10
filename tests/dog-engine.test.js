import test from "node:test";
import assert from "node:assert/strict";

import { DOGS, getDog, renderDogSvg } from "../public/scripts/dog-engine.js";

test("the match desk has six distinct dog illustrations", () => {
  assert.equal(DOGS.length, 6);
  assert.equal(new Set(DOGS.map(({ id }) => id)).size, 6);
  assert.equal(new Set(DOGS.map(({ name }) => name)).size, 6);

  for (const dog of DOGS) {
    assert.match(dog.id, /^[a-z]+$/);
    assert.match(dog.name, /^[A-Z]+$/);
    assert.ok(dog.role.length > 8);
    assert.match(dog.card, /^#[A-F0-9]{6}$/i);
  }
});

test("staff lookup is deterministic and fails closed", () => {
  assert.equal(getDog(DOGS[0].id), DOGS[0]);
  assert.equal(getDog(DOGS.at(-1).id), DOGS.at(-1));
  assert.equal(getDog("not-on-staff"), null);
  assert.equal(getDog(), null);
});

test("every staff dog renders a labeled, script-free SVG", () => {
  for (const dog of DOGS) {
    const svg = renderDogSvg(dog, "test");
    assert.match(svg, /^<svg/);
    assert.match(svg, new RegExp(`aria-label="${dog.name}, ${dog.role}"`));
    assert.match(svg, /class="dog-art"/);
    assert.doesNotMatch(svg, /<script|javascript:|on\w+=/i);
  }
});

test("invalid dog input fails closed", () => {
  assert.equal(renderDogSvg(null), "");
  assert.equal(renderDogSvg({ id: "made-up" }), "");
});
