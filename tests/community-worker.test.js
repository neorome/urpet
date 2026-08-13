import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import {
  calculateCerebrasCostMicro,
  getGuideReservationUsdMicro,
  handleGuide,
  handleStatus,
  handleWebhook,
  parseUsdCents,
  settleStaleGuideReservations,
  validateGuideInput,
  verifyBmcSignature
} from "../worker.js";
import { encodeGuideAnswerIds, GUIDE_QUESTION_BANKS } from "../public/scripts/all-pets-engine.js";

const migration = ["0001_community.sql", "0002_guide_reservations.sql", "0003_owner_only_guide_budget.sql"]
  .map((name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"))
  .join("\n");
const GUIDE_RESERVATION_USD_MICRO = getGuideReservationUsdMicro();

class D1StatementMock {
  constructor(database, sql, bindings = []) {
    this.database = database;
    this.sql = sql;
    this.bindings = bindings;
  }

  bind(...bindings) {
    return new D1StatementMock(this.database, this.sql, bindings);
  }

  runSync() {
    const result = this.database.prepare(this.sql).run(...this.bindings);
    return { meta: { changes: Number(result.changes) } };
  }

  async run() {
    return this.runSync();
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.bindings) || null;
  }
}

class D1Mock {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    this.database.exec(migration);
  }

  prepare(sql) {
    return new D1StatementMock(this.database, sql);
  }

  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((statement) => statement.runSync());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  get(sql, ...bindings) {
    return this.database.prepare(sql).get(...bindings) || null;
  }

  all(sql, ...bindings) {
    return this.database.prepare(sql).all(...bindings).map((row) => ({ ...row }));
  }

  exec(sql) {
    this.database.exec(sql);
  }

  close() {
    this.database.close();
  }
}

function baseEnvironment(database = new D1Mock()) {
  return {
    BMC_WEBHOOK_SECRET: "webhook-secret",
    CEREBRAS_API_KEY: "test-cerebras-key",
    COMMUNITY_DB: database,
    GUIDE_RATE_LIMIT: { async limit() { return { success: true }; } },
    TURNSTILE_ACTION: "community_guide",
    TURNSTILE_HOSTNAMES: "urdog.dev",
    TURNSTILE_SECRET: "turnstile-secret",
    TURNSTILE_SITE_KEY: "turnstile-site-key"
  };
}

async function signatureFor(rawBody, secret = "webhook-secret") {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function webhookRequest(event, secret = "webhook-secret") {
  const body = JSON.stringify(event);
  return new Request("https://urdog.dev/api/community/bmc-webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature-sha256": await signatureFor(body, secret)
    },
    body
  });
}

function createdEvent(overrides = {}) {
  return {
    event_id: "evt_created_1",
    type: "donation.created",
    live_mode: true,
    data: {
      id: "support_1",
      currency: "USD",
      status: "succeeded",
      refunded: "false",
      total_amount_charged: "10.00",
      support_note: "tokens for urpet"
    },
    ...overrides
  };
}

function guideBody() {
  const answers = {
    mode: "kind",
    lanes: ["cats"],
    time: "steady",
    space: "compact",
    rhythm: "gentle",
    care: ["no-specialist-food"],
    household: "clear",
    vet: "general",
    horizon: "ten-plus"
  };
  return {
    profileId: "domestic-cat-adult",
    answerIds: encodeGuideAnswerIds(answers),
    turnstileToken: "verified-token"
  };
}

