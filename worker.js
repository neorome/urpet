import {
  ANSWER_OPTIONS,
  GUIDE_PROFILE_IDS,
  PET_LANES,
  PET_PROFILES,
  normalizePetAnswers
} from "./public/scripts/all-pets-engine.js";
import { CEREBRAS_PRICING } from "./lib/cerebras-pricing.js";

const GUIDE_ACTION = "community_guide";
const GUIDE_MODEL = CEREBRAS_PRICING.model;
const GUIDE_RESERVATION_USD_MICRO = 2_000;
const MAX_WEBHOOK_BYTES = 256_000;
const MAX_GUIDE_BYTES = 8_192;

const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self' https://cloudflareinsights.com https://nominatim.openstreetmap.org https://challenges.cloudflare.com",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src https://challenges.cloudflare.com",
    "img-src 'self' data: https://tile.openstreetmap.org",
    "object-src 'none'",
    "script-src 'self' https://static.cloudflareinsights.com https://challenges.cloudflare.com",
    "style-src 'self'",
    "upgrade-insecure-requests"
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(self), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff"
};

const guideProfiles = new Map(
  PET_PROFILES
    .filter(({ id }) => GUIDE_PROFILE_IDS.includes(id))
    .map((profile) => [profile.id, profile])
);

const answerIds = new Set([
  ...ANSWER_OPTIONS.mode.map((id) => `mode-${id}`),
  ...PET_LANES.map(({ id }) => `lane-${id}`),
  ...ANSWER_OPTIONS.time.map((id) => `time-${id}`),
  ...ANSWER_OPTIONS.space.map((id) => `space-${id}`),
  ...ANSWER_OPTIONS.rhythm.map((id) => `rhythm-${id}`),
  ...ANSWER_OPTIONS.care.map((id) => `care-${id}`),
  ...ANSWER_OPTIONS.household.map((id) => `household-${id}`),
  ...ANSWER_OPTIONS.vet.map((id) => `vet-${id}`),
  ...ANSWER_OPTIONS.horizon.map((id) => `horizon-${id}`)
]);

function json(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  });
}

function canonicalRedirect(url) {
  const canonical = new URL(url);
  canonical.protocol = "https:";
  canonical.hostname = "urdog.dev";
  canonical.port = "";

  if (canonical.pathname.endsWith("/index.html")) {
    canonical.pathname = canonical.pathname.slice(0, -"index.html".length);
  }

  if (["/breeds", "/dogs", "/photo-credits"].includes(canonical.pathname)) {
    canonical.pathname += "/";
  }

  return Response.redirect(canonical.toString(), 308);
}

function withHeaders(response, pathname) {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  const contentType = headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  } else if (/\.(?:css|js|json|svg|png|webp|webmanifest)$/.test(pathname)) {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  } else if (pathname.endsWith("/robots.txt") || pathname.endsWith("/sitemap.xml")) {
    headers.set("Cache-Control", "public, max-age=3600");
  }

  if (response.status === 404) headers.set("X-Robots-Tag", "noindex");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function normalizeSupportNote(note = "") {
  return String(note)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, "");
}

export function qualifyingSupportNote(note) {
  const normalized = normalizeSupportNote(note);
  return normalized.includes("urpet") || normalized.includes("urdog");
}

export function parseUsdCents(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  const match = /^(0|[1-9]\d{0,8})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new TextEncoder().encode(String(value));
}

export async function verifyBmcSignature(rawBody, signature, secret) {
  if (!secret || !/^(?:sha256=)?[a-f\d]{64}$/i.test(String(signature || ""))) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, toBytes(rawBody)));
  const supplied = String(signature).toLowerCase().replace(/^sha256=/, "");
  let mismatch = 0;
  for (let index = 0; index < digest.length; index += 1) {
    mismatch |= digest[index] ^ Number.parseInt(supplied.slice(index * 2, index * 2 + 2), 16);
  }
  return mismatch === 0;
}

function safeIdentifier(value, maxLength = 128) {
  const normalized = String(value || "");
  return normalized && normalized.length <= maxLength && /^[A-Za-z0-9._:-]+$/.test(normalized)
    ? normalized
    : null;
}

