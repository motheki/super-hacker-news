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
- A separately deployed private Cloudflare data service
- Astro Fonts with self-hosted Quantico files sourced from Google Fonts
- Astro route caching backed by Cloudflare's CDN cache
- Official Hacker News data with HackerWeb and Algolia outage fallbacks
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
    -> private HN data Worker
      -> D1 materialized feeds, posts, and profiles
      -> Queue comment-tree hydration
      -> scheduled official HN synchronization
    -> HackerWeb + Algolia fallback
  -> Astro route cache on Cloudflare
```

Astro renders feeds, posts, comments, profiles, metadata, and errors on the server. The browser receives compressed HTML, self-hosted fonts, a small opt-in prefetch helper, and no component framework. Native links own navigation and scrolling; native `<details>` elements own comment collapsing. Discussion links prerender on hover in supported browsers and fall back to Astro's prefetch helper elsewhere.

Feeds cache at Cloudflare's edge for one minute, profiles for 15 minutes, and the sitemap for one hour. Active posts cache for 15 seconds, settled posts for one minute, and posts older than 30 days for five minutes. Their background revalidation windows are one minute, five minutes, and one hour respectively. Successful HTML also receives a 15-second browser cache. Upstream requests have separate short-lived Cloudflare caches, timeouts, bounded retries, schema validation, and structured metrics.

The private data service polls official feed and update indexes, stores validated source items and normalized output, and materializes complete post trees asynchronously. The Astro Worker reads those trees through a service binding, so readers do not wait for a fan-out of Hacker News requests. Missing or stale feeds also refresh on demand, so scheduled synchronization is not a single point of failure.

Cold, warming, or unavailable service reads fall back to the previous validated provider chain. HackerWeb is checked against the official descendant count first. Algolia runs only when HackerWeb is missing or behind. Small mismatches can still use bounded official reconstruction; large discussions never risk exhausting one page request's subrequest budget.

Static assets receive long immutable caching where safe. Dynamic HTML uses stale-while-revalidate caching so current Hacker News data remains recent without making every visitor wait for upstream APIs.

## Deployment

The private data service is maintained and deployed from a separate private repository. This public repository deploys only the Astro Worker:

```sh
bun run deploy
```

`bun run deploy` builds and deploys the Astro application. Pushing `master` also deploys it through Cloudflare's Git integration. Astro sessions remain disabled because visitor state is not stored.

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
