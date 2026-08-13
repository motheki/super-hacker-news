# Architecture and design

This document reflects the current Super HN application.

## Product surface

- `/` redirects to `/top`.
- `/top`, `/new`, `/ask`, and `/show` paginate through 30-story upstream feed batches while showing only the stories that fit in the initial viewport.
- `/post/[postId]` renders a story, its metadata, and nested collapsible comments. When the ID belongs to a comment, the route follows its Hacker News parent chain and redirects to the root story with the matching comment anchor.
- `/user/[userName]` renders Hacker News profile details and links to the original activity pages.
- Invalid topic, page, post, and user paths are rejected before rendering.

## Rendering and navigation

Routes are Next.js App Router Server Components by default. Only navigation state, sharing, and collapsible comments are client-side islands. Route-level loading, error, global error, and not-found boundaries cover navigation and failure states.

Topic destinations are prefetched, likely story and user destinations warm on pointer or keyboard intent, and React View Transitions provide a short fade while keeping the topic navigation stable. Reduced-motion preferences disable transition timing.

## Data and caching

Feed and post data comes from the HackerWeb API, profiles come from the HNPWA API, and best-story identifiers come from the official Hacker News Firebase API. Every upstream payload is validated before it reaches a page.

Cache Components use `use cache`, explicit cache lifetimes, and resource-specific cache tags. Feeds, posts, and profiles revalidate after one minute; the best-story identifier list revalidates hourly. Post processing also normalizes nested comment counts.

## E-ink visual system

The app automatically follows the system color-scheme preference. The light theme uses a paper canvas (`#e6ebe9`) with dark ink and a muted gray hierarchy. The dark theme closely inverts that relationship: the light E-ink canvas becomes the primary text and UI ink, while a deep gray-green derived from the light ink becomes the canvas. Muted text, faint metadata, links, visited links, rules, and selection fills retain distinct inverted weights. Geist Pixel supplies the retro display character, while dotted rules, restrained hover fills, and compact spacing keep the interface readable without visual chrome.

The favicon follows the same system: a solid, hard-edged terminal drawn in the site ink color (`#242927`) on the paper canvas. Its geometry fills the 64-unit grid with a four-unit safety margin, so launcher icons remain prominent while every edge still aligns at 16 px output.

## App and browser metadata

Next.js metadata owns a versioned icon set so browser caches cannot retain superseded artwork:

- `public/super-hn-terminal-v1.svg` provides the resolution-independent browser icon.
- `public/super-hn-terminal-v1.ico` provides 16 px, 32 px, and 48 px bitmap layers for legacy fallback support.
- `public/super-hn-terminal-v1-32.png` gives Safari an explicit small raster icon.
- `public/super-hn-terminal-v1-apple.png` provides the 180 px Apple touch icon.
- `public/super-hn-terminal-v1-mask.svg` provides the monochrome Safari pinned-tab mask.
- `public/super-hn-terminal-v1-192.png` and `public/super-hn-terminal-v1-512.png` provide installable web app icons; the 512 px asset is maskable.

Repository artwork is stored as lossless, opaque PNG. The README uses a 1800 × 600 E-ink banner set in the same Geist Pixel Square face as the application and a browser-captured high-resolution application screenshot; the SVG banner source is retained alongside the rendered image.

The generated web app manifest uses the light E-ink canvas for its theme and launch background colors. Page metadata also supplies canonical URLs, Open Graph images, Twitter cards, JSON-LD, a sitemap, and robots rules.

## Verification

Run the standard checks before publishing:

```sh
bun run lint
bun run test
bun run build
```
