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
bun run lint
bun test
bun run build
bun run preview
```

## Structure

- `src/pages/`: file-based routes. One feed route handles both the first page and pagination. Robots and the web manifest are prerendered; feeds, discussions, and profiles render on demand.
- `src/layouts/` and `src/components/`: server-rendered HTML, shared metadata, and native comment controls. No client-side router or component framework.
- `src/lib/`: route validation, response policies, and Hacker News data access. HackerWeb is the fast path; Algolia and bounded official API reconstruction provide fallbacks.
- `src/assets/` and `src/styles/`: content-hashed brand images and shared styles. Astro Fonts self-hosts DM Sans and DM Mono.
- `astro.config.ts`: Cloudflare adapter, edge cache rules, and intent-based prefetching with experimental client prerendering.

Astro's Cloudflare cache provider caches feeds for one minute and profiles for 15 minutes, with stale-while-revalidate. Discussion cache lifetimes increase with age. Errors are uncached; upstream outages return a retryable 503. Static assets use `public/_headers`; middleware applies dynamic response headers.

## Deployment

```sh
bun run deploy
```

This builds fresh output, then deploys using Astro's generated Wrangler configuration. `wrangler.jsonc` targets the `super-hn` Worker and `superhn.org` custom domain. Cloudflare credentials are required. Sessions are disabled; no application storage bindings are needed.

To check deployment packaging without publishing:

```sh
bun run build
bun wrangler deploy --dry-run
```

## Attribution and license

Based on [Better HN](https://github.com/pajecawav/better-hn) by [pajecawav](https://github.com/pajecawav). Original copyright retained. [MIT](LICENSE).
