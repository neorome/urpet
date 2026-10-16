# urpet

Source-linked pet research matcher for people choosing a pet (ten lanes, plus the 205-breed dog matcher at `/dogs/`), served at https://urdog.dev by the Cloudflare Worker `urdog`.

## Run and check

- Install: `npm ci && npm run build:static`
- Check (must pass before commit; it can fail): `npm run check` (node tests, generated-page drift, migration split, photo license/hash verify, `wrangler deploy --dry-run`).
- Live proof for visible changes: `npm run dev`, then walk the browser smoke in `RUNBOOK.md` (1440 px and 320 px, keyboard-only, offline after first visit); else report "untested live".
- Deploy: `npm run deploy` (`wrangler deploy`) -> https://urdog.dev; read it back with the `RUNBOOK.md` production smoke (`curl` with `?release=<version>`). Roll back with `npx wrangler rollback <version-id>`.
- D1 migrations: `npx wrangler d1 migrations apply COMMUNITY_DB --remote`, once per reviewed migration.

## Layout

- `worker.js`: Worker entry (assets, community guide API, cron settlement).
- `public/`: static site, PWA (`sw.js`), generated `breeds/` and `photo-credits/` pages, `data/`.
- `scripts/`: catalog and credit builders, verifiers, reconciliation, secret installers.
- `lib/`: Cerebras pricing oracle.
- `migrations/`: D1 schema for `urdog-community`.
- `data/`: photo review and backfill ledgers.
- `tests/`: `node --test` suites.

## Hard limits

- Never commit secrets, real user data or machine-specific addresses; fixtures are synthetic.
- Never put a secret in a command argument, log or doc; install them only through `scripts/install-worker-secret-from-env.mjs` or `scripts/create-turnstile-widget.mjs` with explicit approval.
- Edit sources, not generated pages; run `npm run build:static` so `check:generated` stays green.
- Never show an unreviewed photo; every dog photo needs a Commons source, license, credit and SHA-256 in `public/data/breed-photos.json`.
- Keep the Cloudflare names `urdog`, `urdog-community` and host `urdog.dev`; they are stable infrastructure.
- Don't configure the Buy Me a Coffee webhook or raise the owner guide budget; both need a new review (`RUNBOOK.md`).
- Never delete payment, receipt or reservation history; `community:reconcile` stays a dry run unless a receipt was verified at Cerebras.
- One writer per file; preserve unrelated changes.

## References

- `DESIGN.md` for the product and evidence contract.
- `RUNBOOK.md` for preflight, D1, guide config, smoke tests and rollback.
- `docs/urpet-prd.html` for the PRD and responsive mockups.
