# Super HN

Super HN is a fast, focused, and responsive interface for browsing Hacker News, built with the Next.js App Router.

- [Live application](https://super-hacker-news.vercel.app)
- [Source repository](https://github.com/motheki/super-hacker-news)
- [Issue tracker](https://github.com/motheki/super-hacker-news/issues)

## Features

- Top, new, Ask HN, and Show HN feeds
- Story pages with nested, collapsible comment threads
- Hacker News user profiles with links to submissions, comments, and favorites
- Light and dark themes that follow or override the system preference
- Native sharing where supported, Hacker News search, and responsive navigation
- Installable app metadata, route-level loading states, and native view transitions

## Development

Install dependencies with [Aube](https://github.com/jdx/aube), then start the Next.js development server:

```sh
aube install
aube run dev
```

Before submitting changes, run:

```sh
aube run lint
aube run test
aube run build
```

## Architecture

The application uses the Next.js App Router and React Server Components by default. Route-level `loading.tsx`, `error.tsx`, and `not-found.tsx` boundaries handle navigation states. Public API reads use Cache Components with `use cache`, explicit `cacheLife` policies, and cache tags; Partial Prefetching reuses route shells while selected topic links resolve URL-specific data ahead of navigation. Client components are limited to interactive UI islands, and navigation uses React's View Transition primitives.

## Attribution

Super HN is based on [Better HN (Better Hacker News)](https://github.com/pajecawav/better-hn) by [pajecawav](https://github.com/pajecawav). The original project's copyright notice and MIT license are preserved in this repository.

## License

Super HN is distributed under the [MIT License](LICENSE), inherited from the original [Better HN license](https://github.com/pajecawav/better-hn/blob/master/LICENSE).