async function readBodyBytes(request, maximum) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maximum) return null;
  const bytes = new Uint8Array(await request.arrayBuffer());
  return bytes.byteLength <= maximum ? bytes : null;
}

async function recordCreatedDonation(env, eventId, paymentId, data) {
  const currency = String(data.currency || "").toUpperCase();
  const grossCents = parseUsdCents(data.total_amount_charged);
  const explicitlyNotRefunded = data.refunded === false || data.refunded === "false";
  const qualifies = data.status === "succeeded"
    && explicitlyNotRefunded
    && currency === "USD"
    && grossCents !== null
    && qualifyingSupportNote(data.support_note);
  const earmark = qualifies ? grossCents * 7_500 : 0;
  const insertPayment = env.COMMUNITY_DB.prepare(`
    INSERT OR IGNORE INTO support_payments(
      payment_id, currency, gross_usd_cents, earmarked_usd_micro, active,
      created_event_id, created_at
    )
    SELECT ?, ?, ?, ?,
      CASE WHEN EXISTS(
        SELECT 1 FROM support_events
        WHERE payment_id = ? AND event_type = 'donation.refunded'
      ) THEN 0 ELSE 1 END,
      ?, unixepoch()
  `).bind(paymentId, currency || "UNKNOWN", grossCents || 0, earmark, paymentId, eventId);
  const insertEvent = env.COMMUNITY_DB.prepare(`
    INSERT OR IGNORE INTO support_events(
      event_id, payment_id, event_type, outcome, earmark_delta_usd_micro, received_at
    )
    SELECT ?, ?, 'donation.created',
      CASE
        WHEN created_event_id <> ? THEN 'duplicate_payment'
        WHEN active = 0 THEN 'created_after_refund'
        WHEN earmarked_usd_micro > 0 THEN 'qualified'
        ELSE 'not_qualified'
      END,
      CASE WHEN created_event_id = ? AND active = 1 THEN earmarked_usd_micro ELSE 0 END,
      unixepoch()
    FROM support_payments WHERE payment_id = ?
  `).bind(eventId, paymentId, eventId, eventId, paymentId);
  await env.COMMUNITY_DB.batch([insertPayment, insertEvent]);
}

async function recordRefundedDonation(env, eventId, paymentId) {
  const deactivate = env.COMMUNITY_DB.prepare(`
    UPDATE support_payments
    SET active = 0, refunded_event_id = ?, refunded_at = unixepoch()
    WHERE payment_id = ? AND active = 1 AND refunded_event_id IS NULL
  `).bind(eventId, paymentId);
  const insertEvent = env.COMMUNITY_DB.prepare(`
    INSERT OR IGNORE INTO support_events(
      event_id, payment_id, event_type, outcome, earmark_delta_usd_micro, received_at
    )
    VALUES(
      ?, ?, 'donation.refunded',
      CASE
        WHEN NOT EXISTS(SELECT 1 FROM support_payments WHERE payment_id = ?) THEN 'refund_without_create'
        WHEN EXISTS(
          SELECT 1 FROM support_payments
          WHERE payment_id = ? AND refunded_event_id = ?
        ) THEN 'refunded'
        ELSE 'duplicate_payment'
      END,
      COALESCE((
        SELECT -earmarked_usd_micro FROM support_payments
        WHERE payment_id = ? AND refunded_event_id = ?
      ), 0),
      unixepoch()
    )
  `).bind(eventId, paymentId, paymentId, paymentId, eventId, paymentId, eventId);
  await env.COMMUNITY_DB.batch([deactivate, insertEvent]);
}

