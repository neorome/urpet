-- Buy Me a Coffee remains general project support while its business payout
-- and accounting treatment are unresolved. Support events and receipts must
-- not authorize Cerebras usage, even if the dormant webhook is configured.
DROP TRIGGER IF EXISTS guide_reservation_budget_limit;

CREATE TRIGGER guide_reservation_budget_limit
BEFORE INSERT ON guide_reservations
WHEN (
  COALESCE((SELECT SUM(usd_micro) FROM funding_receipts WHERE source = 'owner_seed'), 0)
  - (SELECT reserved_usd_micro + spent_usd_micro FROM community_budget WHERE id = 1)
) < NEW.amount_usd_micro
BEGIN
  SELECT RAISE(ABORT, 'guide budget unavailable');
END;
