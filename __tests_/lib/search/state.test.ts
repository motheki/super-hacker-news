import { expect, test } from "bun:test";
import { readSearchState, searchOptions, searchUrl } from "../../../src/lib/search/state";

test("search URLs round-trip queries, filters and sorting without retaining tracking params", () => {
  const state = readSearchState(new URLSearchParams("q=Astro+%26+HN&range=week&sort=date&utm_source=test"));
  expect(state).toEqual({ query: "Astro & HN", range: "week", sort: "date" });
  expect(searchUrl(state)).toBe("/search?q=Astro+%26+HN&range=week&sort=date");
  expect(searchOptions(state)).toEqual({ filters: { range: "week" }, sort: { date: "desc" } });
});
test("invalid options normalize to defaults, and clearing restores the canonical search URL", () => {
  const state = readSearchState(new URLSearchParams("q=+&range=invalid&sort=invalid"));
  expect(searchUrl(state)).toBe("/search");
  expect(searchOptions(state)).toEqual({});
});
