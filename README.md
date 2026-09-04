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
- A separately deployed private Cloudflare data service
- Astro Fonts with self-hosted DM Sans and DM Mono files sourced from Google Fonts
- Astro route caching backed by Cloudflare's CDN cache
- Official Hacker News data with HackerWeb and Algolia outage fallbacks
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

Run the local route benchmark with `bun run benchmark`. `bun run benchmark:live` measures warm, materialized, and provider-fallback production routes when given `MATERIALIZED_IDS` and `FALLBACK_IDS`.

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

Feeds and active discussions cache at Cloudflare's edge for one minute with five minutes of background revalidation. Discussions from one to 30 days old cache for five minutes with one hour of revalidation. Older discussions and the sitemap cache for one hour with one day of revalidation. Profiles cache for 15 minutes with one hour of revalidation. Successful HTML also receives a 15-second browser cache. Errors, missing data, and redirects are not cached.

The private data service polls official feed and update indexes, stores validated source items and normalized output, and materializes complete post trees asynchronously. One service-binding request and one indexed D1 join resolve either a post or its root redirect. Target maintenance runs after the response. Replica-eligible reads use D1 Sessions while writes remain on the primary. Missing or stale data retains the provider fallback.

Cold, warming, or unavailable service reads fall back to the previous validated provider chain. HackerWeb is checked against the official descendant count first. Algolia runs only when HackerWeb is missing or behind. Small mismatches can still use bounded official reconstruction; large discussions never risk exhausting one page request's subrequest budget.

Derived image assets are palette-compressed, content-hashed, and cached immutably for one year. Dynamic HTML uses stale-while-revalidate caching so current Hacker News data remains recent without making every visitor wait for upstream APIs.

## Deployment

The private data service is maintained and deployed from a separate private repository. This public repository deploys only the Astro Worker:

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