export async function handleWebhook(request, env) {
  if (request.method !== "POST") {
    return json({ error: "method not allowed" }, { status: 405, headers: { allow: "POST" } });
  }
  if (!env.BMC_WEBHOOK_SECRET) return json({ error: "not configured" }, { status: 404 });

  const rawBody = await readBodyBytes(request, MAX_WEBHOOK_BYTES);
  if (!rawBody) return json({ error: "request too large" }, { status: 413 });
  const signature = request.headers.get("x-signature-sha256");
  if (!(await verifyBmcSignature(rawBody, signature, env.BMC_WEBHOOK_SECRET))) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return json({ ok: true, ignored: true });
  }

  if (!["donation.created", "donation.refunded"].includes(event?.type) || event.live_mode !== true) {
    return json({ ok: true, ignored: true });
  }
  if (!env.COMMUNITY_DB) return json({ error: "ledger unavailable" }, { status: 503 });

  const eventId = safeIdentifier(event.event_id);
  const paymentId = safeIdentifier(event.data?.id);
  if (!eventId || !paymentId || !event.data || typeof event.data !== "object") {
    return json({ ok: true, ignored: true });
  }

  if (event.type === "donation.created") {
    await recordCreatedDonation(env, eventId, paymentId, event.data);
  } else {
    await recordRefundedDonation(env, eventId, paymentId);
  }
  return json({ ok: true });
}

const AVAILABLE_BUDGET_EXPRESSION = `
  COALESCE((SELECT SUM(usd_micro) FROM funding_receipts WHERE source = 'owner_seed'), 0)
  + MIN(
    COALESCE((SELECT SUM(usd_micro) FROM funding_receipts WHERE source = 'support'), 0),
    COALESCE((SELECT SUM(earmarked_usd_micro) FROM support_payments WHERE active = 1), 0)
  )
  - reserved_usd_micro
  - spent_usd_micro
`;

const AVAILABLE_BUDGET_SQL = `
  SELECT (${AVAILABLE_BUDGET_EXPRESSION}) AS available_usd_micro
  FROM community_budget WHERE id = 1
`;

function configurationReady(env) {
  return Boolean(
    env.CEREBRAS_API_KEY
    && env.COMMUNITY_DB
    && env.GUIDE_RATE_LIMIT?.limit
    && env.TURNSTILE_SITE_KEY
    && env.TURNSTILE_SECRET
    && env.TURNSTILE_HOSTNAMES
  );
}

export async function handleStatus(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "method not allowed" }, { status: 405, headers: { allow: "GET, HEAD" } });
  }
  let guideEnabled = false;
  if (configurationReady(env)) {
    try {
      const budget = await env.COMMUNITY_DB.prepare(AVAILABLE_BUDGET_SQL).first();
      guideEnabled = Number(budget?.available_usd_micro || 0) >= GUIDE_RESERVATION_USD_MICRO;
    } catch {
      guideEnabled = false;
    }
  }
  const body = {
    guideEnabled,
    state: guideEnabled ? "ready" : "resting"
  };
  if (guideEnabled) {
    body.turnstileSiteKey = env.TURNSTILE_SITE_KEY;
    body.turnstileAction = env.TURNSTILE_ACTION || GUIDE_ACTION;
  }
  return json(body);
}

function takeSingle(ids, prefix) {
  const matches = ids.filter((id) => id.startsWith(`${prefix}-`));
  return matches.length === 1 ? matches[0].slice(prefix.length + 1) : null;
}

export function validateGuideInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const keys = Object.keys(input).sort();
  if (keys.join(",") !== "answerIds,profileId,turnstileToken") return null;
  if (!guideProfiles.has(input.profileId)) return null;
  if (typeof input.turnstileToken !== "string" || input.turnstileToken.length < 1 || input.turnstileToken.length > 2_048) return null;
  if (!Array.isArray(input.answerIds) || input.answerIds.length < 7 || input.answerIds.length > 12) return null;
  if (new Set(input.answerIds).size !== input.answerIds.length) return null;
  if (input.answerIds.some((id) => typeof id !== "string" || !answerIds.has(id))) return null;

  const decoded = {
    mode: takeSingle(input.answerIds, "mode"),
    lanes: input.answerIds.filter((id) => id.startsWith("lane-")).map((id) => id.slice(5)),
    time: takeSingle(input.answerIds, "time"),
    space: takeSingle(input.answerIds, "space"),
    rhythm: takeSingle(input.answerIds, "rhythm"),
    care: input.answerIds.filter((id) => id.startsWith("care-")).map((id) => id.slice(5)),
    household: takeSingle(input.answerIds, "household"),
    vet: takeSingle(input.answerIds, "vet"),
    horizon: takeSingle(input.answerIds, "horizon")
  };
  const answers = normalizePetAnswers(decoded);
  if (!answers) return null;
  const profile = guideProfiles.get(input.profileId);
  if (answers.lanes.length && !answers.lanes.includes(profile.laneId)) return null;
  return { profile, answers, answerIds: [...input.answerIds], turnstileToken: input.turnstileToken };
}

