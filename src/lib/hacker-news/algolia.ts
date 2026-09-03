import type { Comment, Post } from "~/lib/post";
import { fetchJson } from "./client";

const ALGOLIA_API = "https://hn.algolia.com/api/v1";
const POST_CACHE_SECONDS = 15;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_MONTH = 2_592_000;
const SECONDS_PER_YEAR = 31_536_000;

interface ParsedComment {
  readonly comment: Comment;
  readonly count: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalText(value: unknown) {
  return value === undefined || value === null || typeof value === "string";
}

function age(time: number) {
  const elapsed = Math.max(0, Math.floor(Date.now() / 1_000) - time);
  const units = [
    [SECONDS_PER_YEAR, "year"],
    [SECONDS_PER_MONTH, "month"],
    [SECONDS_PER_DAY, "day"],
    [SECONDS_PER_HOUR, "hour"],
    [SECONDS_PER_MINUTE, "minute"],
  ] as const;

  for (const [seconds, label] of units) {
    if (elapsed < seconds) continue;

    const count = Math.floor(elapsed / seconds);
    return `${count} ${label}${count === 1 ? "" : "s"} ago`;
  }

  return `${elapsed} second${elapsed === 1 ? "" : "s"} ago`;
}

function domain(url: string | undefined) {
  if (url === undefined) return undefined;

  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return undefined;
  }
}

function parseComment(value: unknown): ParsedComment | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    !optionalText(value.author) ||
    !optionalText(value.text) ||
    typeof value.created_at_i !== "number" ||
    !Array.isArray(value.children)
  ) {
    return null;
  }

  const comments: Comment[] = [];
  let count = 0;
  for (const child of value.children) {
    const parsed = parseComment(child);
    if (parsed === null) return null;

    comments.push(parsed.comment);
    count += parsed.count + 1;
  }

  return {
    comment: {
      id: value.id,
      comments,
      comments_count: count,
      time: value.created_at_i,
      time_ago: age(value.created_at_i),
      ...(typeof value.author === "string" ? { user: value.author } : {}),
      ...(typeof value.text === "string" ? { content: value.text } : {}),
      ...(value.author === null ? { deleted: true } : {}),
    },
    count,
  };
}

export function parseAlgoliaPost(value: unknown): Post | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.title !== "string" ||
    typeof value.author !== "string" ||
    typeof value.created_at_i !== "number" ||
    !optionalText(value.text) ||
    !optionalText(value.url) ||
    !Array.isArray(value.children)
  ) {
    return null;
  }

  const comments: Comment[] = [];
  let commentsCount = 0;
  for (const child of value.children) {
    const parsed = parseComment(child);
    if (parsed === null) return null;

    comments.push(parsed.comment);
    commentsCount += parsed.count + 1;
  }

  const url = typeof value.url === "string" ? value.url : undefined;
  const host = domain(url);
  return {
    id: value.id,
    title: value.title,
    points: typeof value.points === "number" ? value.points : 0,
    user: value.author,
    time: value.created_at_i,
    time_ago: age(value.created_at_i),
    comments,
    comments_count: commentsCount,
    ...(typeof value.text === "string" ? { content: value.text } : {}),
    ...(url === undefined ? {} : { url }),
    ...(host === undefined ? {} : { domain: host }),
  };
}

export function getAlgoliaPost(postId: number) {
  return fetchJson(`${ALGOLIA_API}/items/${postId}`, parseAlgoliaPost, {
    cacheTtlSeconds: POST_CACHE_SECONDS,
    operation: "post",
    provider: "algolia",
  });
}
