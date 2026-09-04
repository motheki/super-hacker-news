# Super HN

![Super HN gourd emblem](docs/images/super-hn-gourd-banner.png)

A small, server-rendered Hacker News reader built with Astro and deployed on Cloudflare Workers.

- [Live site](https://superhn.org)
- [Issues](https://github.com/motheki/super-hacker-news/issues)

## Features

- Top, new, Ask HN, and Show HN feeds
- Validated nested comment trees with native disclosure controls
- Comment permalinks and redirects to the containing discussion
- Hacker News user profiles
- Automatic system light and dark themes
- Installable web app metadata and responsive icons
- No React or Next.js browser runtime

## Stack

- Astro server rendering on Cloudflare Workers
- Astro Fonts with self-hosted DM Sans and DM Mono files sourced from Google Fonts
- Astro route caching backed by Cloudflare's CDN cache
- HackerWeb data with Algolia and official HN fallbacks
- Bun, TypeScript 7, ESLint, Prettier, and Playwright

Astro 7.3.1 and `@astrojs/cloudflare` 14.3.0 are pinned together.

## Development

```sh
bun install
bun run dev
```

Run every check:

```sh
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run test:e2e
bun run build
```

`bun run typecheck` uses Astro's TypeScript 6-compatible checker for `.astro` templates and the TypeScript 7 native compiler for TypeScript source. TypeScript 7 does not yet expose the programmatic API Astro's checker requires.

Run the local route benchmark with `bun run benchmark`. `bun run benchmark:live` compares cache fill, repeated requests, confirmed hits, reference posts, and the current official best stories. It records every tested ID. Override its targets with `BENCHMARK_URLS`, `REFERENCE_POST_IDS`, and `RECENT_POST_IDS`.

## Architecture

```text
Browser
  -> Astro route cache on Cloudflare
    -> Astro routes and data service
      -> HackerWeb fast path
      -> official root + Algolia fallback
      -> bounded official comment reconstruction
```

Astro renders feeds, posts, comments, profiles, metadata, and errors on the server. The browser receives compressed HTML, self-hosted fonts, Astro's transition runtime, and no component framework. Native `<details>` elements own comment collapsing. Discussion links prefetch on intent.

Feeds cache at Cloudflare's edge for one minute with five minutes of background revalidation. Active discussions use one minute with four minutes of revalidation. Discussions from one to 30 days old use five minutes with one hour of revalidation. Older discussions and the sitemap use one hour with one day of revalidation. Profiles use 15 minutes with one hour of revalidation. Successful HTML also receives a 15-second browser cache. Outages return an uncached, retryable 503.

HackerWeb is the fast path. After it misses, the official root and Algolia load together. If both bulk providers miss, small discussions can use official reconstruction. One request budget covers retries, comment redirects, and reconstruction; large trees return 503 instead of exceeding the Worker limit or publishing partial content.

Derived image assets are palette-compressed, content-hashed, and cached immutably for one year. Dynamic HTML uses stale-while-revalidate caching and shared security headers.

## Deployment

```sh
bun run deploy
```

`bun run deploy` builds and deploys the Astro application. Pushing `master` also deploys it through Cloudflare's Git integration. Astro sessions remain disabled because visitor state is not stored.

## Brand

The source logo is [`src/assets/super-hn-gourd.png`](src/assets/super-hn-gourd.png). Its two-tone bottle-gourd silhouette and botanical pattern draw on traditional decorated gourds. Derived favicons, application icons, the social image, and this README banner use the application palette:

- light canvas `#D9C4A8`
- light ink `#212020`
- dark canvas `#0F0E0F`
- dark ink `#C3C3C4`
- light divider `#A79077`

Regenerate every image with `bun run brand:generate`.

## Attribution

Super HN is based on [Better HN](https://github.com/pajecawav/better-hn) by [pajecawav](https://github.com/pajecawav). Its copyright notice and MIT license remain in this repository.

## License

[MIT](LICENSE)
