# Super HN

![Super HN black-and-white gourd emblem](src/assets/super-hn-social.png)

A small, server-rendered Hacker News reader built with [Astro](https://astro.build) and deployed on Cloudflare Workers at [superhn.org](https://superhn.org).

Top, new, Ask HN, and Show HN feeds; nested comments with native disclosure controls; comment permalinks; user profiles; paper-toned light mode, black dark mode, and system serif typography.

Reading styles follow [Alex Wang's article](https://alexwang.ai/posts/reasoning-as-pathfinding/): 20px text with 1.65 line spacing, 40px article titles, ink and muted-gray text, and 32px side padding around a centered column. Comments use the same 20px text and 1.65 line spacing, compact paragraph gaps, and a consistent 12px reply indent with subtle borders. The light palette uses `#F5F3EE`, `#2C2D30`, and `#595A5D`; dark mode uses a pure black background, `#F5F3EE` text, and `#A6A5A2` secondary text, with identical spacing and padding.

The header is a sticky horizontal pill with topic links centered between the logo and GitHub icon. Controls remain 44px tall; narrower screens use smaller text and artwork to keep the toolbar on one row. Comment anchors clear the sticky toolbar.

## Development

Use Bun and Node.js 22.12+.

TypeScript stays on 6.x because `astro check` does not support TypeScript 7.0 yet.

```sh
bun install
bun run dev
```

```sh
bun run check
bun run build
bun run preview
```

## Structure

- `src/pages/`: file-based routes. One feed route handles both the first page and pagination. Robots and the web manifest are prerendered; feeds, discussions, and profiles render on demand.
- `src/layouts/` and `src/components/`: server-rendered HTML, shared metadata, native comment controls, and Astro's client router. Navigation fades the content over 120ms while keeping the header stable and updating the selected topic. Reduced-motion preferences disable animations; browsers without view transitions swap content immediately. No component framework.
- `src/lib/`: route validation, response policies, and Hacker News data access. HackerWeb is the fast path; Algolia and bounded official API reconstruction provide fallbacks.
- `src/assets/` and `src/styles/`: monochrome logo, light/dark favicons and header icons, app icons, README/social artwork, and shared styles. Imported images use content-hashed URLs; the ICO favicon has a versioned URL. Text uses system serif fonts, with system monospace fonts for code; no font downloads.
- `astro.config.ts`: Cloudflare adapter, edge cache rules, and intent-based prefetching. Full-document speculative prerendering is disabled because navigation uses Astro's client router.

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