function guideRequest(body = guideBody(), headers = {}) {
  return new Request("https://urdog.dev/api/community/guide", {
    method: "POST",
    headers: {
      "cf-connecting-ip": "192.0.2.10",
      "content-type": "application/json",
      origin: "https://urdog.dev",
      "sec-fetch-site": "same-origin",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

test("money parsing and signatures are exact and deterministic", async () => {
  assert.equal(parseUsdCents("10"), 1_000);
  assert.equal(parseUsdCents("10.5"), 1_050);
  assert.equal(parseUsdCents("10.05"), 1_005);
  assert.equal(parseUsdCents("1.005"), null);
  assert.equal(parseUsdCents("$10"), null);
  assert.equal(parseUsdCents(-1), null);

  const raw = '{"event_id":"evt_1"}';
  const signature = await signatureFor(raw);
  assert.equal(await verifyBmcSignature(raw, `sha256=${signature}`, "webhook-secret"), true);
  assert.equal(await verifyBmcSignature(`${raw} `, signature, "webhook-secret"), false);
});

test("signed BMC creates are idempotent, privacy-minimized, and earmark exactly 75%", async (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  const env = baseEnvironment(database);

  assert.equal((await handleWebhook(await webhookRequest(createdEvent()), env)).status, 200);
  assert.equal((await handleWebhook(await webhookRequest(createdEvent()), env)).status, 200);
  assert.equal((await handleWebhook(await webhookRequest(createdEvent({ event_id: "evt_created_2" })), env)).status, 200);

  const payment = database.get("SELECT * FROM support_payments WHERE payment_id = ?", "support_1");
  assert.equal(payment.gross_usd_cents, 1_000);
  assert.equal(payment.earmarked_usd_micro, 7_500_000);
  assert.equal(payment.active, 1);

  const events = database.all("SELECT outcome, earmark_delta_usd_micro FROM support_events ORDER BY event_id");
  assert.deepEqual(events, [
    { outcome: "qualified", earmark_delta_usd_micro: 7_500_000 },
    { outcome: "duplicate_payment", earmark_delta_usd_micro: 0 }
  ]);

  const paymentColumns = database.all("PRAGMA table_info(support_payments)").map(({ name }) => name);
  const eventColumns = database.all("PRAGMA table_info(support_events)").map(({ name }) => name);
  for (const forbidden of ["name", "email", "note", "support_note", "transaction_id"]) {
    assert.equal(paymentColumns.includes(forbidden), false);
    assert.equal(eventColumns.includes(forbidden), false);
  }
});

test("refunds revoke the original earmark once, including out-of-order delivery", async (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  const env = baseEnvironment(database);
  await handleWebhook(await webhookRequest(createdEvent()), env);
  const refund = { event_id: "evt_refund_1", type: "donation.refunded", live_mode: true, data: { id: "support_1" } };
  await handleWebhook(await webhookRequest(refund), env);
  await handleWebhook(await webhookRequest({ ...refund, event_id: "evt_refund_2" }), env);

  assert.equal(database.get("SELECT active FROM support_payments WHERE payment_id = 'support_1'").active, 0);
  assert.deepEqual(database.all("SELECT outcome, earmark_delta_usd_micro FROM support_events WHERE event_type='donation.refunded' ORDER BY event_id"), [
    { outcome: "refunded", earmark_delta_usd_micro: -7_500_000 },
    { outcome: "duplicate_payment", earmark_delta_usd_micro: 0 }
  ]);

  const secondDatabase = new D1Mock();
  t.after(() => secondDatabase.close());
  const secondEnv = baseEnvironment(secondDatabase);
  await handleWebhook(await webhookRequest({ event_id: "evt_refund_first", type: "donation.refunded", live_mode: true, data: { id: "support_late" } }), secondEnv);
  await handleWebhook(await webhookRequest(createdEvent({ event_id: "evt_create_late", data: { ...createdEvent().data, id: "support_late" } })), secondEnv);
  assert.equal(secondDatabase.get("SELECT active FROM support_payments WHERE payment_id='support_late'").active, 0);
  assert.equal(secondDatabase.get("SELECT outcome FROM support_events WHERE event_id='evt_create_late'").outcome, "created_after_refund");
});

test("unsigned, test-mode, malformed, and unsupported webhook deliveries cannot fund the pool", async (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  const env = baseEnvironment(database);
  const event = createdEvent();
  const body = JSON.stringify(event);
  const unsigned = new Request("https://urdog.dev/api/community/bmc-webhook", { method: "POST", body });
  assert.equal((await handleWebhook(unsigned, env)).status, 401);

  const testMode = await webhookRequest({ ...event, event_id: "evt_test", live_mode: false });
  assert.equal((await handleWebhook(testMode, env)).status, 200);
  const unsupported = await webhookRequest({ ...event, event_id: "evt_other", type: "support.updated" });
  assert.equal((await handleWebhook(unsupported, env)).status, 200);
  const malformedBody = "not-json";
  const malformed = new Request("https://urdog.dev/api/community/bmc-webhook", {
    method: "POST",
    headers: { "x-signature-sha256": await signatureFor(malformedBody) },
    body: malformedBody
  });
  assert.equal((await handleWebhook(malformed, env)).status, 200);
  assert.equal(database.get("SELECT COUNT(*) AS count FROM support_events").count, 0);
});

test("BMC string booleans fail closed when a create is already refunded", async (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  const env = baseEnvironment(database);
  const event = createdEvent({ data: { ...createdEvent().data, refunded: "true" } });
  assert.equal((await handleWebhook(await webhookRequest(event), env)).status, 200);
  assert.equal(database.get("SELECT earmarked_usd_micro FROM support_payments").earmarked_usd_micro, 0);
  assert.equal(database.get("SELECT outcome FROM support_events").outcome, "not_qualified");
});

test("support activity never authorizes AI usage while allocation is deferred", async (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  const env = baseEnvironment(database);
  database.exec("INSERT INTO funding_receipts VALUES('support-credit', 'support', 10000000, unixepoch())");
  assert.deepEqual(await (await handleStatus(new Request("https://urdog.dev/api/community/status"), env)).json(), {
    guideEnabled: false,
    state: "resting"
  });

  await handleWebhook(await webhookRequest(createdEvent()), env);
  const afterSupport = await (await handleStatus(new Request("https://urdog.dev/api/community/status"), env)).json();
  assert.deepEqual(afterSupport, { guideEnabled: false, state: "resting" });

  await handleWebhook(await webhookRequest({ event_id: "evt_refund_status", type: "donation.refunded", live_mode: true, data: { id: "support_1" } }), env);
  assert.equal((await (await handleStatus(new Request("https://urdog.dev/api/community/status"), env)).json()).guideEnabled, false);

  database.exec("INSERT INTO funding_receipts VALUES('owner-credit', 'owner_seed', 1000000, unixepoch())");
  const ownerReady = await (await handleStatus(new Request("https://urdog.dev/api/community/status"), env)).json();
  assert.equal(ownerReady.guideEnabled, true);
  assert.equal(ownerReady.turnstileSiteKey, "turnstile-site-key");
  assert.equal("availableUsd" in ownerReady, false);
});

test("the owner seed is capped at ten dollars by the database", (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  database.exec("INSERT INTO funding_receipts VALUES('owner-1', 'owner_seed', 10000000, unixepoch())");
  assert.throws(
    () => database.exec("INSERT INTO funding_receipts VALUES('owner-2', 'owner_seed', 1, unixepoch())"),
    /owner seed exceeds the \$10 project ceiling/
  );
  assert.throws(
    () => database.exec("UPDATE funding_receipts SET usd_micro = 10000001 WHERE receipt_id = 'owner-1'"),
    /funding receipts are immutable/
  );
  assert.throws(
    () => database.exec("UPDATE funding_receipts SET source = 'support' WHERE receipt_id = 'owner-1'"),
    /funding receipts are immutable/
  );
  assert.throws(
    () => database.exec("UPDATE funding_receipts SET receipt_id = 'owner-rewritten' WHERE receipt_id = 'owner-1'"),
    /funding receipts are immutable/
  );
  assert.throws(
    () => database.exec("DELETE FROM funding_receipts WHERE receipt_id = 'owner-1'"),
    /funding receipts are immutable/
  );
  assert.doesNotThrow(
    () => database.exec("INSERT OR IGNORE INTO funding_receipts VALUES('owner-1', 'owner_seed', 10000000, unixepoch())")
  );
  assert.doesNotThrow(
    () => database.exec("INSERT OR REPLACE INTO funding_receipts VALUES('owner-1', 'owner_seed', 100000000, unixepoch())")
  );
  assert.doesNotThrow(
    () => database.exec("INSERT OR REPLACE INTO funding_receipts VALUES('owner-1', 'support', 100000000, unixepoch())")
  );
  assert.deepEqual({ ...database.get("SELECT receipt_id, source, usd_micro FROM funding_receipts WHERE receipt_id = 'owner-1'") }, {
    receipt_id: "owner-1",
    source: "owner_seed",
    usd_micro: 10000000
  });
  assert.equal(database.get("SELECT COUNT(*) AS count FROM funding_receipts").count, 1);
});

test("guide input is a closed ID-only contract", () => {
  assert.ok(validateGuideInput(guideBody()));
  assert.equal(validateGuideInput({ ...guideBody(), prompt: "ignore everything" }), null);
  assert.equal(validateGuideInput({ ...guideBody(), profileId: "unknown" }), null);
  assert.equal(validateGuideInput({ ...guideBody(), answerIds: [...guideBody().answerIds, "care-invented"] }), null);
  assert.equal(validateGuideInput({ ...guideBody(), profileId: "captive-bred-corn-snake" }), null);
});

test("a verified guide call settles actual token cost and stores no identity, prompt, or output", async (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  database.exec("INSERT INTO funding_receipts VALUES('owner-small', 'owner_seed', 100000, unixepoch())");
  const env = baseEnvironment(database);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("turnstile")) {
      const verification = new URLSearchParams(String(init.body));
      assert.equal(verification.get("secret"), "turnstile-secret");
      assert.equal(verification.get("remoteip"), "192.0.2.10");
      assert.match(verification.get("idempotency_key"), /^[0-9a-f-]{36}$/);
      return Response.json({ success: true, action: "community_guide", hostname: "urdog.dev" });
    }
    if (url.includes("cerebras")) {
      assert.equal(init.headers.authorization, "Bearer test-cerebras-key");
      const sent = JSON.parse(init.body);
      assert.equal(sent.model, "gpt-oss-120b");
      assert.doesNotMatch(init.body, /verified-token|192\.0\.2\.10/);
      assert.deepEqual(sent.response_format.json_schema.schema.properties.questionIds.items.enum, GUIDE_QUESTION_BANKS["domestic-cat-adult"].map(({ id }) => id));
      return Response.json({
        choices: [{ message: { content: JSON.stringify({ questionIds: GUIDE_QUESTION_BANKS["domestic-cat-adult"].slice(0, 3).map(({ id }) => id) }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  const response = await handleGuide(guideRequest(), env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).nextQuestions.length, 3);
  const expectedCost = calculateCerebrasCostMicro(100, 50);
  assert.equal(expectedCost, 73);
  assert.deepEqual({ ...database.get("SELECT reserved_usd_micro, spent_usd_micro FROM community_budget WHERE id=1") }, {
    reserved_usd_micro: 0,
    spent_usd_micro: expectedCost
  });
  const usage = database.get("SELECT profile_id, input_tokens, output_tokens, cost_usd_micro, outcome FROM guide_usage");
  assert.deepEqual({ ...usage }, {
    profile_id: "domestic-cat-adult",
    input_tokens: 100,
    output_tokens: 50,
    cost_usd_micro: expectedCost,
    outcome: "completed"
  });
  const usageColumns = database.all("PRAGMA table_info(guide_usage)").map(({ name }) => name);
  for (const forbidden of ["ip", "email", "prompt", "output", "token"]) {
    assert.equal(usageColumns.includes(forbidden), false);
  }
  const reservationColumns = database.all("PRAGMA table_info(guide_reservations)").map(({ name }) => name);
  for (const forbidden of ["ip", "email", "prompt", "output", "token", "turnstile_token"]) {
    assert.equal(reservationColumns.includes(forbidden), false);
  }
});

test("origin, rate, Turnstile, and budget controls fail without spending", async (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  database.exec("INSERT INTO funding_receipts VALUES('owner-small', 'owner_seed', 100000, unixepoch())");
  const env = baseEnvironment(database);
  const missingOrigin = guideRequest(guideBody(), { origin: "https://example.com" });
  assert.equal((await handleGuide(missingOrigin, env)).status, 403);
  assert.equal((await handleGuide(guideRequest(guideBody(), { "sec-fetch-site": "cross-site" }), env)).status, 403);

  for (const rejectedUrl of [
    "https://www.urdog.dev/api/community/guide",
    "https://urdog.projectbarnlab.workers.dev/api/community/guide",
    "https://preview.urdog.dev/api/community/guide"
  ]) {
    const rejected = new Request(rejectedUrl, {
      method: "POST",
      headers: {
        "cf-connecting-ip": "192.0.2.10",
        "content-type": "application/json",
        origin: new URL(rejectedUrl).origin,
        "sec-fetch-site": "same-origin"
      },
      body: JSON.stringify(guideBody())
    });
    assert.equal((await handleGuide(rejected, env)).status, 403);
  }

  const rateEnv = { ...env, GUIDE_RATE_LIMIT: { async limit() { return { success: false }; } } };
  assert.equal((await handleGuide(guideRequest(), rateEnv)).status, 429);

  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({ success: true, action: "community_guide", hostname: "attacker.example" });
  assert.equal((await handleGuide(guideRequest(), env)).status, 403);
  assert.equal(database.get("SELECT reserved_usd_micro, spent_usd_micro FROM community_budget WHERE id=1").reserved_usd_micro, 0);
  assert.equal(database.get("SELECT COUNT(*) AS count FROM guide_usage").count, 0);

  const emptyDatabase = new D1Mock();
  t.after(() => emptyDatabase.close());
  const emptyEnv = baseEnvironment(emptyDatabase);
  globalThis.fetch = async () => Response.json({ success: true, action: "community_guide", hostname: "urdog.dev" });
  assert.equal((await handleGuide(guideRequest(), emptyEnv)).status, 503);
  assert.equal(emptyDatabase.get("SELECT reserved_usd_micro FROM community_budget WHERE id=1").reserved_usd_micro, 0);
});

test("unknown provider outcomes consume the conservative reservation", async (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  database.exec("INSERT INTO funding_receipts VALUES('owner-small', 'owner_seed', 100000, unixepoch())");
  const env = baseEnvironment(database);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input) => {
    if (String(input).includes("turnstile")) return Response.json({ success: true, action: "community_guide", hostname: "urdog.dev" });
    throw new Error("provider outcome unknown");
  };
  assert.equal((await handleGuide(guideRequest(), env)).status, 503);
  assert.deepEqual({ ...database.get("SELECT reserved_usd_micro, spent_usd_micro FROM community_budget WHERE id=1") }, {
    reserved_usd_micro: 0,
    spent_usd_micro: GUIDE_RESERVATION_USD_MICRO
  });
  assert.equal(database.get("SELECT outcome FROM guide_usage").outcome, "provider_unknown");
});

test("Cerebras 500 and 502 responses consume conservative reservations", async (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  database.exec("INSERT INTO funding_receipts VALUES('owner-small', 'owner_seed', 100000, unixepoch())");
  const env = baseEnvironment(database);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  for (const status of [500, 502]) {
    globalThis.fetch = async (input) => {
      if (String(input).includes("turnstile")) {
        return Response.json({ success: true, action: "community_guide", hostname: "urdog.dev" });
      }
      return new Response(null, { status });
    };
    assert.equal((await handleGuide(guideRequest(), env)).status, 503);
  }

  assert.deepEqual({ ...database.get("SELECT reserved_usd_micro, spent_usd_micro FROM community_budget WHERE id=1") }, {
    reserved_usd_micro: 0,
    spent_usd_micro: GUIDE_RESERVATION_USD_MICRO * 2
  });
  assert.deepEqual(
    database.all("SELECT outcome FROM guide_usage ORDER BY created_at, rowid").map(({ outcome }) => outcome),
    ["provider_unknown", "provider_unknown"]
  );
});

test("model output can select only three unique repository-reviewed question IDs", async (t) => {
  const cases = [
    ["unknown", "unknown", "unknown"],
    [
      GUIDE_QUESTION_BANKS["domestic-cat-adult"][0].id,
      GUIDE_QUESTION_BANKS["domestic-cat-adult"][0].id,
      GUIDE_QUESTION_BANKS["domestic-cat-adult"][1].id
    ],
    GUIDE_QUESTION_BANKS["captive-bred-corn-snake"].slice(0, 3).map(({ id }) => id)
  ];

  for (const questionIds of cases) {
    const database = new D1Mock();
    t.after(() => database.close());
    database.exec("INSERT INTO funding_receipts VALUES('owner-small', 'owner_seed', 100000, unixepoch())");
    const env = baseEnvironment(database);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => String(input).includes("turnstile")
      ? Response.json({ success: true, action: "community_guide", hostname: "urdog.dev" })
      : Response.json({
        choices: [{ message: { content: JSON.stringify({ questionIds }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      });
    assert.equal((await handleGuide(guideRequest(), env)).status, 503);
    assert.equal(database.get("SELECT outcome FROM guide_usage").outcome, "invalid_output");
    globalThis.fetch = originalFetch;
  }
});

test("distributed callers cannot exceed the exact UTC-day call ceiling", async (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  database.exec("INSERT INTO funding_receipts VALUES('owner-seed', 'owner_seed', 10000000, unixepoch())");
  const env = baseEnvironment(database);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input) => String(input).includes("turnstile")
    ? Response.json({ success: true, action: "community_guide", hostname: "urdog.dev" })
    : Response.json({
      choices: [{ message: { content: JSON.stringify({ questionIds: GUIDE_QUESTION_BANKS["domestic-cat-adult"].slice(0, 3).map(({ id }) => id) }) } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 }
    });

  for (let index = 0; index < 250; index += 1) {
    const response = await handleGuide(guideRequest(guideBody(), { "cf-connecting-ip": `198.51.100.${index % 255}` }), env);
    assert.equal(response.status, 200);
  }
  assert.equal((await handleGuide(guideRequest(guideBody(), { "cf-connecting-ip": "203.0.113.250" }), env)).status, 503);
  const window = database.get("SELECT request_count, reserved_usd_micro, spent_usd_micro FROM guide_daily_windows");
  assert.equal(window.request_count, 250);
  assert.equal(window.reserved_usd_micro, 0);
  assert.ok(window.spent_usd_micro <= 100000);
});

test("concurrent reservations cannot overshoot the exact daily spend ceiling", async (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  database.exec("INSERT INTO funding_receipts VALUES('owner-seed', 'owner_seed', 10000000, unixepoch())");
  const env = baseEnvironment(database);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let releaseProvider;
  const providerGate = new Promise((resolve) => { releaseProvider = resolve; });
  globalThis.fetch = async (input) => {
    if (String(input).includes("turnstile")) return Response.json({ success: true, action: "community_guide", hostname: "urdog.dev" });
    await providerGate;
    return Response.json({
      choices: [{ message: { content: JSON.stringify({ questionIds: GUIDE_QUESTION_BANKS["domestic-cat-adult"].slice(0, 3).map(({ id }) => id) }) } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 }
    });
  };
  const pending = Array.from({ length: 60 }, (_, index) => handleGuide(
    guideRequest(guideBody(), { "cf-connecting-ip": `203.0.113.${index + 1}` }),
    env
  ));
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
    if (database.get("SELECT COUNT(*) AS count FROM guide_reservations WHERE state='reserved'").count === 50) break;
  }
  const openWindow = database.get("SELECT request_count, reserved_usd_micro, spent_usd_micro FROM guide_daily_windows");
  assert.equal(openWindow.request_count, 50);
  assert.equal(openWindow.reserved_usd_micro, 100000);
  assert.equal(openWindow.spent_usd_micro, 0);
  releaseProvider();
  const responses = await Promise.all(pending);
  assert.equal(responses.filter(({ status }) => status === 200).length, 50);
  assert.equal(responses.filter(({ status }) => status === 503).length, 10);
  const settledWindow = database.get("SELECT request_count, reserved_usd_micro, spent_usd_micro FROM guide_daily_windows");
  assert.equal(settledWindow.request_count, 50);
  assert.equal(settledWindow.reserved_usd_micro, 0);
  assert.ok(settledWindow.spent_usd_micro <= 100000);
});

test("stale durable reservations settle once as conservative unknown spend", async (t) => {
  const database = new D1Mock();
  t.after(() => database.close());
  database.exec("INSERT INTO funding_receipts VALUES('owner-small', 'owner_seed', 100000, unixepoch())");
  const windowStart = Math.floor(Date.now() / 86_400_000) * 86_400;
  database.database.prepare(`
    INSERT INTO guide_reservations(
      request_id, profile_id, window_start, amount_usd_micro, state, created_at
    ) VALUES('stale-request', 'domestic-cat-adult', ?, ?, 'reserved', 100)
  `).run(windowStart, GUIDE_RESERVATION_USD_MICRO);
  assert.equal(database.get("SELECT reserved_usd_micro FROM community_budget WHERE id=1").reserved_usd_micro, GUIDE_RESERVATION_USD_MICRO);
  const env = baseEnvironment(database);
  assert.equal(await settleStaleGuideReservations(env, 101), 1);
  assert.equal(await settleStaleGuideReservations(env, 101), 0);
  assert.deepEqual({ ...database.get("SELECT reserved_usd_micro, spent_usd_micro FROM community_budget WHERE id=1") }, {
    reserved_usd_micro: 0,
    spent_usd_micro: GUIDE_RESERVATION_USD_MICRO
  });
  assert.deepEqual({ ...database.get("SELECT state, outcome, cost_usd_micro FROM guide_reservations WHERE request_id='stale-request'") }, {
    state: "settled",
    outcome: "provider_unknown",
    cost_usd_micro: GUIDE_RESERVATION_USD_MICRO
  });
  assert.equal(database.get("SELECT COUNT(*) AS count FROM guide_usage WHERE request_id='stale-request'").count, 1);
});
