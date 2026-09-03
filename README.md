# Super HN

![Super HN computer mouse](docs/images/super-hn-mouse-banner.png)

A small, server-rendered Hacker News reader built with Astro and deployed on Cloudflare Workers.

- [Live site](https://super-hn.trevor-opiyo.workers.dev)
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
- Astro Fonts with self-hosted Quantico files sourced from Google Fonts
- Astro route caching backed by Cloudflare's CDN cache
- HackerWeb and Algolia bulk trees with a bounded official API fallback
- Bun, TypeScript 7, ESLint, Prettier, and Playwright

Astro 7.2.10 and `@astrojs/cloudflare` 14.2.6 are pinned as a compatible pair. Astro 7.3.0's published asset pipeline omits an internal logger export required by its Worker build.

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

Run the production route benchmark with `bun run benchmark`.

## Architecture

```text
Browser
  -> Astro routes and components
    -> Hacker News service
      -> HackerWeb + Algolia bulk trees
      -> bounded official API fallback
  -> Astro route cache on Cloudflare
```

Astro renders feeds, posts, comments, profiles, metadata, and errors on the server. The browser receives compressed HTML, self-hosted fonts, a small opt-in prefetch helper, and no component framework. Native links own navigation and scrolling; native `<details>` elements own comment collapsing. Discussion links prerender on hover in supported browsers and fall back to Astro's prefetch helper elsewhere.

Feeds cache at Cloudflare's edge for one minute, profiles for 15 minutes, and the sitemap for one hour. Active posts cache for 15 seconds, settled posts for one minute, and posts older than 30 days for five minutes. Their background revalidation windows are one minute, five minutes, and one hour respectively. Successful HTML also receives a 15-second browser cache. Upstream requests have separate short-lived Cloudflare caches, timeouts, bounded retries, schema validation, and structured metrics.

Post requests validate HackerWeb and Algolia trees in parallel and select the superset, or the larger valid tree when sources diverge. The official Hacker News root supplies metadata and a freshness signal. Per-comment official reconstruction is limited to small discussions so one Worker request cannot exceed Cloudflare's subrequest budget. A valid bulk tree remains available when another provider lags or fails.

Static assets receive long immutable caching where safe. Dynamic HTML uses stale-while-revalidate caching so current Hacker News data remains recent without making every visitor wait for upstream APIs.

## Deployment

Authenticate once with `wrangler login`, then deploy:

```sh
bun run deploy
```

Wrangler builds the Astro Worker, uploads static assets, configures its CDN cache, and deploys `super-hn` to Cloudflare. Astro sessions are disabled because the application stores no visitor state.

## Brand

The source logo is [`src/assets/super-hn-mouse.png`](src/assets/super-hn-mouse.png). Derived favicons, application icons, the social image, and this README banner use the same computer-mouse mark and four-color palette:

- dark background `#323232`
- dark text and UI `#FFFFFF`
- light background `#E2E5DE`
- light text and UI `#020202`

## Attribution

Super HN is based on [Better HN](https://github.com/pajecawav/better-hn) by [pajecawav](https://github.com/pajecawav). Its copyright notice and MIT license remain in this repository.

## License

[MIT](LICENSE)
