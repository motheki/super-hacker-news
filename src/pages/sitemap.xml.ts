import type { APIRoute } from "astro";
import { getBestStoryIds } from "~/lib/data";
import { SITE_URL } from "~/lib/site";
import { env } from "cloudflare:workers";

const ROUTES = ["top", "new", "ask", "show"] as const;

export const GET: APIRoute = async () => {
  let ids: number[] = [];
  try {
    ids = (await getBestStoryIds(env.HN_DATA)) ?? [];
  } catch (error) {
    console.error("Unable to include story URLs in the sitemap", error);
  }

  const urls = [
    ...ROUTES.map((route) => `${SITE_URL}/${route}`),
    ...ids.map((id) => `${SITE_URL}/post/${id}`),
  ];
  const entries = urls
    .map((url) => `<url><loc>${url}</loc><changefreq>hourly</changefreq></url>`)
    .join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
