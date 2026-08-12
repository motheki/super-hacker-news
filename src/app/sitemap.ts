import type { MetadataRoute } from "next";
import { getBestStoryIds } from "~/lib/data";
import { SITE_URL } from "~/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let ids: number[] = [];
  try {
    ids = (await getBestStoryIds()) ?? [];
  } catch (error) {
    console.error("Unable to include story URLs in the sitemap", error);
  }
  const routes = ["top", "new", "ask", "show"];

  return [
    ...routes.map((route) => ({
      url: `${SITE_URL}/${route}`,
      changeFrequency: "hourly" as const,
    })),
    ...ids.map((id) => ({
      url: `${SITE_URL}/post/${id}`,
      changeFrequency: "hourly" as const,
    })),
  ];
}
