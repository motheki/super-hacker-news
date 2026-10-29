import type { APIRoute } from "astro";
import { getBuildSnapshot } from "~/lib/build-snapshot";
import { snapshotPages } from "~/lib/snapshot";
import { SITE_URL } from "~/lib/site";
export const GET: APIRoute = async () => {
  const snapshot = await getBuildSnapshot();
  const paths = ["/search", ...snapshotPages(snapshot).map(({ params }) => `/${params.topicName}${params.page ? `/${params.page}` : ""}`), ...snapshot.stories.map(({ id }) => `/post/${id}`)];
  const entries = paths.map((path) => `<url><loc>${SITE_URL}${path}</loc><lastmod>${snapshot.builtAt}</lastmod></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, { headers: { "content-type": "application/xml; charset=utf-8" } });
};
