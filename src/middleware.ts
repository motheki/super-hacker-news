import { defineMiddleware } from "astro:middleware";
import { cacheHtml } from "~/lib/cache";
import { isTopicName, parsePage } from "~/lib/route";

const CACHEABLE_ROUTE =
  /^\/(?:ask|new|show|top)(?:\/\d+)?$|^\/post\/\d+$|^\/user\/[^/]+$|^\/sitemap\.xml$/u;

function withRenderTiming(response: Response, durationMs: number) {
  const headers = new Headers(response.headers);
  const timing = `render;dur=${durationMs}`;
  const previous = headers.get("server-timing");
  headers.set(
    "server-timing",
    previous === null ? timing : `${previous}, ${timing}`,
  );

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.request.method !== "GET") return next();
  if (!CACHEABLE_ROUTE.test(context.url.pathname)) return next();
  if (context.url.search.length > 0) {
    const topicName = context.url.pathname.slice(1);
    const page = parsePage(context.url.searchParams.get("page") ?? undefined);
    if (isTopicName(topicName) && page !== null && page > 1) {
      return context.redirect(`/${topicName}/${page}`, 308);
    }

    return context.redirect(context.url.pathname, 308);
  }

  const start = performance.now();
  const response = await next();
  const durationMs = Math.round((performance.now() - start) * 10) / 10;
  const cfPlacement = response.headers.get("cf-placement");
  console.info(
    JSON.stringify({
      ...(cfPlacement === null ? {} : { cfPlacement }),
      durationMs,
      event: "hn.render",
      path: context.url.pathname,
      status: response.status,
    }),
  );

  return cacheHtml(withRenderTiming(response, durationMs));
});
