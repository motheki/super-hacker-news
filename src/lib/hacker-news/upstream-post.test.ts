import { describe, expect, spyOn, test } from "bun:test";
import { aggregatedProvider } from "./aggregated";
import { getAlgoliaPost } from "./algolia";
import { RequestBudget } from "./budget";

const providers = [
  {
    name: "HackerWeb",
    getPost: aggregatedProvider.getPost,
    timeoutMs: 3_000,
    url: "https://api.hackerwebapp.com/item/42",
  },
  {
    name: "Algolia",
    getPost: getAlgoliaPost,
    timeoutMs: 5_000,
    url: "https://hn.algolia.com/api/v1/items/42",
  },
];

describe.each(providers)("$name bulk posts", ({ getPost, timeoutMs, url }) => {
  test("uses the longer timeout and preserves missing-resource results", async () => {
    const timeout = spyOn(AbortSignal, "timeout");
    const fetcher = spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    const log = spyOn(console, "info").mockImplementation(() => {});
    const budget = new RequestBudget(10);
    try {
      expect(await getPost(42, budget)).toBeNull();
      expect(timeout).toHaveBeenCalledTimes(1);
      expect(timeout).toHaveBeenCalledWith(timeoutMs);
      expect(fetcher).toHaveBeenCalledWith(url, expect.objectContaining({ signal: expect.any(AbortSignal) }));
      expect(budget.snapshot().subrequestsUsed).toBe(1);
    } finally {
      timeout.mockRestore();
      fetcher.mockRestore();
      log.mockRestore();
    }
  });

  test.each(["network", "http"])("does not retry a %s failure", async (kind) => {
    const fetcher = spyOn(globalThis, "fetch");
    if (kind === "network") {
      fetcher.mockRejectedValue(new TypeError("fetch failed"));
    } else {
      fetcher.mockResolvedValue(new Response(null, { status: 503 }));
    }
    const log = spyOn(console, "info").mockImplementation(() => {});
    const budget = new RequestBudget(10);
    try {
      await expect(getPost(42, budget)).rejects.toThrow("Upstream request failed");
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(budget.snapshot().subrequestsUsed).toBe(1);
    } finally {
      fetcher.mockRestore();
      log.mockRestore();
    }
  });
});
