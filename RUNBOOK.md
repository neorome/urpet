# urpet production runbook

## Target and legacy identifiers

- GitHub: `neorome/urpet`
- Product/package: `urpet`
- Canonical URL: `https://urdog.dev/`
- Alternate host: `https://www.urdog.dev/` (308 to apex)
- Cloudflare Worker: `urdog` (legacy identifier, intentionally retained)
- D1 binding: `COMMUNITY_DB`
- D1 database: `urdog-community` / `4646d0d8-f3e9-43e8-851e-dc81bd90b7e4` (legacy identifier, intentionally retained)
- Rollback unit: an immutable Cloudflare Worker version

The deterministic matcher is complete when community services are unconfigured. The optional guide remains hidden and `/api/community/status` returns `resting` until every configuration and actual-funding gate is satisfied.

## Preflight

```sh
npm ci
npm run build:static
npm run check
git status --short --branch
```

`npm run check` must pass against the exact commit. Generated catalog and credit pages must be current; all 205 dog photo hashes and all ten reviewed profile assets must pass; the Worker dry run must list `COMMUNITY_DB`, `GUIDE_RATE_LIMIT`, `ASSETS`, `TURNSTILE_ACTION`, `TURNSTILE_HOSTNAMES`, and `TURNSTILE_SITE_KEY`.

## Community database

Apply the reviewed migration once per environment, then verify tables and the owner cap:

```sh
npx wrangler d1 migrations apply COMMUNITY_DB --remote
npx wrangler d1 execute COMMUNITY_DB --remote --command \
  "SELECT name FROM sqlite_master WHERE type IN ('table','trigger') ORDER BY name" --json
```

The schema stores no supporter identity, raw note, IP, prompt, or model output. Provider receipts are append-only even through SQLite replacement conflict policies. `owner_seed_ten_dollar_limit` rejects genuinely new owner receipts above $10 total. Exact UTC-day triggers reject more than 250 reservations or $0.10 in committed model spend, and a 15-minute Cron Trigger settles stale reservations conservatively.

## Optional community-guide configuration

Before adding any guide secret or funding receipt, verify that the cost oracle still matches Cerebras's public model endpoint:

```sh
npm run check:guide-pricing
```

Any mismatch is a hard stop: leave the guide `resting`, update the pinned rates and cost tests, and repeat the budget review before enabling it. The current pin is effective 2026-08-12 for `gpt-oss-120b` at $0.35/M input and $0.75/M output tokens. Gemma 4 31B was checked and rejected for this text-only job because its public rates were higher.

Required guide bindings:

- secret `CEREBRAS_API_KEY`;
- public `TURNSTILE_SITE_KEY`;
- secret `TURNSTILE_SECRET`;
- `TURNSTILE_HOSTNAMES=urdog.dev`;
- `TURNSTILE_ACTION=community_guide`;
- rate limiter `GUIDE_RATE_LIMIT`.

Do not place secret values in the repository, shell history, command arguments, logs, or this runbook. Install or rotate them only with explicit current authorization. `scripts/create-turnstile-widget.mjs` safely reuses the exact named widget and installs its secret without printing it; `scripts/install-worker-secret-from-env.mjs` accepts only `CEREBRAS_API_KEY` from a protected environment and pipes it directly to Wrangler.

Do not configure the Buy Me a Coffee webhook while business payout and accounting are unresolved. Public support is general project support and makes no AI-credit, percentage-allocation, or feature promise. The dormant endpoint remains unavailable without `BMC_WEBHOOK_SECRET`, and support tables are excluded from the active guide-budget calculation.

The reserved future endpoint is:

```text
https://urdog.dev/api/community/bmc-webhook
```

Any future activation requires a new product, accounting, privacy, and security review before installing a webhook secret or changing the owner-only guide-budget trigger.

## Funding reconciliation

First run an owner-allowance dry plan:

```sh
npm run community:reconcile -- \
  --receipt-id=<provider-receipt-id> \
  --usd-cents=<whole-cents> \
  --source=owner-seed
```

After verifying the intended owner allowance and Cerebras availability, repeat with `--apply`. D1 rejects a cumulative owner allowance above $10. The script inserts idempotently, then queries the authoritative immutable record and budget. After a timeout or non-JSON response, treat state as unknown and inspect D1 before retrying.

