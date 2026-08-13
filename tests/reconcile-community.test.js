import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReconciliationSql,
  parseArguments,
  verifyReconciliationOutput
} from "../scripts/reconcile-community.mjs";

test("reconciliation defaults to a non-mutating support dry run", () => {
  assert.deepEqual(parseArguments(["--receipt-id=bmc_2026-08-12", "--usd-cents=750"]), {
    apply: false,
    receiptId: "bmc_2026-08-12",
    source: "support",
    usdCents: 750,
    usdMicro: 7_500_000
  });
});

test("owner funding is explicit and arguments cannot inject SQL or overflow", () => {
  const parsed = parseArguments(["--receipt-id=owner.1", "--usd-cents=1000", "--source=owner-seed", "--apply"]);
  assert.equal(parsed.source, "owner_seed");
  assert.equal(parsed.apply, true);
  assert.equal(parsed.usdMicro, 10_000_000);
  assert.throws(() => parseArguments(["--receipt-id=x';DROP TABLE funding_receipts;--", "--usd-cents=1"]), /receipt-id/);
  assert.throws(() => parseArguments(["--receipt-id=x", "--usd-cents=1.5"]), /whole number/);
  assert.throws(() => parseArguments(["--receipt-id=x", "--usd-cents=1", "--source=gift"]), /support or owner-seed/);
  assert.throws(() => parseArguments(["--receipt-id=x", "--usd-cents=1", "--wat=yes"]), /Unsupported/);
});

test("the apply SQL is idempotent and reads authoritative receipt and budget state", () => {
  const sql = buildReconciliationSql({ receiptId: "receipt-1", source: "support", usdMicro: 500_000 });
  assert.match(sql, /INSERT OR IGNORE INTO funding_receipts/);
  assert.match(sql, /WHERE receipt_id = 'receipt-1'/);
  assert.match(sql, /MIN\(/);
  assert.match(sql, /support_payments WHERE active = 1/);
});

test("verification rejects an absent or conflicting immutable receipt", () => {
  const expected = { receiptId: "receipt-1", source: "support", usdMicro: 500_000 };
  assert.throws(() => verifyReconciliationOutput(JSON.stringify([{ results: [] }]), expected), /did not return/);
  assert.throws(() => verifyReconciliationOutput(JSON.stringify([{ results: [{ receipt_id: "receipt-1", source: "owner_seed", usd_micro: 500_000 }] }]), expected), /different immutable values/);
  assert.deepEqual(
    verifyReconciliationOutput(JSON.stringify([{ results: [{ receipt_id: "receipt-1", source: "support", usd_micro: 500_000 }] }]), expected).receipt,
    { receipt_id: "receipt-1", source: "support", usd_micro: 500_000 }
  );
});
