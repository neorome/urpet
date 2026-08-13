# urpet — accepted product brief

## Outcome and audience

Help a prospective pet owner identify the routine, environment, specialist care, and commitment they can genuinely provide before choosing an animal. The primary audience is a first-time or uncertain owner who wants a small, defensible research list instead of an entertainment quiz or an open-ended chatbot.

The complete result is up to three source-linked profiles plus their difficult requirements and questions to take to a shelter, rescue, responsible breeder, veterinarian, or experienced keeper. When no reviewed profile clears the person’s hard limits, the honest result is a prepare-first brief.

## Shipped product

- One-question-at-a-time, nine-question all-pets intake at `/`.
- Exactly ten launch lanes: dogs, cats, freshwater aquariums, companion birds, rabbits, guinea pigs, hamsters, turtles and tortoises, geckos, and snakes.
- Eleven specific profiles across those lanes; the bird lane contains both a compatible budgerigar pair and a compatible cockatiel pair.
- Zero to three ranked research leads. A preference score can order compatible profiles but can never erase a hard conflict.
- A dedicated `/dogs/` module preserving the original nine-question, 205-breed matcher, local briefs, print/share/reset workflow, shelter map, Honduras fallbacks, and photo evidence.
- A no-JavaScript method/source fallback and a labeled suggestion email to `team@neorome.dev`.
- Buy Me a Coffee support only after a completed result.
- An optional one-shot shared organizer, hidden unless every configuration and funded-budget gate is ready. It receives closed profile and answer IDs—not a free-form user prompt—and may choose only three IDs from repository-reviewed questions; provider prose never reaches the page.

## Launch profiles

| Lane | Reviewed profile(s) |
| --- | --- |
| Dogs | 205-breed dog research module |
| Cats | Adult domestic cat |
| Freshwater aquariums | Mature goldfish aquarium |
| Companion birds | Compatible budgerigar pair; compatible cockatiel pair |
| Rabbits | Bonded domestic rabbit pair |
| Guinea pigs | Compatible guinea pig pair |
| Hamsters | Solo Syrian hamster |
| Turtles and tortoises | Captive-bred Hermann’s tortoise |
| Geckos | Captive-bred leopard gecko |
| Snakes | Captive-bred corn snake |

Aquatic turtles, other tortoise species, tropical community tanks, bettas, large parrots, other hamster species, other geckos, and other snakes remain explicitly researching. A visitor can suggest the next review by email; a suggestion never becomes an instant profile.

## Match contract

Inputs cover search mode, priority lanes, protected daily care rhythm, dedicated space, desired relationship rhythm, specialist food or maintenance, a reptile household-health gate, actual veterinary access, and whole-life commitment.

Hard conflicts include:

- aquarium cycling, filtration, water-quality work, and appropriate habitat;
- live invertebrate feeding for the leopard gecko;
- frozen-thawed rodent feeding for the corn snake;
- specialist enclosure and veterinary access for reviewed reptiles;
- the CDC reptile caution for a child under five, adult 65+, or immunocompromised person in the household;
- bird social needs and safe flight space;
- rabbit movement space;
- nocturnal and solitary Syrian hamster behavior;
- ten-plus or multidecade commitment where the reviewed lifespan requires it.

A research lead means only that the profile did not conflict with the selected boundaries. The individual animal, source, local law, housing rules, full cost, veterinary access, and backup care remain verification jobs.

## Support and shared-guide contract

The deterministic matcher is always free and does not consume a shared budget. There are no accounts, purchases, entitlements, or personal credit balances.

Buy Me a Coffee is the only support provider. Notes containing `urpet` or legacy `urdog` qualify after punctuation, spacing, and capitalization normalization. For successful live USD donations, 75% of the gross amount is entered as an earmark; 25% is retained for payment fees and site upkeep. Signed refunds reverse the original earmark exactly once.

The site never claims that Buy Me a Coffee transfers funds to Cerebras. A funding receipt is recorded only after an operator verifies actual provider credit. Authorized shared spend is:

```text
owner credit actually funded
+ min(active 75% support earmarks, support credit actually funded)
- reserved usage
- settled usage
```

Owner receipts are append-only and capped at $10 cumulatively by database triggers, including SQLite replacement paths. Each guide call is protected by exact production-host and same-origin checks, closed input validation, a three-per-minute edge-IP limiter, Turnstile action/hostname verification, exact D1 ceilings of 250 reservations and $0.10 committed spend per UTC day, a durable atomic reservation, a short timeout, reviewed question-ID validation, and actual token-cost settlement. Stale or unknown provider outcomes consume the conservative reservation rather than risking double spend.

