import { defineMiddleware } from "astro:middleware";
import { cacheHtml } from "~/lib/cache";
import { redirectHttp, redirectLegacy } from "~/lib/redirect";
import { secureResponse } from "~/lib/response";
import { isTopicName, parsePage } from "~/lib/route";
import { addServerTiming } from "~/lib/timing";

const CACHEABLE_ROUTE =
  /^\/(?:ask|new|show|top)(?:\/\d+)?$|^\/post\/\d+$|^\/user\/[^/]+$|^\/sitemap\.xml$/u;

function withRenderTiming(response: Response, durationMs: number) {
  const headers = new Headers(response.headers);
  addServerTiming(headers, "render", durationMs);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const isHttps = context.url.protocol === "https:";
  const secure = (response: Response) => secureResponse(response, isHttps);
  const legacyRedirect = redirectLegacy(context.url);
  if (legacyRedirect !== null) return secure(legacyRedirect);
  const httpRedirect = redirectHttp(context.url);
  if (httpRedirect !== null) return secure(httpRedirect);

  const isCacheable =
    context.request.method === "GET" &&
    CACHEABLE_ROUTE.test(context.url.pathname);
  if (!isCacheable) {
    return secure(await next());
  }
  if (context.url.search.length > 0) {
    const topicName = context.url.pathname.slice(1);
    const page = parsePage(context.url.searchParams.get("page") ?? undefined);
    if (isTopicName(topicName) && page !== null && page > 1) {
      return secure(context.redirect(`/${topicName}/${page}`, 308));
    }

    return secure(context.redirect(context.url.pathname, 308));
  }

  const start = performance.now();
  const response = await next();
  const durationMs = Math.round((performance.now() - start) * 10) / 10;
  const cfPlacement = context.request.headers.get("cf-placement");
  console.info(
    JSON.stringify({
      ...(cfPlacement === null ? {} : { cfPlacement }),
      durationMs,
      event: "hn.render",
      path: context.url.pathname,
      status: response.status,
    }),
  );

  return secure(cacheHtml(withRenderTiming(response, durationMs)));
});
