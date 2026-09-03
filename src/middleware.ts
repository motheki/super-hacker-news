import { defineMiddleware } from "astro:middleware";
import { cacheHtml } from "~/lib/cache";

const CACHEABLE_ROUTE =
  /^\/(?:ask|new|show|top)(?:\/\d+)?$|^\/post\/\d+$|^\/user\/[^/]+$|^\/sitemap\.xml$/u;

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.request.method !== "GET") return next();
  if (!CACHEABLE_ROUTE.test(context.url.pathname)) return next();
  if (context.url.search.length > 0) {
    return context.redirect(context.url.pathname, 308);
  }

  return cacheHtml(await next());
});
