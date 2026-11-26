import { fetchJson } from "~/lib/hacker-news/client";
import { formatAge, getDomain } from "~/lib/hacker-news/format";
import type { TopicItem } from "~/lib/topic";

const ALGOLIA_API = "https://hn.algolia.com/api/v1";
const SEARCH_CACHE_SECONDS = 60;
const SEARCH_TIMEOUT_MS = 4_000;
// Algolia stops paginating after 1,000 hits.
const MAX_HITS = 1_000;

export const HITS_PER_PAGE = 30;
export const MAX_SEARCH_PAGE = Math.ceil(MAX_HITS / HITS_PER_PAGE);
export const MAX_QUERY_LENGTH = 200;

export const SEARCH_SORTS = ["relevance", "date"] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const SEARCH_RANGES = [
  { value: "all", label: "All time", seconds: 0 },
  { value: "day", label: "Past 24 hours", seconds: 86_400 },
  { value: "week", label: "Past week", seconds: 7 * 86_400 },
  { value: "month", label: "Past month", seconds: 30 * 86_400 },
  { value: "year", label: "Past year", seconds: 365 * 86_400 },
] as const;
export type SearchRange = (typeof SEARCH_RANGES)[number]["value"];

export interface SearchParams {
  readonly query: string;
  readonly sort: SearchSort;
  readonly range: SearchRange;
  /** One-based page number. */
  readonly page: number;
}

/** A piece of a result title; `match` marks the words Algolia matched. */
export interface TitleSegment {
  readonly text: string;
  readonly match: boolean;
}

export interface SearchItem extends TopicItem {
  readonly titleSegments?: readonly TitleSegment[];
}

export interface SearchResults {
  readonly items: readonly SearchItem[];
  readonly totalHits: number;
  readonly totalPages: number;
}

interface ParsedQuery {
  readonly query: string;
  readonly tags: readonly string[];
  readonly numericFilters: readonly string[];
}

const isSearchSort = (value: string): value is SearchSort =>
  (SEARCH_SORTS as readonly string[]).includes(value);

const isSearchRange = (value: string): value is SearchRange =>
  SEARCH_RANGES.some((range) => range.value === value);

/** Read search state from a URL, falling back to defaults for anything unknown. */
export function readSearchParams(url: URL): SearchParams | null {
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const sort = url.searchParams.get("sort") ?? "";
  const range = url.searchParams.get("range") ?? "";
  const pageValue = url.searchParams.get("page");
  let page = 1;
  if (pageValue !== null && pageValue !== "") {
    if (!/^[1-9]\d{0,2}$/u.test(pageValue)) return null;
    page = Number(pageValue);
    if (page > MAX_SEARCH_PAGE) return null;
  }

  return {
    query,
    sort: isSearchSort(sort) ? sort : "relevance",
    range: isSearchRange(range) ? range : "all",
    page,
  };
}

/** Build a /search URL that omits default values, so equal searches share a cache entry. */
export function searchHref(params: Partial<SearchParams>) {
  const search = new URLSearchParams();
  if (params.query) search.set("q", params.query);
  if (params.sort !== undefined && params.sort !== "relevance") search.set("sort", params.sort);
  if (params.range !== undefined && params.range !== "all") search.set("range", params.range);
  if (params.page !== undefined && params.page > 1) search.set("page", String(params.page));
  const value = search.toString();

  return value.length > 0 ? `/search?${value}` : "/search";
}

/**
 * Advanced syntax from hn.algolia.com/help:
 *   author:NAME or by:NAME          -> author_NAME tag
 *   story:ID                        -> story_ID tag
 *   points>N, comments>N, date>N    -> numeric filters (also <, <=, >=, =)
 * Quoted phrases and unrecognized tokens stay in the text query.
 */
const ADVANCED_TOKEN_REGEXP =
  /^(author|by|story|points|comments|date)(:|<=|>=|<|>|=)([A-Za-z0-9_-]+)$/iu;
const NUMERIC_FIELDS = {
  comments: "num_comments",
  date: "created_at_i",
  points: "points",
} as const;

