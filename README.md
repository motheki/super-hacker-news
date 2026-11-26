# Super HN

![Super HN black-and-white gourd emblem](src/assets/super-hn-social.png)

A small, server-rendered Hacker News reader built with [Astro](https://astro.build) and deployed on Cloudflare Workers at [superhn.org](https://superhn.org).

Top, new, Ask HN, and Show HN feeds; story search; nested comments with native disclosure controls; comment permalinks; user profiles; pure-white light mode, black dark mode, and system serif typography.

Reading styles use 16px body and comment text with 1.65 line spacing, 18px feed titles, 22px discussion titles, ink and muted-gray text, and 32px side padding around a centered column. Comments use compact paragraph gaps and a consistent 12px reply indent. Post cards and reply indentation guides have dotted borders: white in dark mode and dark ink in light mode. The light palette uses pure-white page and card backgrounds (`#FFFFFF`), `#2C2D30` text, and `#595A5D` secondary text; dark mode uses a pure black background, `#F5F3EE` text, and `#A6A5A2` secondary text, with identical spacing and padding.

The top toolbar inverts the theme: pure black with white text, icons, and dotted border in light mode; pure white with black text, icons, and dotted border in dark mode. The logo uses the matching contrast variant. The selected topic is underlined, and hovered or pressed controls gain an inset outline while retaining the toolbar colors.

The header is a sticky rounded toolbar with topic links centered between the logo and the search and GitHub icons. Cards and toolbar controls share a 12px corner radius. Toolbar controls remain 44px tall; narrower screens use smaller text and artwork to keep the toolbar on one row. Story metadata aligns with the title beside the rank number at every screen size, with the author shown as muted text before points and age. Feed ranks use the primary text color, and dotted dividers meet the card borders. The entire feed footer links to comments, with centered 18px text and a 20px icon, no inset button, and at least a 48px tap target. Comment footers invert with the theme: pure black with white text and icons in light mode, and pure white with black text and icons in dark mode, including hover and pressed states. Discussion header cards omit this footer and separate any included post body with a full-width dotted line. Link interaction and selection highlights use neutral theme colors. Comment anchors clear the sticky toolbar.

Code blocks in posts, comments, and profiles render through [Astro's `<Prism />` component](https://docs.astro.build/en/guides/syntax-highlighting/#prism-) as inset blocks that keep their indentation and scroll sideways instead of wrapping. Hacker News code carries no language, so `src/lib/code.ts` guesses one from the text and falls back to plain, unhighlighted text when unsure; indented quotes of ordinary prose wrap instead of scrolling. `src/styles/prism.css` colors tokens in shades of gray mixed from the theme's text color, with weight and slant for keywords and comments, so highlighting stays monochrome in both color schemes. The Prism grammars load on demand and add about 270 KiB (gzip) to the Worker upload.

## Search

`/search` searches Hacker News stories through the [Algolia HN Search API](https://hn.algolia.com/api). The page renders on the server from its URL: `q` holds the query, `sort=date` orders by newest instead of relevance, `range` limits results to the past `day`, `week`, `month`, or `year`, and `page` paginates 30 results at a time up to Algolia's 1,000-hit limit. Default values are left out of the URL so equal searches share one cache entry. The query also accepts Algolia's advanced syntax: `author:pg` (or `by:pg`), `story:ID`, `points>N`, `comments>N`, `date>UNIX_TIME`, and quoted phrases. Matched words in titles are underlined.

The search form works without JavaScript. With JavaScript, a small page script searches as you type after a 300ms pause, replacing the history entry so Back leaves search instead of replaying keystrokes. Changing the range or sort adds a history entry. Results load through Astro's client router; the input uses `transition:persist` so it keeps focus and caret position while results swap in. Pages with a query are marked `noindex`, and each canonicalizes to `/search`.

## Development

Use Bun 1.4.4 and Node.js 22.12+. The `packageManager` field pins Bun for Cloudflare Workers Builds so frozen installs can read the repository's lockfile format.

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

- `src/pages/`: file-based routes. One feed route handles both the first page and pagination. Robots and the web manifest are prerendered; feeds, discussions, profiles, and search render on demand.
- `src/layouts/` and `src/components/`: server-rendered HTML, shared metadata, native comment controls, highlighted code blocks, and Astro's client router. No component framework.
- `src/lib/`: route validation, response policies, and Hacker News data access. HackerWeb is the fast path; Algolia and bounded official API reconstruction provide fallbacks.
- `src/assets/` and `src/styles/`: monochrome logo, light/dark favicons and header icons, app icons, README/social artwork, and shared styles. Imported images use content-hashed URLs; the ICO favicon has a versioned URL. Text uses system serif fonts, with system monospace fonts for code; no font downloads.
- `astro.config.ts`: Cloudflare adapter, edge cache rules, inlined styles, and intent-based prefetching. The shared stylesheet is small, so `build.inlineStylesheets: "always"` puts it in each page instead of a render-blocking request. Full-document speculative prerendering is disabled because navigation uses Astro's client router.

Astro's Cloudflare cache provider caches feeds and search results for one minute and profiles for 15 minutes, with stale-while-revalidate. Discussion cache lifetimes increase with age. Search requests ask Algolia for only the fields the page renders, and the Worker caches those responses for one minute. Empty bulk comment trees are verified against the official API before being accepted. A separate, data-center-local Cache API store retains successful discussions for up to one hour, used only when providers fail; restored pages are not cached again. Missing/deleted posts clear that fallback. Errors are uncached; upstream outages without a usable fallback return a retryable 503. Static assets use `public/_headers`; middleware applies dynamic response headers.

## Navigation transitions

Follow [Astro's view transitions guide](https://docs.astro.build/en/guides/view-transitions/): the shared layout uses `ClientRouter`, explicit `transition:name` directives, and `fade({ duration: "120ms" })` on the main content. Topic changes, pagination, discussions, profiles, and browser back/forward use the same brief crossfade; these reading views do not imply a left/right spatial order. The header stays steady while its selected topic updates. Browser-generated group geometry animations are disabled so changes in content height or restored scroll position cannot stretch the page or outlast the fade.

Astro handles history and scroll restoration, same-page comment anchors, external links, and route announcements. Comment anchors move within the current page without a page transition. Reduced-motion preferences disable animations, and `fallback="swap"` changes content immediately in browsers without view transition support. Keep these behaviors in Astro's router when changing navigation.

## Attribution and license

Based on [Better HN](https://github.com/pajecawav/better-hn) by [pajecawav](https://github.com/pajecawav). Original copyright retained. [MIT](LICENSE).
