# Super HN

![Super HN gourd emblem](src/assets/super-hn-social.png)

A small, server-rendered Hacker News reader built with [Astro](https://astro.build) and deployed on Cloudflare Workers at [superhn.org](https://superhn.org).

Top, new, Ask HN, and Show HN feeds; nested comments with native disclosure controls; comment permalinks; user profiles; system light/dark themes.

## Development

Use Bun and Node.js 22.12+.

```sh
bun install
bun run dev
```

```sh
bun run check
bun test
bun run build
bun run preview
```

## Structure

- `src/pages/`: file-based routes. One feed route handles both the first page and pagination. Robots and the web manifest are prerendered; feeds, discussions, and profiles render on demand.
- `src/layouts/` and `src/components/`: server-rendered HTML, shared metadata, and native comment controls. No client-side router or component framework.
- `src/lib/`: route validation, response policies, and Hacker News data access. HackerWeb is the fast path; Algolia and bounded official API reconstruction provide fallbacks.
- `src/assets/` and `src/styles/`: content-hashed brand images and shared styles. Text uses system UI fonts, with system monospace fonts for code.
- `astro.config.ts`: Cloudflare adapter, edge cache rules, and intent-based prefetching with experimental client prerendering.

Astro's Cloudflare cache provider caches feeds for one minute and profiles for 15 minutes, with stale-while-revalidate. Discussion cache lifetimes increase with age. Empty bulk comment trees are verified against the official API before being accepted. A separate, data-center-local Cache API store retains successful discussions for up to one hour, used only when providers fail; restored pages are not cached again. Missing/deleted posts clear that fallback. Errors are uncached; upstream outages without a usable fallback return a retryable 503. Static assets use `public/_headers`; middleware applies dynamic response headers.

## Deployment

```sh
bun run deploy
```

This builds fresh output, then deploys using Astro's generated Wrangler configuration. `wrangler.jsonc` targets the `super-hn` Worker and `superhn.org` custom domain. Cloudflare credentials are required. Sessions are disabled; no application storage bindings are needed. The deployment uses Workers Standard. Its application-level fallback budget is capped at 1,000 subrequests (below the platform's 10,000 limit), including retries; set the default in `src/lib/hacker-news/budget.ts` to 50 before deploying on Workers Free. HackerWeb and Algolia post requests have 3-second and 5-second timeouts, respectively, with no automatic bulk retries.

Cloudflare Workers Builds is connected to GitHub's `master` branch with these commands:

- Build: `bun run build`
- Deploy: `bun wrangler deploy`

CI builds once, then runs Wrangler directly to deploy the server Worker and static assets. Local `bun run deploy` runs `astro build && wrangler deploy`. Astro generates the deployment configuration and sets the asset directory to `dist/client`, so the source Wrangler configuration does not specify an output directory.

To check deployment packaging without publishing:

```sh
bun run build
bun wrangler deploy --dry-run
```

## Attribution and license

Based on [Better HN](https://github.com/pajecawav/better-hn) by [pajecawav](https://github.com/pajecawav). Original copyright retained. [MIT](LICENSE).
