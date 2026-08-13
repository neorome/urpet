# urpet

urpet is a calm, source-linked pet research matcher served at [urdog.dev](https://urdog.dev). It starts with the care and environment a person can actually provide, then returns up to three specific profiles to research—or a prepare-first brief when a hard welfare requirement is missing.

The product covers ten launch lanes: dogs, cats, freshwater aquariums, companion birds, rabbits, guinea pigs, hamsters, turtles and tortoises, geckos, and snakes. The dog lane continues into the original 205-breed matcher at `/dogs/`. Every other lane names the exact reviewed species or household profile; a lane never implies that every animal inside it has the same needs.

## Product boundaries

- The deterministic matcher is anonymous, unlimited, and runs in the browser.
- Results are research leads, not predictions, diagnoses, or endorsements.
- Hard habitat, food, household-health, veterinary, space, and lifetime conflicts appear before benefits.
- There is no account, Stripe checkout, paywall, or visible chatbot.
- Buy Me a Coffee is the only support link and appears after useful results.
- A support note containing `urpet` or the legacy name `urdog` earmarks 75% for Cerebras credits and 25% for payment fees and site upkeep.
- Buy Me a Coffee cannot purchase Cerebras credit automatically. A signed webhook records the earmark; a separate operator receipt records credit actually funded at Cerebras. Shared guide usage is allowed only up to the lesser of those two amounts.
- The optional one-shot community guide lets the model choose three IDs from a repository-reviewed question bank; model prose never reaches the page. If it is unconfigured, unfunded, rate-limited, or unavailable, the complete deterministic brief continues to work.

The project owner may seed at most $10 total. D1 enforces the lifetime ceiling, append-only receipts, a 250-call UTC-day limit, and a $0.10 daily committed-spend ceiling.

## Local development

```sh
npm ci
npm run build:static
npm run dev
```

The Cloudflare identifiers `urdog`, `urdog-community`, and the public host `urdog.dev` are intentionally retained as stable deployment infrastructure. The product, package, and GitHub repository are named `urpet`.

## Quality gates

```sh
npm run check
```

The gate runs deterministic pet and dog scenarios, signed-payment/refund and shared-budget tests, privacy and abuse controls, reconciliation tests, generated-page checks, SEO/accessibility structure, all 205 photo licenses and hashes, and a Cloudflare deployment dry run.

Focused commands:

```sh
npm test
npm run verify
npm run check:generated
npm run community:reconcile -- --receipt-id=<provider-receipt> --usd-cents=<amount>
```

Reconciliation is a dry run unless `--apply` is supplied. Record a receipt only after independently verifying that the corresponding credit is actually present at Cerebras. No secret belongs in a command argument.

## Data and evidence

The all-pets profiles link to reviewed RSPCA welfare guidance and a CDC reptile-health gate. The dog registry boundary comes from official AKC recognition and group rosters. Dog fit bands are conservative urpet editorial signals, not copied AKC prose or clinical measurements.

The checked-in `public/data/breed-photos.json` manifest is the production authority for dog photos. Each of the 205 local WebPs has a Commons source, license, creator credit, visual decision, modification note, and verified SHA-256. The ten reviewed non-dog profiles likewise use exact local Commons photos with visible creator and license links, shown only after matching so appearance cannot steer the intake. The build fails instead of showing an unreviewed placeholder.

See [DESIGN.md](./DESIGN.md) for the accepted product and evidence contract, [RUNBOOK.md](./RUNBOOK.md) for operations and rollback, and [docs/urpet-prd.html](./docs/urpet-prd.html) for the implementation-ready PRD and responsive mockups.
