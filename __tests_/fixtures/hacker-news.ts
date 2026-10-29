import { createHackerNewsClient } from "../../src/lib/hacker-news/official";
import { RequestBudget } from "../../src/lib/hacker-news/budget";
import type { OfficialItem } from "../../src/lib/hacker-news/codec";

export const STORY: OfficialItem = {
  id: 1, type: "story", title: "Building a search engine", by: "alice",
  time: 1_700_000_000, score: 42, descendants: 2000, kids: [2, 3],
  url: "https://example.com/search", text: "<p>Astro and Pagefind</p>",
};
export function fixtureClient(data: Record<string, unknown>, limit = 50) {
  const paths: string[] = [];
  const budget = new RequestBudget(limit);
  const client = createHackerNewsClient({
    budget, report: () => {}, sleep: () => Promise.resolve(),
    fetcher: async (input) => {
      const url = new URL(String(input));
      if (url.origin !== "https://hacker-news.firebaseio.com") throw new Error("Nonofficial upstream");
      const path = url.pathname.replace("/v0/", "").replace(/\.json$/, "");
      paths.push(path);
      const value = data[path] ?? null;
      if (value instanceof Error) throw value;
      return Response.json(value);
    },
  });
  return { client, paths, budget };
}
