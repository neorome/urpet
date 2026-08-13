PRAGMA foreign_keys = ON;

-- One privacy-minimized row per qualifying or non-qualifying BMC payment.
-- No supporter name, email, raw note, or Stripe transaction ID is stored.
CREATE TABLE IF NOT EXISTS support_payments (
  payment_id TEXT PRIMARY KEY,
  currency TEXT NOT NULL,
  gross_usd_cents INTEGER NOT NULL DEFAULT 0 CHECK (gross_usd_cents >= 0),
  earmarked_usd_micro INTEGER NOT NULL DEFAULT 0 CHECK (earmarked_usd_micro >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_event_id TEXT NOT NULL UNIQUE,
  refunded_event_id TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  refunded_at INTEGER
);

-- Append-only delivery and accounting ledger. Duplicate deliveries are no-ops.
CREATE TABLE IF NOT EXISTS support_events (
  event_id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('donation.created', 'donation.refunded')),
  outcome TEXT NOT NULL CHECK (outcome IN (
    'qualified',
    'not_qualified',
    'refunded',
    'refund_without_create',
    'created_after_refund',
    'duplicate_payment'
  )),
  earmark_delta_usd_micro INTEGER NOT NULL DEFAULT 0,
  received_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS support_events_payment_id ON support_events(payment_id);

-- A receipt means the operator verified that this amount is actually present
-- in Cerebras. BMC earmarks alone never authorize provider spending.
CREATE TABLE IF NOT EXISTS funding_receipts (
  receipt_id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('owner_seed', 'support')),
  usd_micro INTEGER NOT NULL CHECK (usd_micro > 0),
  recorded_at INTEGER NOT NULL
);

CREATE TRIGGER IF NOT EXISTS owner_seed_ten_dollar_limit
BEFORE INSERT ON funding_receipts
WHEN NEW.source = 'owner_seed'
  AND COALESCE((SELECT SUM(usd_micro) FROM funding_receipts WHERE source = 'owner_seed'), 0) + NEW.usd_micro > 10000000
BEGIN
  SELECT RAISE(ABORT, 'owner seed exceeds the $10 project ceiling');
END;

CREATE TABLE IF NOT EXISTS community_budget (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  reserved_usd_micro INTEGER NOT NULL DEFAULT 0 CHECK (reserved_usd_micro >= 0),
  spent_usd_micro INTEGER NOT NULL DEFAULT 0 CHECK (spent_usd_micro >= 0),
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO community_budget(id, updated_at) VALUES(1, unixepoch());

-- Per-call audit without account, IP address, prompt text, or model output.
CREATE TABLE IF NOT EXISTS guide_usage (
  request_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd_micro INTEGER NOT NULL CHECK (cost_usd_micro >= 0),
  outcome TEXT NOT NULL CHECK (outcome IN ('completed', 'invalid_output', 'provider_error', 'provider_unknown')),
  created_at INTEGER NOT NULL
);