export function parseAdvancedQuery(raw: string): ParsedQuery {
  const tags: string[] = [];
  const numericFilters: string[] = [];
  const words: string[] = [];

  for (const token of raw.match(/"[^"]*"|\S+/gu) ?? []) {
    const match = token.startsWith('"') ? null : ADVANCED_TOKEN_REGEXP.exec(token);
    const [, rawKey = "", operator = "", value = ""] = match ?? [];
    const key = rawKey.toLowerCase();

    if ((key === "author" || key === "by") && operator === ":") {
      tags.push(`author_${value}`);
    } else if (key === "story" && operator === ":" && /^\d+$/u.test(value)) {
      tags.push(`story_${value}`);
    } else if (
      (key === "points" || key === "comments" || key === "date") &&
      operator !== ":" &&
      /^\d+$/u.test(value)
    ) {
      numericFilters.push(`${NUMERIC_FIELDS[key]}${operator}${value}`);
    } else {
      words.push(token);
    }
  }

  return { query: words.join(" "), tags, numericFilters };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const HIGHLIGHT_TAG_REGEXP = /<\/?em>/gu;

/** Split Algolia's `<em>` markup into text segments, or give up if it doesn't match the title. */
export function toTitleSegments(title: string, highlighted: unknown) {
  if (typeof highlighted !== "string" || !highlighted.includes("<em>")) return undefined;
  if (highlighted.replaceAll(HIGHLIGHT_TAG_REGEXP, "") !== title) return undefined;

  const segments: TitleSegment[] = [];
  let match = false;
  for (const part of highlighted.split(/(<\/?em>)/u)) {
    if (part === "<em>") match = true;
    else if (part === "</em>") match = false;
    else if (part.length > 0) segments.push({ text: part, match });
  }

  return segments;
}

function parseHit(value: unknown, now: number): SearchItem | null {
  if (!isRecord(value) || typeof value.objectID !== "string") return null;
  const id = Number(value.objectID);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const title = typeof value.title === "string" && value.title.length > 0 ? value.title : null;
  if (title === null) return null;
  const time = typeof value.created_at_i === "number" ? value.created_at_i : now;
  const url = typeof value.url === "string" && value.url.length > 0 ? value.url : undefined;
  const domain = getDomain(url);
  const highlight = isRecord(value._highlightResult) ? value._highlightResult.title : undefined;
  const titleSegments = toTitleSegments(
    title,
    isRecord(highlight) ? highlight.value : undefined,
  );

  return {
    id,
    title,
    points: typeof value.points === "number" ? value.points : null,
    user: typeof value.author === "string" ? value.author : null,
    time,
    time_ago: formatAge(time, now),
    comments_count: typeof value.num_comments === "number" ? value.num_comments : 0,
    type: "story",
    ...(url === undefined ? {} : { url }),
    ...(domain === undefined ? {} : { domain }),
    ...(titleSegments === undefined ? {} : { titleSegments }),
  };
}

export function parseSearchResponse(value: unknown, now: number): SearchResults | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.hits) ||
    typeof value.nbHits !== "number" ||
    typeof value.nbPages !== "number"
  ) {
    return null;
  }

  const items: SearchItem[] = [];
  for (const hit of value.hits) {
    const item = parseHit(hit, now);
    if (item !== null) items.push(item);
  }

  return {
    items,
    totalHits: value.nbHits,
    totalPages: Math.min(value.nbPages, MAX_SEARCH_PAGE),
  };
}

/** Build the Algolia request; `now` is rounded so range filters share an upstream cache entry. */
export function buildSearchUrl(params: SearchParams, now: number) {
  const parsed = parseAdvancedQuery(params.query);
  const endpoint = params.sort === "date" ? "search_by_date" : "search";
  const search = new URLSearchParams({
    query: parsed.query,
    tags: ["story", ...parsed.tags].join(","),
    hitsPerPage: String(HITS_PER_PAGE),
    page: String(params.page - 1),
    // Hits otherwise carry every comment id; we only render these fields.
    attributesToRetrieve: "title,url,author,points,num_comments,created_at_i",
    attributesToHighlight: "title",
  });

  const filters = [...parsed.numericFilters];
  const range = SEARCH_RANGES.find((item) => item.value === params.range);
  if (range !== undefined && range.seconds > 0) {
    const since = Math.floor((now - range.seconds) / SEARCH_CACHE_SECONDS) * SEARCH_CACHE_SECONDS;
    filters.unshift(`created_at_i>${since}`);
  }
  if (filters.length > 0) search.set("numericFilters", filters.join(","));

  return `${ALGOLIA_API}/${endpoint}?${search}`;
}

export function searchStories(params: SearchParams) {
  const now = Math.floor(Date.now() / 1_000);

  return fetchJson(buildSearchUrl(params, now), (value) => parseSearchResponse(value, now), {
    cacheTtlSeconds: SEARCH_CACHE_SECONDS,
    operation: "search",
    provider: "algolia",
    timeoutMs: SEARCH_TIMEOUT_MS,
  });
}
