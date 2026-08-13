import { UPSTREAM_ITEMS_PER_PAGE } from "~/lib/feed";
import { TOPICS, type TopicName } from "~/lib/topic";

export const MAX_USER_NAME_LENGTH = 15;

export const isTopicName = (value: string): value is TopicName =>
  TOPICS.some((topic) => topic.name === value);

const parsePositiveInteger = (value: string) => {
  if (!/^[1-9]\d*$/u.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
};

const parseNonNegativeInteger = (value: string) => {
  if (!/^(?:0|[1-9]\d*)$/u.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
};

export const parsePage = (value?: string | readonly string[]) => {
  if (value === undefined) return 1;
  if (typeof value === "string") return parsePositiveInteger(value);
  if (value.length === 0) return 1;
  return value.length === 1 ? parsePositiveInteger(value[0]) : null;
};

export const parseFeedOffset = (value?: string | readonly string[]) => {
  if (value === undefined) return 0;
  const offset =
    typeof value === "string"
      ? parseNonNegativeInteger(value)
      : value.length === 0
        ? 0
        : value.length === 1
          ? parseNonNegativeInteger(value[0])
          : null;
  return offset !== null && offset < UPSTREAM_ITEMS_PER_PAGE ? offset : null;
};

export const parsePostId = (value: string) => parsePositiveInteger(value);

export const isValidUserName = (value: string) =>
  value.length > 0 && value.length <= MAX_USER_NAME_LENGTH;
