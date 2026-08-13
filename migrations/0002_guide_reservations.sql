PRAGMA foreign_keys = ON;

-- Keep reconciliation idempotent for an already-recorded receipt while
-- enforcing the cumulative ceiling before every genuinely new owner receipt.
DROP TRIGGER IF EXISTS owner_seed_ten_dollar_limit;
CREATE TRIGGER owner_seed_ten_dollar_limit
BEFORE INSERT ON funding_receipts
WHEN NEW.source = 'owner_seed'
  AND NOT EXISTS(SELECT 1 FROM funding_receipts WHERE receipt_id = NEW.receipt_id)
  AND COALESCE((SELECT SUM(usd_micro) FROM funding_receipts WHERE source = 'owner_seed'), 0) + NEW.usd_micro > 10000000
BEGIN
  SELECT RAISE(ABORT, 'owner seed exceeds the $10 project ceiling');
END;

-- SQLite's OR REPLACE conflict policy performs an implicit delete that does
-- not reliably invoke DELETE triggers. Ignore every duplicate receipt ID at
-- the insert boundary so REPLACE cannot rewrite append-only evidence.
CREATE TRIGGER IF NOT EXISTS funding_receipts_immutable_duplicate
BEFORE INSERT ON funding_receipts
WHEN EXISTS(SELECT 1 FROM funding_receipts WHERE receipt_id = NEW.receipt_id)
BEGIN
  SELECT RAISE(IGNORE);
END;

-- Provider-funding receipts are append-only evidence. Reconciliation uses an
-- idempotent INSERT OR IGNORE; no operator or compromised route can rewrite a
-- valid owner amount above the project ceiling or silently erase funding.
CREATE TRIGGER IF NOT EXISTS funding_receipts_immutable_update
BEFORE UPDATE ON funding_receipts
BEGIN
  SELECT RAISE(ABORT, 'funding receipts are immutable');
END;

CREATE TRIGGER IF NOT EXISTS funding_receipts_immutable_delete
BEFORE DELETE ON funding_receipts
BEGIN
  SELECT RAISE(ABORT, 'funding receipts are immutable');
END;

-- Exact UTC-day limits complement Turnstile and Cloudflare's intentionally
-- approximate per-location rate limiter. No visitor identifier is stored.
CREATE TABLE IF NOT EXISTS guide_daily_windows (
  window_start INTEGER PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  reserved_usd_micro INTEGER NOT NULL DEFAULT 0 CHECK (reserved_usd_micro >= 0),
  spent_usd_micro INTEGER NOT NULL DEFAULT 0 CHECK (spent_usd_micro >= 0),
  updated_at INTEGER NOT NULL
);

