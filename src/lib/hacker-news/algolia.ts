import type { Comment, Post } from "~/lib/post";
import { fetchJson } from "./client";
import { formatAge, getDomain } from "./format";

const ALGOLIA_API = "https://hn.algolia.com/api/v1";
const POST_CACHE_SECONDS = 60;
const POST_TIMEOUT_MS = 2_000;

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

function parseComment(value: unknown, now: number): ParsedComment | null {
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
    const parsed = parseComment(child, now);
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
      time_ago: formatAge(value.created_at_i, now),
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
  const now = Math.floor(Date.now() / 1_000);
  for (const child of value.children) {
    const parsed = parseComment(child, now);
    if (parsed === null) return null;

    comments.push(parsed.comment);
    commentsCount += parsed.count + 1;
  }

  const url = typeof value.url === "string" ? value.url : undefined;
  const host = getDomain(url);
  return {
    id: value.id,
    title: value.title,
    points: typeof value.points === "number" ? value.points : 0,
    user: value.author,
    time: value.created_at_i,
    time_ago: formatAge(value.created_at_i, now),
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
    retryCount: 0,
    timeoutMs: POST_TIMEOUT_MS,
  });
}
