import { defineMiddleware } from "astro:middleware";
import { cacheHtml } from "~/lib/cache";
import { redirectHttp, redirectLegacy } from "~/lib/redirect";
import { secureResponse } from "~/lib/response";
import { canonicalRoute, isCacheablePath } from "~/lib/route";
import { addServerTiming } from "~/lib/timing";

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
  const secure = (response: Response) => {
    const secured = secureResponse(response, isHttps);
    if (!response.ok) {
      context.cache.set(false);
      secured.headers.set("cache-control", "no-store");
    }
    return secured;
  };
  const legacyRedirect = redirectLegacy(context.url);
  if (legacyRedirect !== null) return secure(legacyRedirect);
  const httpRedirect = redirectHttp(context.url);
  if (httpRedirect !== null) return secure(httpRedirect);

  const isCacheable =
    (context.request.method === "GET" || context.request.method === "HEAD") &&
    isCacheablePath(context.url.pathname);
  if (!isCacheable) {
    return secure(await next());
  }
  const canonical = canonicalRoute(context.url);
  if (canonical !== null) {
    return secure(context.redirect(canonical, 308));
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
