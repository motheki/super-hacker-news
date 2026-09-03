import type { Comment, Post } from "~/lib/post";
import type { TopicItem } from "~/lib/topic";
import type { User } from "~/lib/user";

export interface OfficialItem {
  readonly by?: string;
  readonly dead?: boolean;
  readonly deleted?: boolean;
  readonly descendants?: number;
  readonly id: number;
  readonly kids?: readonly number[];
  readonly parent?: number;
  readonly score?: number;
  readonly text?: string;
  readonly time?: number;
  readonly title?: string;
  readonly type: string;
  readonly url?: string;
}

export interface OfficialUser {
  readonly about?: string;
  readonly created: number;
  readonly id: string;
  readonly karma: number;
}

interface ParsedComment {
  readonly comment: Comment;
  readonly count: number;
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_MONTH = 2_592_000;
const SECONDS_PER_YEAR = 31_536_000;
const MAX_COMMENT_LAG = 5;
const MIN_COMMENT_RATIO = 0.8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function optionalNumber(value: unknown) {
  return value === undefined || typeof value === "number";
}

function optionalBoolean(value: unknown) {
  return value === undefined || typeof value === "boolean";
}

function nullableString(value: unknown) {
  return value === undefined || value === null || typeof value === "string";
}

function nullableNumber(value: unknown) {
  return value === undefined || value === null || typeof value === "number";
}

function parseAggregatedComment(value: unknown): ParsedComment | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    !optionalString(value.user) ||
    !optionalNumber(value.time) ||
    !optionalString(value.time_ago) ||
    !optionalString(value.content) ||
    !optionalBoolean(value.deleted) ||
    !optionalBoolean(value.dead) ||
    !optionalString(value.url) ||
    !Array.isArray(value.comments)
  ) {
    return null;
  }

  const comments: Comment[] = [];
  let count = 0;
  for (const child of value.comments) {
    const parsed = parseAggregatedComment(child);
    if (parsed === null) return null;

    comments.push(parsed.comment);
    count += parsed.count + 1;
  }

  return {
    comment: {
      id: value.id,
      comments,
      comments_count: count,
      ...(value.user === undefined ? {} : { user: value.user }),
      ...(value.time === undefined ? {} : { time: value.time }),
      ...(value.time_ago === undefined ? {} : { time_ago: value.time_ago }),
      ...(value.content === undefined ? {} : { content: value.content }),
      ...(value.deleted === undefined ? {} : { deleted: value.deleted }),
      ...(value.dead === undefined ? {} : { dead: value.dead }),
      ...(value.url === undefined ? {} : { url: value.url }),
    },
    count,
  };
}

export function parseAggregatedPost(value: unknown): Post | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.title !== "string" ||
    typeof value.points !== "number" ||
    typeof value.user !== "string" ||
    typeof value.time !== "number" ||
    typeof value.time_ago !== "string" ||
    !optionalString(value.content) ||
    !optionalString(value.url) ||
    !optionalString(value.domain) ||
    !Array.isArray(value.comments)
  ) {
    return null;
  }

  const comments: Comment[] = [];
  let commentsCount = 0;
  for (const child of value.comments) {
    const parsed = parseAggregatedComment(child);
    if (parsed === null) return null;

    comments.push(parsed.comment);
    commentsCount += parsed.count + 1;
  }

  return {
    id: value.id,
    title: value.title,
    points: value.points,
    user: value.user,
    time: value.time,
    time_ago: value.time_ago,
    comments,
    comments_count: commentsCount,
    ...(value.content === undefined ? {} : { content: value.content }),
    ...(value.url === undefined ? {} : { url: value.url }),
    ...(value.domain === undefined ? {} : { domain: value.domain }),
  };
}

export function isPostComplete(post: Post, officialCount: number | null) {
  if (officialCount === null || post.comments_count >= officialCount) {
    return true;
  }

  const missing = officialCount - post.comments_count;
  const ratio = post.comments_count / officialCount;
  return missing <= MAX_COMMENT_LAG || ratio >= MIN_COMMENT_RATIO;
}

export function parseAggregatedTopics(value: unknown): TopicItem[] | null {
  if (!Array.isArray(value)) return null;

  const items: TopicItem[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.id !== "number" ||
      typeof item.title !== "string" ||
      !nullableNumber(item.points) ||
      !nullableString(item.user) ||
      typeof item.time !== "number" ||
      typeof item.time_ago !== "string" ||
      typeof item.comments_count !== "number" ||
      typeof item.type !== "string" ||
      !optionalString(item.url) ||
      !optionalString(item.domain)
    ) {
      return null;
    }

    items.push(item as unknown as TopicItem);
  }

  return items;
}

