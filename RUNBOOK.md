# ur dog production runbook

## Target

- GitHub: neorome/urdog
- Worker: urdog
- Canonical URL: https://urdog.dev/
- Alternate hostname: https://www.urdog.dev/ (308 to apex)
- Static assets: public/
- Rollback unit: a Cloudflare Worker version

No secret, database, paid API, account, user upload, or server-side user data is used.

## Preflight

~~~sh
npm ci
npm run check
git status --short --branch
~~~

npm run check must pass against the exact commit to deploy. Generated catalog and credit pages must be current, and the photo manifest must match every local derivative hash.

## First release sequence

1. Deploy the validated source to the workers.dev preview without custom domains.
2. Smoke-test the home page, complete catalog, photo credits, assets, matcher deep link, 404, headers, robots, and sitemap.
3. Record the new Worker version as the rollback target.
4. Add the urdog.dev and www.urdog.dev custom-domain routes in wrangler.jsonc.
5. Deploy the exact same validated source.
6. Verify the apex, the permanent www redirect, TLS, all public pages, one photo and one fallback, and the complete matcher.

Deploy:

~~~sh
npm run deploy
~~~

## Production smoke

Use a cache-busting value from the exact deployed Git commit or Worker version:

~~~sh
curl --fail --silent --show-error --max-time 20 \
  "https://urdog.dev/?release=<version>" | rg -F "find a dog who fits ur"

curl --fail --silent --show-error --max-time 20 \
  "https://urdog.dev/breeds/?release=<version>" | rg -F "all 205 breeds"

curl --fail --silent --show-error --max-time 20 \
  "https://urdog.dev/photo-credits/?release=<version>" | rg -F "every real photo"

curl --silent --show-error --head --max-time 20 \
  "https://www.urdog.dev/?release=<version>"

curl --fail --silent --show-error --max-time 20 \
  "https://urdog.dev/robots.txt?release=<version>"

curl --fail --silent --show-error --max-time 20 \
  "https://urdog.dev/sitemap.xml?release=<version>"
~~~

Expected: apex pages return 200; www returns 308 with an apex Location; TLS is valid; the sitemap contains /, /breeds/, and /photo-credits/; HTML has the security policy; image URLs are first-party; and a bad route returns 404 with X-Robots-Tag: noindex.

The matcher also needs a browser smoke: finish all nine keyboard steps, confirm three cards, save locally, copy/share a deep link, reload it, reset the current answers, clear saved briefs, open a representative local shelter map with visible results, open the complete catalog, filter to one breed, and print the brief without the support request.

## Rollback

~~~sh
npx wrangler deployments list
npx wrangler rollback <known-good-version-id>
~~~

After rollback, rerun every production smoke check. Rollback changes Worker code and assets; it does not remove custom-domain DNS or certificates.

If only a photo is disputed, remove that approved manifest row and derivative, regenerate the catalog and credits, run the full gate, and deploy. The breed remains available through the branded fallback.
