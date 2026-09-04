const ACTIVE_POST_SECONDS = 86_400;
const ARCHIVED_POST_SECONDS = 30 * ACTIVE_POST_SECONDS;
const BROWSER_MAX_AGE_SECONDS = 15;
const HTML_CONTENT_TYPE = "text/html";

interface CachePolicy {
  readonly maxAge: number;
  readonly swr: number;
}

const ACTIVE_POST_CACHE: CachePolicy = { maxAge: 60, swr: 10 };
const SETTLED_POST_CACHE: CachePolicy = { maxAge: 300, swr: 3_600 };
const ARCHIVED_POST_CACHE: CachePolicy = { maxAge: 3_600, swr: 86_400 };

export const HTML_CACHE_CONTROL =
  `public, max-age=${BROWSER_MAX_AGE_SECONDS}` as const;

export function cacheHtml(response: Response) {
  const contentType = response.headers.get("content-type");
  if (!response.ok) return response;
  if (contentType?.startsWith(HTML_CONTENT_TYPE) !== true) return response;
  if (response.headers.has("cache-control")) return response;

  const headers = new Headers(response.headers);
  headers.set("cache-control", HTML_CACHE_CONTROL);

  // Keep the response streaming while making browser caching explicit.
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export function getPostCache(postTime: number, now: number): CachePolicy {
  const age = Math.max(0, now - postTime);
  if (age < ACTIVE_POST_SECONDS) return ACTIVE_POST_CACHE;
  if (age < ARCHIVED_POST_SECONDS) return SETTLED_POST_CACHE;

  return ARCHIVED_POST_CACHE;
}