export function parseAggregatedUser(value: unknown): User | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.karma !== "number" ||
    typeof value.created_time !== "number" ||
    typeof value.created !== "string" ||
    !optionalString(value.about)
  ) {
    return null;
  }

  return value as unknown as User;
}

export function parseNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === "number")) return null;
  return value;
}

export function parseOfficialItem(value: unknown): OfficialItem | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.type !== "string" ||
    !optionalString(value.by) ||
    !optionalBoolean(value.dead) ||
    !optionalBoolean(value.deleted) ||
    !optionalNumber(value.descendants) ||
    !optionalNumber(value.parent) ||
    !optionalNumber(value.score) ||
    !optionalString(value.text) ||
    !optionalNumber(value.time) ||
    !optionalString(value.title) ||
    !optionalString(value.url) ||
    (value.kids !== undefined &&
      (!Array.isArray(value.kids) ||
        !value.kids.every((item) => typeof item === "number")))
  ) {
    return null;
  }

  return value as unknown as OfficialItem;
}

export function parseOfficialUser(value: unknown): OfficialUser | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.karma !== "number" ||
    typeof value.created !== "number" ||
    !optionalString(value.about)
  ) {
    return null;
  }

  return value as unknown as OfficialUser;
}

function formatAge(time: number, now: number) {
  const age = Math.max(0, now - time);
  const units = [
    [SECONDS_PER_YEAR, "year"],
    [SECONDS_PER_MONTH, "month"],
    [SECONDS_PER_DAY, "day"],
    [SECONDS_PER_HOUR, "hour"],
    [SECONDS_PER_MINUTE, "minute"],
  ] as const;

  for (const [seconds, label] of units) {
    if (age < seconds) continue;

    const count = Math.floor(age / seconds);
    return `${count} ${label}${count === 1 ? "" : "s"} ago`;
  }

  return `${age} second${age === 1 ? "" : "s"} ago`;
}

function getDomain(url: string | undefined) {
  if (url === undefined) return undefined;

  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return undefined;
  }
}

function toOfficialComment(
  item: OfficialItem,
  items: ReadonlyMap<number, OfficialItem>,
  now: number,
): ParsedComment {
  const comments: Comment[] = [];
  let count = 0;

  for (const childId of item.kids ?? []) {
    const child = items.get(childId);
    if (child === undefined) continue;

    const parsed = toOfficialComment(child, items, now);
    comments.push(parsed.comment);
    count += parsed.count + 1;
  }

  return {
    comment: {
      id: item.id,
      comments,
      comments_count: count,
      ...(item.by === undefined ? {} : { user: item.by }),
      ...(item.time === undefined
        ? {}
        : { time: item.time, time_ago: formatAge(item.time, now) }),
      ...(item.text === undefined ? {} : { content: item.text }),
      ...(item.deleted === undefined ? {} : { deleted: item.deleted }),
      ...(item.dead === undefined ? {} : { dead: item.dead }),
    },
    count,
  };
}

export function toOfficialTopic(
  item: OfficialItem,
  now: number,
): TopicItem | null {
  if (item.title === undefined || item.time === undefined) return null;

  const domain = getDomain(item.url);
  return {
    id: item.id,
    title: item.title,
    points: item.score ?? 0,
    user: item.by,
    time: item.time,
    time_ago: formatAge(item.time, now),
    comments_count: item.descendants ?? 0,
    type: item.type,
    ...(item.url === undefined ? {} : { url: item.url }),
    ...(domain === undefined ? {} : { domain }),
  };
}

export function toOfficialPost(
  item: OfficialItem,
  items: ReadonlyMap<number, OfficialItem>,
  now: number,
): Post | null {
  if (
    item.title === undefined ||
    item.time === undefined ||
    item.by === undefined
  ) {
    return null;
  }

  const comments: Comment[] = [];
  let commentsCount = 0;
  for (const childId of item.kids ?? []) {
    const child = items.get(childId);
    if (child === undefined) continue;

    const parsed = toOfficialComment(child, items, now);
    comments.push(parsed.comment);
    commentsCount += parsed.count + 1;
  }

  const domain = getDomain(item.url);
  return {
    id: item.id,
    title: item.title,
    points: item.score ?? 0,
    user: item.by,
    time: item.time,
    time_ago: formatAge(item.time, now),
    comments,
    comments_count: commentsCount,
    ...(item.text === undefined ? {} : { content: item.text }),
    ...(item.url === undefined ? {} : { url: item.url }),
    ...(domain === undefined ? {} : { domain }),
  };
}

export function toOfficialUser(value: OfficialUser, now: number): User {
  return {
    id: value.id,
    karma: value.karma,
    created_time: value.created,
    created: formatAge(value.created, now),
    ...(value.about === undefined ? {} : { about: value.about }),
  };
}
