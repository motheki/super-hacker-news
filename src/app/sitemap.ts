import type { MetadataRoute } from "next";
import { getBestStoryIds } from "~/lib/data";
import { SITE_URL } from "~/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const ids = (await getBestStoryIds()) ?? [];
	const routes = ["top", "new", "ask", "show"];

	return [
		...routes.map(route => ({
			url: `${SITE_URL}/${route}`,
			changeFrequency: "hourly" as const,
		})),
		...ids.map(id => ({ url: `${SITE_URL}/post/${id}`, changeFrequency: "hourly" as const })),
	];
}
