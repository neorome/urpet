# ur dog

A lifestyle matcher for all 205 AKC-recognized dog breeds.

Nine ordinary-life questions produce three research leads, visible tradeoffs, a care-plan readiness call, and a printable checklist for the people who know the actual dog. The result is decision support—not a “perfect breed” claim.

## What ships

- complete 205-breed matcher catalog;
- searchable, crawlable /breeds/ index;
- compact answer recap and side-by-side limit-versus-goal comparison;
- save-on-device, share, reset, and print / PDF Dog Fit Brief;
- an in-site shelter map and accessible results list, enabled only after a location choice, plus Petfinder listings;
- equal puppy and adult-rescue paths;
- 205 reviewed Wikimedia Commons photos with per-file attribution—one for every breed;
- a branded departure dialog before standard outbound-link navigation;
- optional Buy Me a Coffee support after value is delivered;
- static Cloudflare Worker deployment with no database, account, paid API, or location storage. OpenStreetMap services receive a typed place or rounded coordinates only after an explicit search action.

## Local development

~~~sh
npm ci
npm run build:static
npm run dev
~~~

## Quality gates

~~~sh
npm run check
~~~

The gate runs matcher, catalog, illustration, and Worker tests; checks generated pages; validates SEO, accessibility structure, photo licenses and file hashes; and produces a Cloudflare deployment dry run.

Useful focused commands:

~~~sh
npm test
npm run verify
npm run check:generated
~~~

## Data and photos

The registry boundary comes from the official AKC recognition and group rosters. Fit bands are conservative ur dog editorial signals, not copied AKC prose or scores.

scripts/photo-candidates.mjs establishes the first Wikidata candidate set; scripts/photo-backfill-candidates.mjs expands unresolved breeds through reviewed Commons categories and exact-name searches. The checked-in public/data/breed-photos.json manifest—not a live API response—is the production authority. Every one of the 205 local WebPs has a source-file link, license, creator credit, visual decision, modification note, and verified SHA-256. The build fails rather than rendering a breed placeholder.

See [DESIGN.md](./DESIGN.md) for the product and evidence contract and [RUNBOOK.md](./RUNBOOK.md) for deployment and rollback.
