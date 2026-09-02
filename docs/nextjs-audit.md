# Next.js documentation audit

Audited against the complete App Router documentation corpus published at [nextjs.org/docs/llms-full.txt](https://nextjs.org/docs/llms-full.txt) on 2026-09-02. All 454 indexed pages were classified; application-relevant guides and examples were inspected in depth.

## Applied

- [Linking and navigation](https://nextjs.org/docs/app/getting-started/linking-and-navigating): internal navigation uses `Link`; Next owns route transitions while the app owns one explicit scroll policy.
- [Instant navigation](https://nextjs.org/docs/app/guides/instant-navigation): dynamic routes expose a static shell and keep URL reads inside Suspense. Production `instant()` tests protect the shell.
- [Partial Prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching): the shared shell prefetches by default; URL-specific cached content prefetches only on intent, except end-of-feed pagination.
- [Caching](https://nextjs.org/docs/app/getting-started/caching-and-revalidating): upstream reads use `use cache`, explicit `cacheLife`, and resource tags. Live-news feeds, posts, and profiles refresh after one minute; sitemap story IDs refresh hourly.
- [Streaming](https://nextjs.org/docs/app/getting-started/streaming): Suspense boundaries sit directly above URL and upstream-data work. The header and navigation remain interactive while content resolves.
- [Fonts](https://nextjs.org/docs/app/getting-started/fonts): Geist Pixel loads through `next/font`, eliminating external font requests and layout instability.
- [Metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images): typed metadata, canonical URLs, generated Open Graph media, manifest, robots, and sitemap use App Router conventions.
- [Error handling](https://nextjs.org/docs/app/getting-started/error-handling): expected invalid routes use `notFound` or `redirect`; route and global error boundaries provide recovery.
- [Production](https://nextjs.org/docs/app/guides/production-checklist): strict typing, linting, unit tests, browser tests, production builds, disabled framework branding, and bundle analysis are available locally.

## Deliberate constraints

- Fresh Hacker News data is cached for one minute. Longer shell residency would be faster but would violate the product’s freshness expectation.
- Discussion payloads can be large. Full prefetching is intent-triggered instead of running for every visible feed link.
- The custom scroll policy is deliberate: new navigation, pagination, reload, and app reopen start at the top; only in-session Back and Forward restore a history entry. Hash targets override both rules.
- Authentication, Server Actions, mutations, Route Handlers, image-heavy pages, internationalization, multi-tenant routing, and custom deployment adapters do not match this read-only application and were not introduced.
