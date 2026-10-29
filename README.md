# Super HN

![Super HN gourd emblem](src/assets/super-hn-social.png)

A static Astro Hacker News reader at [superhn.org](https://superhn.org). Prerendered Top, New, Ask and Show feeds and story pages; live nested discussions and profiles; Pagefind search; system fonts and light/dark themes.

## Development and verification

Use Bun 1.4+ for dependencies/tests and Node.js 22.12+ for Astro, Playwright and Wrangler. Package scripts explicitly use Node for the local Cloudflare tooling.

```sh
bun install
bun run build                 # fetch one snapshot, prerender, index real pages
bun run dev
bun run check
bun test                      # offline unit tests
bun playwright install chromium
bun run test:e2e               # builds separate fixtures; HN calls are mocked
bun run validate              # check, unit tests, live build, browser tests
bun run preview               # Astro static preview
```

The development server takes a snapshot at startup; restart it to refresh the HTML. Search in development uses the most recent production index. Browser refresh buttons use live HN data. Production redirects and security headers are tested with Wrangler's local **static asset** server, not Astro preview.

All tests, fixtures, browser configuration and generated test artifacts live under `__tests_` (one trailing underscore). Browser tests create their own build in `__tests_/.artifacts/site`, leaving `dist` available for deployment. Tests cover no-JavaScript HTML, real Pagefind results, static redirects, old bookmarks, feed refresh, comment pagination and lazy replies, missing/deleted content, retry states and untrusted HTML. TypeScript is pinned to 6.0.3 because the installed Astro checker does not support TypeScript 7.0.

## Architecture

There is **no Worker application script, SSR, runtime API proxy, database, or Workers Cache**. `astro.config.ts` uses static output without an adapter. `wrangler.jsonc` deploys only `dist` as Cloudflare Workers Static Assets.

1. `src/integrations/snapshot.ts` prepares one bounded snapshot before rendering. It requests the first **100 IDs per feed**, deduplicates them, and fetches each unique story once with concurrency capped at six. The normal upper bound is four feed requests plus 400 item requests; each can retry once. These requests run in Node during the build, outside the Workers invocation limits.
2. `src/lib/snapshot.ts` validates the snapshot and derives feed pages. `getStaticPaths()` builds feeds and known `/post/:id` pages. `sitemap.xml` lists only generated routes. No comment trees or profiles are fetched during the build. Truncated feeds stop at a complete page boundary so switching to live pagination does not skip stories; very small snapshots link back to live page one.
3. `astro-pagefind` indexes the actual prerendered story HTML. A final build check verifies that every story reached the index. Search indexes titles, authors, domains and HN story text, not the entire archive, external articles or comments. Time filters are relative to the displayed snapshot timestamp.
4. Small browser scripts fetch directly from the [official HN API](https://github.com/HackerNews/API). Feed refresh is explicit; comments begin loading when their section is visible, 20 direct children at a time. Nested replies load only when opened. A shared browser connection gate caps concurrent upstream fetches at six, with timeouts, one retry and a fresh request budget for each action. No polling or framework hydration is required.
5. Build-time HTML uses `sanitize-html`; browser-rendered rich text uses a restricted DOMPurify allowlist. Titles and metadata use DOM text nodes. Fonts come from the OS, and images/scripts/styles retain hashed filenames.

The static story and feed HTML remains usable without JavaScript. Live comments, profiles, live feed pages and search require JavaScript; links to Hacker News provide the fallback. Story metadata and search change on rebuild, while browser refreshes and newly opened live views get current upstream data.

## Routes and old links

| Route | Behavior |
| --- | --- |
| `/top`, `/new`, `/ask`, `/show`, and built pagination | Prerendered HTML, optional live refresh |
| `/post/:id` in the snapshot | Prerendered story and live comments |
| `/item?id=123` | Static viewer for any valid story or comment ID |
| `/thread?id=123&page=2` | Static viewer for a comment/reply page |
| `/user?name=alice` | Static profile viewer |
| `/feed?topic=top&page=4` | Static viewer for live feed pagination |
| `/search` | Static Pagefind search |

`public/_redirects` preserves old `/user/:name` and `/thread/:id[/page]` bookmarks with HTTP redirects. A `/post/:id` that leaves the snapshot first receives the static 404 page, whose script replaces the URL with `/item?id=:id`. The same recovery handles feed pages outside the snapshot. Unrelated and malformed paths remain real 404s. This is deliberate: no growing permanent archive, catch-all Worker, or site-wide SPA rewrite. Unknown story HTML is not available to no-JavaScript clients or crawlers; live viewer pages are marked `noindex`. Known story pages retain canonical URLs and indexable HTML.

`public/_headers` supplies security headers and revalidation for HTML/search, with long-lived caching for hashed assets. Cloudflare handles trailing slash normalization. HTTPS enforcement belongs in the Cloudflare zone settings. The former Worker-only redirect from `super-hn.trevor-opiyo.workers.dev` is no longer present: that hostname serves the same static assets with canonical links to `superhn.org`.

## Snapshot size and refresh

```sh
HN_SNAPSHOT_LIMIT=200 bun run build  # 1–500 IDs per feed; default 100
```

`HN_SEARCH_LIMIT` remains a backwards-compatible alias. `HN_SNAPSHOT_FILE=/absolute/path/snapshot.json` builds from a saved, validated snapshot for reproducibility; normally leave it unset. The generated `.astro/hn-snapshot.json` is a local build intermediate, not a published endpoint or tracked file.

A failed upstream request, invalid/empty snapshot or incomplete search index fails the build. Deploy only after a successful build so the existing production deployment remains available. `bun run deploy` enforces that sequence.

`.github/workflows/refresh.yml` provides an hourly refresh (17 minutes past each hour) and a manual trigger. Scheduled jobs remain disabled until the repository variable `ENABLE_SCHEDULED_REFRESH=true` is set. Configure repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` through GitHub settings, then enable the schedule after checking the available CI budget. No remote schedule or secrets are configured by the code change. Builds cannot overlap and time out after ten minutes; deployment follows successful checks, snapshot generation, indexing and packaging. The credentials are exposed only to the deployment step.

Start hourly, measure complete runner usage, and adjust the schedule to the CI allowance. Browser refreshes provide fresher data between builds. This workflow runs in GitHub Actions, not a Cloudflare Cron Trigger, and avoids consuming Cloudflare Workers Builds minutes; GitHub's own allowance still applies. Scheduled runs can be delayed or disabled by GitHub, so this is not a freshness guarantee.

## Deployment

```sh
bun run build
bun run deploy:dry-run        # packaging only; does not publish
bun run deploy               # fresh build, then publish validated static assets
```

The source Wrangler configuration targets the existing `super-hn` service and `superhn.org` domain. Commands explicitly pass `--config wrangler.jsonc` to avoid stale adapter-generated config from an earlier checkout. No Cloudflare application bindings or paid data services are needed.

Ordinary static asset requests are free and unlimited under [Cloudflare's static asset pricing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/). Keep Workers Caching disabled: [its cache hits count as billable requests](https://developers.cloudflare.com/workers/platform/pricing/). Static asset count/size limits and CI build quotas still apply. These changes remove application invocations and upstream fetches from the Cloudflare request path; they do not eliminate build-time or browser API requests.

References: [Astro static routing](https://docs.astro.build/en/guides/routing/#static-ssg-mode), [Astro data fetching](https://docs.astro.build/en/guides/data-fetching/), [Cloudflare static site configuration](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).

## Attribution and license

Based on [Better HN](https://github.com/pajecawav/better-hn) by [pajecawav](https://github.com/pajecawav). Search follows [Thomas Ledoux's Astro/Pagefind approach](https://www.thomasledoux.be/blog/search-static-astro-website). Original copyright retained. [MIT](LICENSE).
