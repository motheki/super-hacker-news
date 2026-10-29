import type { Comment, Post } from "../post";
import type { TopicItem } from "../topic";
import type { User } from "../user";
import { formatAge, getDomain } from "./format";

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
  readonly type: "story" | "comment" | "job" | "poll" | "pollopt";
  readonly url?: string;
}

export interface OfficialUser {
  readonly about?: string;
  readonly created: number;
  readonly id: string;
  readonly karma: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isId = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const isCount = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const optionalString = (value: unknown) => value === undefined || typeof value === "string";
const optionalCount = (value: unknown) => value === undefined || isCount(value);
const optionalBoolean = (value: unknown) => value === undefined || typeof value === "boolean";

export function parseNumberArray(value: unknown): number[] | null {
  return Array.isArray(value) && value.every(isId) ? value : null;
}

export function parseOfficialItem(value: unknown): OfficialItem | null {
  if (
    !isRecord(value) || !isId(value.id) ||
    !["story", "comment", "job", "poll", "pollopt"].includes(String(value.type)) ||
    !optionalString(value.by) || !optionalBoolean(value.dead) ||
    !optionalBoolean(value.deleted) || !optionalCount(value.descendants) ||
    (value.parent !== undefined && !isId(value.parent)) ||
    !optionalCount(value.score) || !optionalString(value.text) ||
    !optionalCount(value.time) || !optionalString(value.title) ||
    !optionalString(value.url) ||
    (value.kids !== undefined && parseNumberArray(value.kids) === null)
  ) return null;
  return value as unknown as OfficialItem;
}

export function parseOfficialUser(value: unknown): OfficialUser | null {
  if (
    !isRecord(value) || typeof value.id !== "string" ||
    typeof value.karma !== "number" || !Number.isSafeInteger(value.karma) ||
    !isCount(value.created) || !optionalString(value.about)
  ) return null;
  return value as unknown as OfficialUser;
}

export function toComment(item: OfficialItem, now: number): Comment {
  return {
    id: item.id,
    parent: item.parent,
    user: item.by,
    time: item.time,
    time_ago: item.time === undefined ? undefined : formatAge(item.time, now),
    content: item.deleted || item.dead ? undefined : item.text,
    deleted: item.deleted,
    dead: item.dead,
    replyCount: item.kids?.length ?? 0,
  };
}

export function toOfficialTopic(item: OfficialItem, now: number): TopicItem | null {
  if (item.deleted || item.dead || !["story", "job", "poll"].includes(item.type) ||
      item.title === undefined || item.time === undefined) return null;
  return {
    id: item.id,
    title: item.title,
    points: item.score ?? 0,
    user: item.by,
    time: item.time,
    time_ago: formatAge(item.time, now),
    comments_count: item.descendants ?? 0,
    type: item.type,
    url: item.url,
    domain: getDomain(item.url),
  };
}

export function toOfficialPost(item: OfficialItem, now: number): Post | null {
  const topic = toOfficialTopic(item, now);
  if (topic === null) return null;
  return {
    ...topic,
    points: item.score ?? 0,
    user: item.by ?? "",
    content: item.text,
  };
}

export function toOfficialUser(value: OfficialUser, now: number): User {
  return {
    id: value.id,
    karma: value.karma,
    created_time: value.created,
    created: formatAge(value.created, now),
    about: value.about,
  };
}
