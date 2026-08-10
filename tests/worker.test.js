import test from "node:test";
import assert from "node:assert/strict";

import worker, { SECURITY_HEADERS } from "../worker.js";

function environment(response) {
  return {
    ASSETS: {
      async fetch() {
        return response;
      }
    }
  };
}

test("www permanently redirects to the canonical apex and preserves the request target", async () => {
  const response = await worker.fetch(
    new Request("https://www.urdog.dev/results?dog=miso#card"),
    environment(new Response("unused"))
  );

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://urdog.dev/results?dog=miso#card");
});

test("index.html permanently redirects to the clean canonical URL", async () => {
  const response = await worker.fetch(
    new Request("https://urdog.dev/index.html?from=old"),
    environment(new Response("unused"))
  );

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://urdog.dev/?from=old");
});

test("nested index pages and directory aliases redirect to one canonical URL", async () => {
  const nested = await worker.fetch(
    new Request("https://urdog.dev/breeds/index.html?group=hound"),
    environment(new Response("unused"))
  );
  const alias = await worker.fetch(
    new Request("https://urdog.dev/photo-credits"),
    environment(new Response("unused"))
  );

  assert.equal(nested.status, 308);
  assert.equal(nested.headers.get("location"), "https://urdog.dev/breeds/?group=hound");
  assert.equal(alias.status, 308);
  assert.equal(alias.headers.get("location"), "https://urdog.dev/photo-credits/");
});

test("apex assets receive security and fresh-HTML cache headers", async () => {
  const asset = new Response("<!doctype html><title>ur dog</title>", {
    headers: { "content-type": "text/html; charset=utf-8" }
  });
  const response = await worker.fetch(new Request("https://urdog.dev/"), environment(asset));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "public, max-age=0, must-revalidate");
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(response.headers.get(name), value);
  }
});

test("missing pages tell crawlers not to index the error response", async () => {
  const asset = new Response("not found", {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
  const response = await worker.fetch(new Request("https://urdog.dev/no-dog"), environment(asset));

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-robots-tag"), "noindex");
});

test("local breed photos revalidate because release filenames are stable", async () => {
  const asset = new Response("RIFF", {
    headers: { "content-type": "image/webp" }
  });
  const response = await worker.fetch(
    new Request("https://urdog.dev/assets/breeds/poodle.webp"),
    environment(asset)
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "public, max-age=0, must-revalidate");
});
