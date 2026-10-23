import { TOPICS, type TopicName } from "~/lib/topic";

export const MAX_USER_NAME_LENGTH = 15;
// node-hnapi clamps larger pages to 10, creating duplicate crawl/cache entries.
export const MAX_FEED_PAGE = 10;

const CACHEABLE_ROUTE =
  /^\/(?:ask|new|show|top)(?:\/\d+)?$|^\/post\/\d+$|^\/user\/[^/]+$|^\/sitemap\.xml$/u;

export const isCacheablePath = (path: string) =>
  CACHEABLE_ROUTE.test(path.replace(/\/+$/u, ""));

/** Collapse unused queries and trailing slashes before doing any upstream work. */
export function canonicalRoute(url: URL): string | null {
  if (!isCacheablePath(url.pathname)) return null;
  const path = url.pathname.replace(/\/+$/u, "");
  const topicName = path.slice(1);
  const page = parsePage(url.searchParams.get("page") ?? undefined);
  if (isTopicName(topicName) && page !== null && page > 1) {
    return `/${topicName}/${page}`;
  }
  return path !== url.pathname || url.search.length > 0 ? path : null;
}

export const isTopicName = (value: string): value is TopicName =>
  TOPICS.some((topic) => topic.name === value);

const parsePositiveInteger = (value: string) => {
  if (!/^[1-9]\d*$/u.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
};

export const parsePage = (value?: string | readonly string[]): number | null => {
  if (value === undefined) return 1;
  if (typeof value === "string") {
    const page = parsePositiveInteger(value);
    return page !== null && page <= MAX_FEED_PAGE ? page : null;
  }
  if (value.length === 0) return 1;
  if (value.length !== 1) return null;

  return parsePage(value[0]);
};

export const parsePostId = (value: string) => parsePositiveInteger(value);

export const isValidUserName = (value: string) =>
  value.length > 0 && value.length <= MAX_USER_NAME_LENGTH;