The site spends only from the reconciled owner allowance. Buy Me a Coffee activity never authorizes model use.

## Deploy

```sh
npm run deploy
```

Record the deployed Worker version, exact Git commit, previous known-good Worker version, D1 migration number, and whether the community guide is `ready` or `resting`.

### Production release — 2026-08-13 UTC

- Git source: `1c701a15641d9ec41704e733ada18fdb7c467b88`
- Worker version: `aa96623f-ead5-40fb-8412-16e1a0e26afa` at 100% traffic
- Immediate predecessor: `626e27e2-f676-4da3-85d4-45582785a73e`
- Last commit-labelled rollback: `ab4e67ff-040f-4b8d-8e16-087d028d07c1` (`59427c8`)
- D1 migrations: `0001_community_budget.sql`, `0002_guide_reservations.sql`; no pending migrations
- Community guide at this release: `resting`; Turnstile is installed and the Cerebras credential was added later through KeepKeys, while the owner allowance had not yet been activated
- Live proof: all four public pages and the new profile image returned 200; `www` returned 308 to the apex; an unknown route returned 404 with `X-Robots-Tag: noindex`; the exact community status was `{"guideEnabled":false,"state":"resting"}`
- Browser proof: completed a 320 px cat lead and a prepare-first tortoise path, verified a 3:2 local image with visible attribution, source-linked conflict disclosure, and no horizontal scrolling; the 1280 px lane screen exposed ten grouped text rows with no pre-match photography and no horizontal scrolling

## Production smoke

Use a cache-busting value from the exact deployed commit or Worker version:

```sh
curl --fail --silent --show-error --max-time 20 \
  "https://urdog.dev/?release=<version>" | rg -F "find a pet for the life"

curl --fail --silent --show-error --max-time 20 \
  "https://urdog.dev/dogs/?release=<version>" | rg -F "find a dog who fits ur"

curl --fail --silent --show-error --max-time 20 \
  "https://urdog.dev/breeds/?release=<version>" | rg -F "all 205"

curl --fail --silent --show-error --max-time 20 \
  "https://urdog.dev/photo-credits/?release=<version>" | rg -F "205 credited photos"

curl --silent --show-error --head --max-time 20 \
  "https://www.urdog.dev/?release=<version>"

curl --fail --silent --show-error --max-time 20 \
  "https://urdog.dev/api/community/status?release=<version>"
```

Expected: apex pages return 200; `/dogs` permanently redirects to `/dogs/`; `www` returns 308 with an apex location; sitemap contains `/`, `/dogs/`, `/breeds/`, and `/photo-credits/`; bad routes return 404 with `X-Robots-Tag: noindex`; CSP permits only the reviewed OSM, Cloudflare Analytics, and Turnstile surfaces.

Browser smoke at 1440 px and 320 px:

1. Complete an open all-pets brief and confirm zero to three source-linked leads.
2. Complete a reptile brief with a high-risk household and confirm the CDC conflict appears before benefits.
3. Confirm the guide stays hidden when status is `resting`.
4. Follow the dog lead to `/dogs/`, complete a dog brief, and verify save/share/reset/print.
5. Confirm no map request occurs before a location action; test typed place, denied geolocation, semantic result list, and attribution.
6. Open the Buy Me a Coffee link, confirm the leaving-site dialog, then cancel and continue separately.
7. Use keyboard-only navigation, inspect focus, honor reduced motion, print without support, and verify no horizontal overflow.

If the guide is intentionally enabled, add one managed Turnstile + one successful guide smoke and verify that D1 records only profile ID, token counts, cost, and outcome. Never use an unbounded production loop for this check.

## Rollback

```sh
npx wrangler deployments list
npx wrangler rollback <known-good-version-id>
```

After rollback, rerun public smokes. A Worker rollback does not reverse D1 migrations, support events, or funding receipts. The initial schema is additive; if a future migration changes behavior, its release packet must name a forward-safe recovery plan before deployment.

For a ledger discrepancy, immediately remove or disable the optional guide configuration, leave the deterministic site running, inspect support events, receipts, reservations, spending, and provider usage, then reconcile from authoritative evidence. Never delete payment or receipt history to make totals match.
