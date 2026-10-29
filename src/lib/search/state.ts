export const RANGES = ["all", "day", "week", "month", "year"] as const;
export type SearchRange = (typeof RANGES)[number];
export interface SearchState { readonly query: string; readonly range: SearchRange; readonly sort: "relevance" | "date"; }
export function readSearchState(params: URLSearchParams): SearchState {
  const range = params.get("range") ?? "all";
  return {
    query: (params.get("q") ?? "").trim().slice(0, 500),
    range: RANGES.includes(range as SearchRange) ? range as SearchRange : "all",
    sort: params.get("sort") === "date" ? "date" : "relevance",
  };
}
export function searchUrl(state: SearchState) {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.range !== "all") params.set("range", state.range);
  if (state.sort !== "relevance") params.set("sort", state.sort);
  return `/search${params.size ? `?${params}` : ""}`;
}
export function searchOptions(state: SearchState) {
  return {
    ...(state.range === "all" ? {} : { filters: { range: state.range } }),
    ...(state.sort === "date" ? { sort: { date: "desc" as const } } : {}),
  };
}
