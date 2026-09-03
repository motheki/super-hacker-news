# Super HN

![Super HN computer mouse](docs/images/super-hn-mouse-banner.png)

A small, server-rendered Hacker News reader built with Astro and deployed on Cloudflare Workers.

- [Live site](https://super-hn.trevor-opiyo.workers.dev)
- [Issues](https://github.com/motheki/super-hacker-news/issues)

## Features

- Top, new, Ask HN, and Show HN feeds
- Complete nested comment trees with native disclosure controls
- Comment permalinks and redirects to the containing discussion
- Hacker News user profiles
- Automatic system light and dark themes
- Installable web app metadata and responsive icons
- No React or Next.js browser runtime

## Stack

- Astro server rendering on Cloudflare Workers
- Astro Fonts with self-hosted Quantico files sourced from Google Fonts
- Cloudflare Cache API for short-lived page caching
- Aggregated Hacker News APIs with the official API as the validated fallback
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
      -> aggregated APIs
      -> official API fallback
  -> Cloudflare edge cache
```

Astro renders feeds, posts, comments, profiles, metadata, and errors on the server. The browser receives compressed HTML, self-hosted fonts, a small opt-in prefetch helper, and no component framework. Native links own navigation and scrolling; native `<details>` elements own comment collapsing.

Feeds cache for 30 seconds, posts for 15 seconds, profiles for 15 minutes, and the sitemap for one hour. Upstream requests have separate short-lived Cloudflare caches, timeouts, bounded retries, schema validation, structured metrics, and official-API fallback. A post is accepted only when its reachable comment tree is complete.

Static assets receive long immutable caching where safe. Dynamic HTML uses stale-while-revalidate caching so current Hacker News data remains recent without making every visitor wait for upstream APIs.

## Deployment

Authenticate once with `wrangler login`, then deploy:

```sh
bun run deploy
```

Wrangler builds the Astro Worker, uploads static assets, provisions its cache/session binding, and deploys `super-hn` to Cloudflare.

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