-- One durable identity exists before a provider request can be dispatched.
-- The row contains accounting metadata only: no IP, Turnstile token, prompt,
-- model output, supporter identity, or raw support note.
CREATE TABLE IF NOT EXISTS guide_reservations (
  request_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  window_start INTEGER NOT NULL REFERENCES guide_daily_windows(window_start),
  amount_usd_micro INTEGER NOT NULL CHECK (amount_usd_micro > 0),
  state TEXT NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved', 'settled')),
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd_micro INTEGER,
  outcome TEXT CHECK (outcome IN ('completed', 'invalid_output', 'provider_error', 'provider_unknown')),
  created_at INTEGER NOT NULL,
  settled_at INTEGER,
  CHECK (
    (state = 'reserved' AND cost_usd_micro IS NULL AND outcome IS NULL AND settled_at IS NULL)
    OR
    (state = 'settled' AND cost_usd_micro IS NOT NULL AND outcome IS NOT NULL AND settled_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS guide_reservations_open
ON guide_reservations(state, created_at);

-- 250 successful calls per UTC day is far above expected launch traffic. The
-- separate $0.10 daily accounting ceiling bounds provider-failure and botnet
-- damage even when many source addresses pass Turnstile.
CREATE TRIGGER IF NOT EXISTS guide_reservation_guard
BEFORE INSERT ON guide_reservations
BEGIN
  INSERT OR IGNORE INTO guide_daily_windows(window_start, updated_at)
  VALUES(NEW.window_start, unixepoch());
END;

-- Keep one WHEN expression per guard. Besides producing clearer failures,
-- this avoids nested CASE blocks in Wrangler's D1 SQL statement splitter.
CREATE TRIGGER IF NOT EXISTS guide_reservation_call_limit
BEFORE INSERT ON guide_reservations
WHEN COALESCE((
  SELECT request_count FROM guide_daily_windows WHERE window_start = NEW.window_start
), 0) >= 250
BEGIN
  SELECT RAISE(ABORT, 'daily guide call limit reached');
END;

CREATE TRIGGER IF NOT EXISTS guide_reservation_spend_limit
BEFORE INSERT ON guide_reservations
WHEN COALESCE((
  SELECT reserved_usd_micro + spent_usd_micro
  FROM guide_daily_windows WHERE window_start = NEW.window_start
), 0) + NEW.amount_usd_micro > 100000
BEGIN
  SELECT RAISE(ABORT, 'daily guide spend limit reached');
END;

CREATE TRIGGER IF NOT EXISTS guide_reservation_budget_limit
BEFORE INSERT ON guide_reservations
WHEN (
  COALESCE((SELECT SUM(usd_micro) FROM funding_receipts WHERE source = 'owner_seed'), 0)
  + MIN(
    COALESCE((SELECT SUM(usd_micro) FROM funding_receipts WHERE source = 'support'), 0),
    COALESCE((SELECT SUM(earmarked_usd_micro) FROM support_payments WHERE active = 1), 0)
  )
  - (SELECT reserved_usd_micro + spent_usd_micro FROM community_budget WHERE id = 1)
) < NEW.amount_usd_micro
BEGIN
  SELECT RAISE(ABORT, 'guide budget unavailable');
END;

CREATE TRIGGER IF NOT EXISTS guide_reservation_open
AFTER INSERT ON guide_reservations
BEGIN
  UPDATE guide_daily_windows
  SET request_count = request_count + 1,
      reserved_usd_micro = reserved_usd_micro + NEW.amount_usd_micro,
      updated_at = unixepoch()
  WHERE window_start = NEW.window_start;

  UPDATE community_budget
  SET reserved_usd_micro = reserved_usd_micro + NEW.amount_usd_micro,
      updated_at = unixepoch()
  WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS guide_reservation_settlement_guard
BEFORE UPDATE ON guide_reservations
WHEN OLD.state <> 'reserved'
  OR NEW.state <> 'settled'
  OR NEW.request_id <> OLD.request_id
  OR NEW.profile_id <> OLD.profile_id
  OR NEW.window_start <> OLD.window_start
  OR NEW.amount_usd_micro <> OLD.amount_usd_micro
  OR NEW.created_at <> OLD.created_at
  OR NEW.cost_usd_micro IS NULL
  OR NEW.cost_usd_micro < 0
  OR NEW.cost_usd_micro > OLD.amount_usd_micro
  OR NEW.outcome IS NULL
  OR NEW.settled_at IS NULL
  OR (SELECT reserved_usd_micro FROM community_budget WHERE id = 1) < OLD.amount_usd_micro
  OR (SELECT reserved_usd_micro FROM guide_daily_windows WHERE window_start = OLD.window_start) < OLD.amount_usd_micro
BEGIN
  SELECT RAISE(ABORT, 'invalid guide reservation settlement');
END;

CREATE TRIGGER IF NOT EXISTS guide_reservation_settle
AFTER UPDATE OF state ON guide_reservations
WHEN OLD.state = 'reserved' AND NEW.state = 'settled'
BEGIN
  UPDATE community_budget
  SET reserved_usd_micro = reserved_usd_micro - OLD.amount_usd_micro,
      spent_usd_micro = spent_usd_micro + NEW.cost_usd_micro,
      updated_at = unixepoch()
  WHERE id = 1;

  UPDATE guide_daily_windows
  SET reserved_usd_micro = reserved_usd_micro - OLD.amount_usd_micro,
      spent_usd_micro = spent_usd_micro + NEW.cost_usd_micro,
      updated_at = unixepoch()
  WHERE window_start = OLD.window_start;

  INSERT INTO guide_usage(
    request_id, profile_id, input_tokens, output_tokens,
    cost_usd_micro, outcome, created_at
  ) VALUES(
    NEW.request_id, NEW.profile_id, NEW.input_tokens, NEW.output_tokens,
    NEW.cost_usd_micro, NEW.outcome, NEW.settled_at
  );
END;
