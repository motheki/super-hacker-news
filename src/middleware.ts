import { defineMiddleware } from "astro:middleware";
import { cacheHtml } from "~/lib/cache";
import { isTopicName, parsePage } from "~/lib/route";

const CACHEABLE_ROUTE =
  /^\/(?:ask|new|show|top)(?:\/\d+)?$|^\/post\/\d+$|^\/user\/[^/]+$|^\/sitemap\.xml$/u;

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

  return cacheHtml(await next());
});
