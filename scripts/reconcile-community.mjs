#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = resolve(projectRoot, "node_modules/wrangler/bin/wrangler.js");

export function parseArguments(argv) {
  const allowed = new Set(["--apply"]);
  const values = new Map();
  for (const argument of argv) {
    if (argument === "--apply") continue;
    const match = /^--(receipt-id|usd-cents|source)=(.+)$/.exec(argument);
    if (!match || values.has(match[1])) throw new Error(`Unsupported or repeated argument: ${argument}`);
    values.set(match[1], match[2]);
  }
  for (const argument of argv.filter((value) => value.startsWith("--") && !value.includes("="))) {
    if (!allowed.has(argument)) throw new Error(`Unsupported argument: ${argument}`);
  }

  const receiptId = values.get("receipt-id");
  if (!receiptId || receiptId.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(receiptId)) {
    throw new Error("--receipt-id must use 1–128 letters, digits, dots, underscores, colons, or hyphens");
  }
  const centsText = values.get("usd-cents");
  if (!centsText || !/^[1-9]\d*$/.test(centsText)) throw new Error("--usd-cents must be a positive whole number");
  const usdCents = Number(centsText);
  if (!Number.isSafeInteger(usdCents) || usdCents > 900_000_000) throw new Error("--usd-cents is outside the supported range");

  const requestedSource = values.get("source") || "support";
  if (!["support", "owner-seed"].includes(requestedSource)) {
    throw new Error("--source must be support or owner-seed");
  }

  return {
    apply: argv.includes("--apply"),
    receiptId,
    source: requestedSource === "owner-seed" ? "owner_seed" : "support",
    usdCents,
    usdMicro: usdCents * 10_000
  };
}

export function buildReconciliationSql({ receiptId, source, usdMicro }) {
  return [
    `INSERT OR IGNORE INTO funding_receipts(receipt_id, source, usd_micro, recorded_at) VALUES('${receiptId}', '${source}', ${usdMicro}, unixepoch())`,
    `SELECT receipt_id, source, usd_micro FROM funding_receipts WHERE receipt_id = '${receiptId}'`,
    "SELECT source, COALESCE(SUM(usd_micro), 0) AS funded_usd_micro FROM funding_receipts GROUP BY source ORDER BY source",
    `SELECT
      COALESCE((SELECT SUM(usd_micro) FROM funding_receipts WHERE source = 'owner_seed'), 0)
      + MIN(
        COALESCE((SELECT SUM(usd_micro) FROM funding_receipts WHERE source = 'support'), 0),
        COALESCE((SELECT SUM(earmarked_usd_micro) FROM support_payments WHERE active = 1), 0)
      )
      - reserved_usd_micro - spent_usd_micro AS available_usd_micro
      FROM community_budget WHERE id = 1`
  ].map((statement) => `${statement};`).join("\n");
}

function runWrangler(sql) {
  return spawnSync(process.execPath, [
    wranglerBin,
    "d1",
    "execute",
    "COMMUNITY_DB",
    "--remote",
    "--command",
    sql,
    "--json"
  ], {
    cwd: projectRoot,
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function flattenRows(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => Array.isArray(entry?.results) ? entry.results : []);
}

export function verifyReconciliationOutput(stdout, expected) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("Wrangler returned non-JSON output; receipt state is unknown and was not retried");
  }
  const receipt = flattenRows(parsed).find((row) => row.receipt_id === expected.receiptId);
  if (!receipt) throw new Error("The authoritative query did not return the requested receipt; state is unknown");
  if (receipt.source !== expected.source || Number(receipt.usd_micro) !== expected.usdMicro) {
    throw new Error("A receipt with that ID already exists with different immutable values");
  }
  return { receipt, statements: parsed };
}

export function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    console.error(error.message);
    console.error("Usage: npm run community:reconcile -- --receipt-id=<id> --usd-cents=<integer> [--source=support|owner-seed] [--apply]");
    return 2;
  }

  const plan = {
    mode: options.apply ? "apply" : "dry-run",
    receiptId: options.receiptId,
    source: options.source,
    usdCents: options.usdCents,
    guardrail: options.source === "owner_seed"
      ? "The database rejects cumulative owner funding above $10."
      : "Support receipts authorize at most the lesser of funded credit and active 75% BMC earmarks."
  };
  console.log(JSON.stringify(plan, null, 2));
  if (!options.apply) return 0;

  const result = runWrangler(buildReconciliationSql(options));
  if (result.status !== 0) {
    if (result.stderr) console.error(result.stderr.trim());
    console.error("Remote receipt state is unknown. Inspect D1 before retrying.");
    return result.status || 1;
  }

  try {
    const verified = verifyReconciliationOutput(result.stdout, options);
    console.log(JSON.stringify({ verified: true, receipt: verified.receipt }, null, 2));
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

const isDirectRun = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectRun) process.exitCode = main();
