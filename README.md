# ur dog

A lifestyle matcher for all 205 AKC-recognized dog breeds.

Nine ordinary-life questions produce three research leads, visible tradeoffs, a care-plan readiness call, and a printable checklist for the people who know the actual dog. The result is decision support—not a “perfect breed” claim.

## What ships

- complete 205-breed matcher catalog;
- searchable, crawlable /breeds/ index;
- save-on-device, share, and print / PDF Dog Fit Brief;
- equal puppy and adult-rescue paths;
- 127 reviewed Wikimedia Commons photos with per-file attribution;
- branded tiles for unresolved photos;
- optional Buy Me a Coffee support after value is delivered;
- static Cloudflare Worker deployment with no database, account, analytics SDK, or paid API.

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

scripts/photo-candidates.mjs discovers candidate files through exact AKC-slug Wikidata mappings and reads Commons metadata. The checked-in public/data/breed-photos.json manifest—not a live API response—is the production authority. Each approved local WebP has a source-file link, license, creator credit, modification note, and verified SHA-256.

See [DESIGN.md](./DESIGN.md) for the product and evidence contract and [RUNBOOK.md](./RUNBOOK.md) for deployment and rollback.