function configuredHostnames(env) {
  return new Set(String(env.TURNSTILE_HOSTNAMES || "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean));
}

async function verifyTurnstile(token, env) {
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token })
  });
  if (!response.ok) return false;
  const result = await response.json();
  const action = env.TURNSTILE_ACTION || GUIDE_ACTION;
  return result.success === true
    && result.action === action
    && configuredHostnames(env).has(String(result.hostname || "").toLowerCase());
}

export function calculateCerebrasCostMicro(inputTokens, outputTokens) {
  const input = Number(inputTokens);
  const output = Number(outputTokens);
  if (!Number.isSafeInteger(input) || input < 0 || !Number.isSafeInteger(output) || output < 0) return null;
  return Math.ceil((
    (input * CEREBRAS_PRICING.inputMicroUsdHundredthsPerToken)
    + (output * CEREBRAS_PRICING.outputMicroUsdHundredthsPerToken)
  ) / 100);
}

function requestId() {
  return crypto.randomUUID();
}

async function reserveBudget(env) {
  const statement = env.COMMUNITY_DB.prepare(`
    UPDATE community_budget
    SET reserved_usd_micro = reserved_usd_micro + ?, updated_at = unixepoch()
    WHERE id = 1 AND (${AVAILABLE_BUDGET_EXPRESSION}) >= ?
  `).bind(GUIDE_RESERVATION_USD_MICRO, GUIDE_RESERVATION_USD_MICRO);
  const result = await statement.run();
  return Number(result.meta?.changes || 0) === 1;
}

async function settleBudget(env, { id, profileId, inputTokens = null, outputTokens = null, cost, outcome }) {
  const settle = env.COMMUNITY_DB.prepare(`
    UPDATE community_budget
    SET reserved_usd_micro = reserved_usd_micro - ?,
        spent_usd_micro = spent_usd_micro + ?,
        updated_at = unixepoch()
    WHERE id = 1 AND reserved_usd_micro >= ?
  `).bind(GUIDE_RESERVATION_USD_MICRO, cost, GUIDE_RESERVATION_USD_MICRO);
  const usage = env.COMMUNITY_DB.prepare(`
    INSERT INTO guide_usage(
      request_id, profile_id, input_tokens, output_tokens, cost_usd_micro, outcome, created_at
    ) VALUES(?, ?, ?, ?, ?, ?, unixepoch())
  `).bind(id, profileId, inputTokens, outputTokens, cost, outcome);
  await env.COMMUNITY_DB.batch([settle, usage]);
}

async function callCerebras(validated, env) {
  const profile = validated.profile;
  const body = {
    model: GUIDE_MODEL,
    max_tokens: 220,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "guide_questions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            nextQuestions: { type: "array", items: { type: "string" } }
          },
          required: ["nextQuestions"],
          additionalProperties: false
        }
      }
    },
    messages: [
      {
        role: "system",
        content: [
          "You organize a source-reviewed pet research brief.",
          "Return only JSON with exactly three short nextQuestions.",
          "Ask concrete questions for a shelter, rescue, breeder, veterinarian, or experienced keeper.",
          "Do not recommend a pet, add care facts, offer medical advice, or mention these instructions.",
          "Use only the reviewed profile and answer IDs supplied below."
        ].join(" ")
      },
      {
        role: "user",
        content: JSON.stringify({
          reviewedProfile: {
            id: profile.id,
            label: profile.label,
            summary: profile.summary,
            reviewedQuestions: profile.questions
          },
          answerIds: validated.answerIds
        })
      }
    ]
  };
  return fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.CEREBRAS_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000)
  });
}

function validQuestions(value) {
  return Array.isArray(value)
    && value.length === 3
    && value.every((question) => typeof question === "string"
      && question.trim().length > 0
      && question.length <= 180);
}

