import { readSearchState, searchOptions, searchUrl, type SearchState } from "~/lib/search/state";
import { formatAge } from "~/lib/hacker-news/format";

interface SearchHit {
  readonly url: string;
  readonly meta: Record<string, string>;
}
interface SearchResult { data(): Promise<SearchHit>; }
interface Pagefind {
  search(query: string, options: ReturnType<typeof searchOptions>): Promise<{ results: SearchResult[] }>;
}

const form = document.querySelector<HTMLFormElement>("#search-form")!;
const input = document.querySelector<HTMLInputElement>("#search-query")!;
const range = document.querySelector<HTMLSelectElement>("#search-range")!;
const sort = document.querySelector<HTMLSelectElement>("#search-sort")!;
const status = document.querySelector<HTMLElement>("#search-status")!;
const results = document.querySelector<HTMLElement>("#search-results")!;
const more = document.querySelector<HTMLButtonElement>("#search-more")!;
const retry = document.querySelector<HTMLButtonElement>("#search-retry")!;
const PAGE_SIZE = 20;
let modulePromise: Promise<Pagefind> | undefined;
let importAttempt = 0;
let generation = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let matches: SearchResult[] = [];
let displayed = 0;

function getPagefind() {
  const url = `/pagefind/pagefind.js${importAttempt ? `?retry=${importAttempt}` : ""}`;
  modulePromise ??= import(/* @vite-ignore */ url).catch((error) => {
    modulePromise = undefined;
    importAttempt++;
    throw error;
  });
  return modulePromise!;
}
function currentState(): SearchState {
  return readSearchState(new URLSearchParams({ q: input.value, range: range.value, sort: sort.value }));
}
function setState(state: SearchState) {
  input.value = state.query;
  range.value = state.range;
  sort.value = state.sort;
}
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className?: string) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

async function showMore(token: number) {
  more.disabled = true;
  try {
    const hits = await Promise.all(matches.slice(displayed, displayed + PAGE_SIZE).map((match) => match.data()));
    if (token !== generation) return;
    const fragment = document.createDocumentFragment();
    for (const [index, hit] of hits.entries()) {
      const path = new URL(hit.url, location.origin);
      // Index content is external data: never render its markup or unsafe links.
      if (path.origin !== location.origin || !/^\/post\/[1-9]\d*\/?$/.test(path.pathname)) continue;
      fragment.append(node("span", String(displayed + index + 1), "feed-index"));
      const article = node("article", "", "feed-item");
      const title = node("h2", "");
      const link = node("a", hit.meta.title ?? "Untitled story", "story-link");
      link.href = path.pathname.replace(/\/$/, "");
      title.append(link);
      if (hit.meta.domain) title.append(node("span", ` (${hit.meta.domain})`, "faint domain"));
      const time = Number(hit.meta.time);
      const age = Number.isFinite(time) ? formatAge(time, Math.floor(Date.now() / 1000)) : "";
      const meta = node("p", `${hit.meta.points ?? 0} points by ${hit.meta.user || "unknown"} ${age} | ${hit.meta.comments ?? 0} comments`, "meta");
      article.append(title, meta);
      fragment.append(article);
    }
    results.append(fragment);
    displayed += hits.length;
    more.hidden = displayed >= matches.length;
    status.textContent = matches.length === 0 ? "No results found in this snapshot. Try another word or time range." : `${matches.length} ${matches.length === 1 ? "result" : "results"}. Showing ${displayed}.`;
  } finally {
    if (token === generation) more.disabled = false;
  }
}
function failed(token: number) {
  if (token !== generation) return;
  status.textContent = import.meta.env.DEV
    ? "Search could not load. Build the site first to create its search index, then try again."
    : "Search could not load. Please try again.";
  retry.hidden = false;
}
async function search() {
  clearTimeout(timer);
  const token = ++generation;
  const state = currentState();
  history.replaceState(null, "", searchUrl(state));
  document.title = state.query ? `Search: ${state.query} | Super HN` : "Search | Super HN";
  results.replaceChildren();
  matches = [];
  displayed = 0;
  more.hidden = true;
  more.disabled = false;
  retry.hidden = true;
  if (!state.query) {
    status.textContent = "Enter a word or phrase to search.";
    return;
  }
  status.textContent = "Searching…";
  try {
    const pagefind = await getPagefind();
    if (token !== generation) return;
    const found = await pagefind.search(state.query, searchOptions(state));
    if (token !== generation) return;
    matches = found.results;
    await showMore(token);
  } catch {
    failed(token);
  }
}
form.addEventListener("submit", (event) => { event.preventDefault(); void search(); });
input.addEventListener("input", () => {
  ++generation; // Invalidate in-flight results immediately, before the debounce expires.
  clearTimeout(timer);
  more.hidden = true;
  timer = setTimeout(() => void search(), 250);
});
range.addEventListener("change", () => void search());
sort.addEventListener("change", () => void search());
form.addEventListener("reset", (event) => {
  event.preventDefault();
  setState({ query: "", range: "all", sort: "relevance" });
  void search();
  input.focus();
});
more.addEventListener("click", () => {
  const token = generation;
  void showMore(token).catch(() => failed(token));
});
retry.addEventListener("click", () => void search());
window.addEventListener("popstate", () => {
  setState(readSearchState(new URLSearchParams(location.search)));
  void search();
});
setState(readSearchState(new URLSearchParams(location.search)));
void search();
void fetch("/pagefind/snapshot.json").then(async (response) => {
  if (!response.ok) return;
  const snapshot = await response.json() as { builtAt: string; count: number };
  const date = new Date(snapshot.builtAt);
  const target = document.querySelector("#search-snapshot");
  if (target && Number.isSafeInteger(snapshot.count) && !Number.isNaN(date.getTime())) {
    target.textContent = `${snapshot.count} stories indexed ${date.toLocaleString()}. Time ranges are relative to this snapshot.`;
  }
}).catch(() => undefined);