Guide settlement uses the pinned public `gpt-oss-120b` rates in `lib/cerebras-pricing.js`. Before the guide is enabled, `npm run check:guide-pricing` must match that pin against Cerebras's public model endpoint; any mismatch leaves the guide off until the rates, cost tests, and budget review are updated together.

The ledger stores payment and event IDs, amounts, status, receipt IDs, aggregate budget, profile ID, token counts, cost, and outcome. It does not store supporter name, email, raw note, browser IP, Turnstile token, prompt, or model output.

## Voice and visual system

- Brand: lowercase `urpet`; public domain remains `urdog.dev`.
- Cream, ink, tomato, acid, sky, and purple; thick outlines; tactile paper and desk motifs.
- One literal question per screen with visible progress and stable back/next controls.
- Lane selection is a compact grouped list with no animal photos; appearance must not steer the answers.
- Results are one ordered editorial list, not repeated cards. Exact licensed profile photos appear only beside matched leads, with visible creator and license links.
- Tone: calm and direct around the living animal, lightly playful around paperwork.
- Copy must help someone answer, act, verify a source, or understand a boundary. No destiny language, fake percentages, shame, urgency, or buzzword claims.

## Accessibility and responsive behavior

The experience must work from 320 px through desktop without horizontal overflow. Every control has a programmatic label; errors are announced; focus moves to each question and result; keyboard operation is complete; reduced motion disables smooth transitions; print removes navigation and support. The optional Turnstile script loads only after a funded guide is reported ready and its disclosure is opened.

## Evidence boundaries

The all-pets first release uses reviewed RSPCA care sources and CDC reptile guidance. It is educational screening, not veterinary, medical, legal, behavioral, or financial advice. Profile copy must stay narrower than its cited source.

The dog module preserves 205 unique AKC-recognized breed rows, conservative editorial fit bands, complete broad-fit fields, and 205 locally served, licensed, visually approved Wikimedia Commons photos. The ten reviewed non-dog profiles each have one exact local Commons photo, creator, source, license, and modification notice. Breed category signals never predict an individual animal.

## Non-goals

- No “perfect pet” or individual-behavior prediction.
- No visible chatbot, unlimited free-form model prompt, or model-created care facts.
- No account, Stripe, checkout, subscription, personal token balance, gift, adoption feed, affiliate marketplace, or user upload.
- No automatic provider purchase claim, secret in source control, raw payment note retention, or supporter identity profile.
- No unsupported species borrowing another animal’s profile.
- No guarantee that abuse is impossible or that the optional shared guide is always available.

## Acceptance proof

- Automated tests cover all ten lanes, exact profile counts, normalization, hard conflicts, zero-lead results, dog-module routing, support keywords, exact raw-body HMAC, donation idempotency, refunds and out-of-order delivery, privacy-minimized schema, immutable owner cap, dual-ledger budget, exact host/origin, distributed daily limits, concurrent reservations, Turnstile hostname/action/IP/idempotency, closed guide input, allowlisted output, token-cost settlement, stale/unknown outcomes, and dry-run reconciliation.
- Static verification covers the nine-step root, flat intake/results, preserved nine-step dog module, `/dogs/` deep links, 205 dog photos, ten exact profile photos, metadata, sitemap, no hotlinks, 320 px CSS, reduced motion, print, headers, and asset budgets.
- Browser proof covers desktop and mobile completion, hard-conflict output, keyboard focus, hidden unfunded guide, dog module, outbound support confirmation, and overflow.
- Deployment proof distinguishes local checks, committed and pushed code, applied D1 migration, configured secrets, deployed Worker version, and cache-busted live checks.

## Authority and stable infrastructure

The product, package, local repository, and GitHub repository are `urpet`. The current public domain stays `urdog.dev`. The established Cloudflare Worker name `urdog`, D1 database name `urdog-community`, and database ID remain legacy infrastructure identifiers to preserve routing and rollback.

Secret installation, BMC webhook configuration, Turnstile widget creation, any Cerebras credit purchase, and other financial actions require their own current authorization. A deterministic release can ship with the shared guide resting.

## Revision and stop conditions

- Remove or narrow a profile immediately when its care claim cannot be defended.
- Keep a lane marked researching until its own profile and hard conflicts pass review.
- Disable the shared guide on ledger mismatch, provider uncertainty, missing controls, unverified credits, or budget exhaustion; the deterministic matcher remains available.
- If users say the product entertains but does not improve a real provider conversation, revise the intake and questions before adding coverage.
- Never compensate for low support with guilt, dark patterns, hidden paywalls, or unsupported recommendations.