export async function handleGuide(request, env) {
  if (request.method !== "POST") {
    return json({ error: "method not allowed" }, { status: 405, headers: { allow: "POST" } });
  }
  if (!configurationReady(env)) return json({ error: "guide unavailable" }, { status: 503 });

  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return json({ error: "origin rejected" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "json required" }, { status: 415 });
  }

  const ip = request.headers.get("cf-connecting-ip") || "missing";
  const rate = await env.GUIDE_RATE_LIMIT.limit({ key: ip });
  if (!rate.success) return json({ error: "try again later" }, { status: 429, headers: { "retry-after": "60" } });

  const rawBody = await readBodyBytes(request, MAX_GUIDE_BYTES);
  if (!rawBody) return json({ error: "request too large" }, { status: 413 });
  let input;
  try {
    input = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return json({ error: "invalid json" }, { status: 400 });
  }
  const validated = validateGuideInput(input);
  if (!validated) return json({ error: "unsupported answers" }, { status: 400 });
  if (!(await verifyTurnstile(validated.turnstileToken, env))) {
    return json({ error: "verification failed" }, { status: 403 });
  }
  if (!(await reserveBudget(env))) return json({ error: "guide budget unavailable" }, { status: 503 });

  const id = requestId();
  let response;
  try {
    response = await callCerebras(validated, env);
  } catch {
    await settleBudget(env, {
      id,
      profileId: validated.profile.id,
      cost: GUIDE_RESERVATION_USD_MICRO,
      outcome: "provider_unknown"
    });
    return json({ error: "guide unavailable" }, { status: 503 });
  }

  if (!response.ok) {
    const providerOutcomeUnknown = response.status >= 500;
    await settleBudget(env, {
      id,
      profileId: validated.profile.id,
      cost: providerOutcomeUnknown ? GUIDE_RESERVATION_USD_MICRO : 0,
      outcome: providerOutcomeUnknown ? "provider_unknown" : "provider_error"
    });
    return json({ error: "guide unavailable" }, { status: 503 });
  }

  let data;
  try {
    data = await response.json();
  } catch {
    await settleBudget(env, {
      id,
      profileId: validated.profile.id,
      cost: GUIDE_RESERVATION_USD_MICRO,
      outcome: "provider_unknown"
    });
    return json({ error: "guide unavailable" }, { status: 503 });
  }

  const inputTokens = data.usage?.prompt_tokens;
  const outputTokens = data.usage?.completion_tokens;
  const actualCost = calculateCerebrasCostMicro(inputTokens, outputTokens);
  const cost = actualCost === null ? GUIDE_RESERVATION_USD_MICRO : actualCost;
  let parsed;
  try {
    parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  } catch {
    parsed = null;
  }
  const questions = parsed?.nextQuestions;
  const outcome = validQuestions(questions) ? "completed" : "invalid_output";
  await settleBudget(env, {
    id,
    profileId: validated.profile.id,
    inputTokens: Number.isSafeInteger(inputTokens) ? inputTokens : null,
    outputTokens: Number.isSafeInteger(outputTokens) ? outputTokens : null,
    cost,
    outcome
  });

  if (outcome !== "completed") return json({ error: "guide unavailable" }, { status: 503 });
  return json({ nextQuestions: questions.map((question) => question.trim()) });
}

export function getGuideReservationUsdMicro() {
  return GUIDE_RESERVATION_USD_MICRO;
}

export function getSecurityHeaders() {
  return { ...SECURITY_HEADERS };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/community/bmc-webhook") return handleWebhook(request, env);
    if (url.pathname === "/api/community/status") return handleStatus(request, env);
    if (url.pathname === "/api/community/guide") return handleGuide(request, env);

    if (
      url.hostname === "www.urdog.dev"
      || url.pathname.endsWith("/index.html")
      || ["/breeds", "/dogs", "/photo-credits"].includes(url.pathname)
    ) {
      return canonicalRedirect(url);
    }

    const response = await env.ASSETS.fetch(request);
    return withHeaders(response, url.pathname);
  }
};

export {
  canonicalRedirect,
  withHeaders
};
