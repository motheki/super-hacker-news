import { defineMiddleware } from "astro:middleware";

const FEED_CACHE_SECONDS = 30;
const POST_CACHE_SECONDS = 15;
const PROFILE_CACHE_SECONDS = 900;
const SITEMAP_CACHE_SECONDS = 3_600;

interface EdgeContext {
  readonly waitUntil: (promise: Promise<unknown>) => void;
}

function cacheTtl(pathname: string) {
  if (/^\/(?:top|new|ask|show)$/u.test(pathname)) return FEED_CACHE_SECONDS;
  if (/^\/post\/\d+$/u.test(pathname)) return POST_CACHE_SECONDS;
  if (/^\/user\/[^/]+$/u.test(pathname)) return PROFILE_CACHE_SECONDS;
  if (pathname === "/sitemap.xml") return SITEMAP_CACHE_SECONDS;

  return null;
}

function cachedResponse(response: Response, state: "hit" | "miss") {
  const headers = new Headers(response.headers);
  headers.set("x-super-hn-cache", state);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.request.method !== "GET") return next();

  const ttl = cacheTtl(context.url.pathname);
  if (ttl === null) return next();

  const cache = caches.default;
  const cacheKey = new Request(context.request.url, { method: "GET" });
  const hit = await cache.match(cacheKey).catch((error: unknown) => {
    console.warn("edge.cache_match", { error: String(error) });

    return undefined;
  });
  if (hit !== undefined) return cachedResponse(hit, "hit");

  const response = await next();
  const headers = new Headers(response.headers);
  headers.set(
    "cache-control",
    `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${ttl}`,
  );
  headers.set("x-super-hn-cache", "miss");
  const result = new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });

  if (result.ok) {
    // Cache writes finish after the response leaves the edge.
    const edgeContext = context.locals.cfContext as EdgeContext;
    edgeContext.waitUntil(
      cache.put(cacheKey, result.clone()).catch((error: unknown) => {
        console.warn("edge.cache_put", { error: String(error) });
      }),
    );
  }

  return result;
});
