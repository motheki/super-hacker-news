# Next.js 16.3 documentation audit

This audit uses the current [`/docs/llms.txt`](https://nextjs.org/docs/llms.txt) index for Next.js 16.3.0. “Applied” means this change uses the documented strategy, “Already idiomatic” means the existing implementation already follows it, “Not applicable” means the application has no corresponding product requirement, and “Deferred” records an optional operational choice that should not be added without evidence.

Mutually exclusive strategies are not combined. This is an App Router, public, read-only Hacker News client; adding authentication, mutations, forms, route handlers, media, locales, custom infrastructure, or Pages Router code solely to exercise an API would make the application less idiomatic.

## Getting Started

| Documentation section        | Disposition       | Evidence / reason                                                                                                                         |
| ---------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Installation                 | Already idiomatic | Next 16.3, React 19, strict TypeScript, `src/`, Tailwind, and import aliases are configured.                                              |
| Project Structure            | Already idiomatic | Routes use `src/app`; reusable UI and server data live outside route segments.                                                            |
| Layouts and Pages            | Already idiomatic | Root layout, dynamic pages, and file-system routing are used.                                                                             |
| Linking and Navigating       | Applied           | Internal routes use `next/link`; external and hash links use native anchors; Partial Prefetching is enabled.                              |
| Server and Client Components | Already idiomatic | Server Components are the default; client boundaries are limited to browser interaction and error recovery.                               |
| Fetching Data                | Applied           | Public API reads happen on the server, close to their consumers, with validation and streaming loading boundaries.                        |
| Mutating Data                | Not applicable    | The application has no writes. Fake Server Actions would add attack surface.                                                              |
| Caching                      | Applied           | Cache Components, `use cache`, `cacheLife`, and argument-keyed cached functions replace the previous fetch-cache model.                   |
| Revalidating                 | Applied           | Time-based revalidation and cache tags are defined. On-demand invalidation is unnecessary without mutations/webhooks.                     |
| Error Handling               | Applied           | Route `error`, `not-found`, loading UI, and `global-error` conventions are present.                                                       |
| CSS                          | Already idiomatic | Global Tailwind CSS is imported once by the root layout.                                                                                  |
| Image Optimization           | Not applicable    | The UI has no content images; metadata/PWA assets are static files or `ImageResponse` output.                                             |
| Font Optimization            | Already idiomatic | `next/font/google` self-hosts Geist Pixel with explicit fallbacks.                                                                        |
| Metadata and OG images       | Applied           | Typed metadata, canonical URLs, Open Graph/Twitter data, JSON-LD, and generated OG image are present.                                     |
| Route Handlers               | Not applicable    | Server Components call the upstream API directly; an internal HTTP hop would be slower.                                                   |
| Proxy                        | Applied           | A narrow, fetch-free Proxy rejects malformed route shapes before a PPR shell commits HTTP 200; pages repeat validation with `notFound()`. |
| Deploying                    | Already idiomatic | Standard `next build`/`next start` scripts and Vercel-compatible output are used.                                                         |
| Upgrading                    | Already idiomatic | The project and documentation are aligned on 16.3.0.                                                                                      |

## Guides

| Guide                                                 | Disposition       | Evidence / reason                                                                                                                                    |
| ----------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adopting Partial Prefetching                          | Applied           | `partialPrefetching` is enabled after link and route review.                                                                                         |
| AI Coding Agents                                      | Already idiomatic | Repository agent skills and this versioned audit point at current docs.                                                                              |
| Analytics                                             | Already idiomatic | `@vercel/analytics/next` is mounted once in the root layout.                                                                                         |
| Authentication / Authentication with Cache Components | Not applicable    | There are no accounts or private data.                                                                                                               |
| Backend for Frontend                                  | Not applicable    | No client-side backend access or first-party API is required.                                                                                        |
| Building                                              | Applied           | Production build output is part of validation.                                                                                                       |
| Caching (Previous Model)                              | Not applicable    | Cache Components is enabled; the previous model is intentionally removed.                                                                            |
| CDN Caching                                           | Already idiomatic | Hosting uses framework/Vercel cache behavior; no custom CDN headers override it.                                                                     |
| CI Build Caching                                      | Applied           | GitHub Actions restores `.next/cache` with lockfile/source-aware keys using an immutable pinned `actions/cache` revision.                            |
| Content Security Policy                               | Applied           | Static CSP and security headers retain prerendering; nonce CSP is deliberately avoided because it forces dynamic rendering.                          |
| CSS-in-JS                                             | Not applicable    | Tailwind/global CSS is already the chosen strategy.                                                                                                  |
| Custom Server                                         | Not applicable    | A custom server would remove automatic optimizations.                                                                                                |
| Data Security                                         | Applied           | Upstream parsing is server-only, every rendered field is shape-checked, outbound schemes are restricted, HTML is sanitized, and JSON-LD escapes `<`. |
| Debugging                                             | Already idiomatic | Standard Next development tooling applies without project code.                                                                                      |
| Deploying to Platforms                                | Already idiomatic | No adapter-specific APIs are used.                                                                                                                   |
| Draft Mode                                            | Not applicable    | There is no CMS or unpublished content.                                                                                                              |
| Environment Variables                                 | Applied           | Optional LAN origins use server-only `ALLOWED_DEV_ORIGINS`; no origin is hard-coded.                                                                 |
| Forms                                                 | Not applicable    | The product has no form workflow.                                                                                                                    |
| How Revalidation Works                                | Applied           | Cached reads use explicit lifetimes and tags; no conflicting invalidation layer exists.                                                              |
| ISR / ISR with Cache Components                       | Applied           | Known topic params and cached data contribute to static shells; unknown post/user params resolve at runtime.                                         |
| Instant Navigation                                    | Applied           | Loading boundaries, cached reads, Partial Prefetching, and intentional per-link prefetching are used.                                                |
| Instrumentation / OpenTelemetry                       | Deferred          | Vercel Analytics is sufficient for this small app; add server telemetry only with an operational backend.                                            |
| Interactive apps                                      | Already idiomatic | Transitions and pending/error UI use React/Next primitives.                                                                                          |
| Internationalization                                  | Not applicable    | The product has no locale requirement.                                                                                                               |
| JSON-LD                                               | Applied           | Native `application/ld+json` scripts use an XSS-safe serializer.                                                                                     |
| Lazy Loading                                          | Not applicable    | There is no heavy client component or third-party client library to split.                                                                           |
| Development Environment                               | Already idiomatic | Standard Next dev flow and portable dev-origin configuration are present.                                                                            |
| Next.js MCP Server                                    | Deferred          | Developer tooling choice; no runtime code is required.                                                                                               |
| MDX                                                   | Not applicable    | There is no authored MDX content.                                                                                                                    |
| Memory Usage                                          | Already idiomatic | Small server modules, narrow client bundles, and framework defaults need no tuning.                                                                  |
| Migrating (App Router/CRA/Vite)                       | Not applicable    | The application already uses App Router.                                                                                                             |
| Migrating to Cache Components                         | Applied           | Legacy `fetch.next` policy moved to `use cache`, `cacheLife`, and `cacheTag`.                                                                        |
| Multi-tenant / Multi-zones                            | Not applicable    | One public site and one deployment are used.                                                                                                         |
| Offline support                                       | Deferred          | A service worker changes freshness and failure semantics; no offline product requirement exists.                                                     |
| Optimizing prefetching / Prefetching                  | Applied           | Shared shells cover high-cardinality links; only four topic links and one pagination link request URL data.                                          |
| Package Bundling                                      | Applied           | A Turbopack `experimental-analyze --output` script is available; server-only parsing libraries stay off the client.                                  |
| PPR Platform Guide                                    | Not applicable    | Vercel supplies the platform integration.                                                                                                            |
| Preserving UI state                                   | Already idiomatic | Shared layout/header persists; comment state is intentionally local to its client island.                                                            |
| Preventing Flash                                      | Already idiomatic | A `beforeInteractive` theme initializer runs before paint.                                                                                           |
| Production                                            | Applied           | Security headers, metadata, server/client boundaries, lint, types, tests, and production build checks are covered.                                   |
| PWAs                                                  | Already idiomatic | A manifest and install icons exist; offline service-worker behavior is intentionally not implied.                                                    |
| Public pages                                          | Applied           | Public data is cached and safely shared across visitors.                                                                                             |
| Redirecting                                           | Already idiomatic | The simple root redirect uses `next.config`, as documented.                                                                                          |
| Rendering Philosophy                                  | Applied           | Static layout/shell, cached public data, and streamed URL-specific content are composed instead of forcing a route-wide mode.                        |
| Sass / Tailwind CSS v3                                | Not applicable    | Tailwind CSS v4 is already configured.                                                                                                               |
| Scripts                                               | Already idiomatic | The required pre-paint inline script uses `next/script`; JSON-LD correctly uses a native script.                                                     |
| Self-Hosting / Static Exports                         | Not applicable    | The dynamic upstream-backed app targets a Next server/Vercel, not static export or custom hosting.                                                   |
| Server Actions                                        | Not applicable    | No mutations exist.                                                                                                                                  |
| SPAs                                                  | Already idiomatic | Next client transitions are used without opting out of server rendering.                                                                             |
| Streaming                                             | Already idiomatic | Route `loading.tsx` boundaries provide fallbacks for dynamic data.                                                                                   |
| Testing (Cypress/Jest/Playwright/Vitest)              | Applied           | Focused pure tests use existing Bun tooling; a heavyweight browser framework is not justified for this small repository.                             |
| Third Party Libraries                                 | Already idiomatic | Analytics uses its framework entry point; server-only HTML libraries do not hydrate.                                                                 |
| Upgrading / codemods / versions 14–16                 | Already idiomatic | Code uses current async route props, Proxy naming decisions, React 19, and Next 16 Cache Components.                                                 |
| Videos                                                | Not applicable    | No video is rendered.                                                                                                                                |
| View transitions                                      | Already idiomatic | React `ViewTransition`, Link transition types, progressive fallback, and reduced-motion CSS are present.                                             |

## API Reference

| API category                                                                          | Disposition       | Evidence / reason                                                                                        |
| ------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| Directives: `use cache`                                                               | Applied           | Public API functions are async cached scopes with explicit lifetimes.                                    |
| Directives: `use cache: private` / `remote`                                           | Not applicable    | There is no session data; remote cache cost/handler is a platform decision.                              |
| Directives: `use client`                                                              | Already idiomatic | Used only for state, effects, browser APIs, and reset handlers.                                          |
| Directives: `use server`                                                              | Not applicable    | No Server Actions exist.                                                                                 |
| Components: Font                                                                      | Already idiomatic | `next/font` is configured in the root layout.                                                            |
| Components: Form                                                                      | Not applicable    | No search or mutation form exists.                                                                       |
| Components: Image                                                                     | Not applicable    | No content image exists.                                                                                 |
| Components: Link                                                                      | Applied           | Internal client navigation and prefetching only.                                                         |
| Components: Script                                                                    | Already idiomatic | Pre-paint theme initialization uses the documented component/strategy.                                   |
| File conventions: page/layout/loading/error/not-found/global-error                    | Applied           | All applicable route boundaries use framework conventions.                                               |
| File conventions: dynamic segments and `generateStaticParams`                         | Already idiomatic | Finite topics are enumerated; unbounded posts/users validate in their pages.                             |
| File conventions: Proxy                                                               | Applied           | A narrow path-shape guard preserves real 404 status for malformed dynamic URLs without data fetching.    |
| File conventions: route groups/templates/parallel/intercepting/default                | Not applicable    | The current UI has no independent slots, modal interception, or remount requirement.                     |
| File conventions: route handlers                                                      | Not applicable    | Server Components fetch upstream directly.                                                               |
| File conventions: `src` and `public`                                                  | Already idiomatic | Both conventions are used for source and static PWA/icon assets.                                         |
| Metadata files: icons/manifest/robots/sitemap/OG                                      | Applied           | Typed/generated conventions and static icon assets cover each applicable output.                         |
| Route Segment Config: `instant`, `prefetch`, `maxDuration`, `runtime`                 | Already idiomatic | Global Partial Prefetching and default Node/runtime limits suffice; no segment override is needed.       |
| Functions: `cacheLife`, `cacheTag`, `fetch`                                           | Applied           | Used together within cache scopes.                                                                       |
| Functions: `generateMetadata`, `generateStaticParams`, `ImageResponse`, `notFound`    | Applied           | Dynamic metadata, topic prerendering, generated social image, and route 404s are present.                |
| Functions: `redirect` family                                                          | Already idiomatic | Static root redirect is correctly handled by config; runtime redirects are unnecessary.                  |
| Functions: revalidation APIs                                                          | Not applicable    | Tags prepare for future invalidation, but no trusted mutation entry point exists.                        |
| Functions: request APIs (`cookies`, `headers`, `connection`, `draftMode`, user-agent) | Not applicable    | Pages have no request/session-specific behavior.                                                         |
| Functions: Server Action APIs (`refresh`, `updateTag`)                                | Not applicable    | No mutations exist.                                                                                      |
| Functions: navigation hooks                                                           | Already idiomatic | `usePathname` is used only in the narrow active-navigation client component.                             |
| Functions: `useLinkStatus`, `useOffline`, Web Vitals                                  | Deferred          | Loading files and Analytics cover current UX/measurement; add these only for a demonstrated requirement. |
| Functions: auth interrupts / forbidden / unauthorized                                 | Not applicable    | The site is public.                                                                                      |
| Configuration: Cache Components / Partial Prefetching / typed routes                  | Applied           | Enabled and validated together.                                                                          |
| Configuration: headers / redirects / allowed dev origins / powered-by                 | Applied           | Portable development config, security headers, root redirect, and header hardening are configured.       |
| Configuration: images/fonts/scripts/compiler/Turbopack                                | Already idiomatic | Framework defaults and built-in Turbopack are retained; no speculative tuning.                           |
| Configuration: cache handlers/life profiles/CDN/self-host output                      | Not applicable    | Default platform cache and deployment output are appropriate.                                            |
| Configuration: experimental/auth/taint/offline/SRI/compiler flags                     | Deferred          | Experimental flags are not enabled without a concrete need and validation budget.                        |
| Configuration: Pages Router/webpack/MDX/Sass/adapters                                 | Not applicable    | The application uses App Router, Turbopack, and Tailwind.                                                |
| CLI: create-next-app / next                                                           | Already idiomatic | Standard `next dev`, `build`, `start`, and analyzer commands are exposed.                                |
| Adapters / Edge Runtime                                                               | Not applicable    | Vercel/default Node deployment needs no custom adapter or deprecated edge route runtime.                 |
| Turbopack                                                                             | Applied           | Builds and bundle analysis use the built-in Turbopack pipeline.                                          |

## Architecture, Community, and optional router documentation

| Section                               | Disposition       | Evidence / reason                                                                                              |
| ------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Glossary                              | Already idiomatic | Terminology in this audit follows the 16.3 App Shell, caching, and rendering definitions.                      |
| Architecture: Accessibility           | Applied           | Semantic navigation/articles, keyboard focus, status text, reduced motion, and accessible errors are retained. |
| Architecture: Fast Refresh / compiler | Already idiomatic | Framework defaults are used without custom compiler transforms.                                                |
| Architecture: Supported Browsers      | Already idiomatic | Progressive View Transitions degrade without blocking navigation.                                              |
| Community: contribution / Rspack      | Not applicable    | These describe contributing to Next.js or choosing a different bundler, not this app’s runtime.                |
| Pages Router documentation            | Not applicable    | Mixing Pages Router data methods and routing into an App Router app would be a regression.                     |

## Operational follow-ups

- Run browser checks in production mode for Partial Prefetching network cost, theme first paint, View Transitions, reduced motion, and keyboard navigation.
- Run the generated bundle analyzer when bundle-size work is planned; the analyzer is experimental and should not run in normal CI.
- A stricter nonce CSP is intentionally not used: official guidance notes that it forces dynamic rendering and is incompatible with a prerendered App Shell. Revisit only if compliance requirements outweigh that cost.
- Remote cache handlers, telemetry backends, browser E2E dependencies, and offline service workers remain evidence-driven deployment/product decisions.
