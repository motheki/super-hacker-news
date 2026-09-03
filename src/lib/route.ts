import { TOPICS, type TopicName } from "~/lib/topic";

export const MAX_USER_NAME_LENGTH = 15;

export const isTopicName = (value: string): value is TopicName =>
  TOPICS.some((topic) => topic.name === value);

const parsePositiveInteger = (value: string) => {
  if (!/^[1-9]\d*$/u.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
};

export const parsePage = (value?: string | readonly string[]) => {
  if (value === undefined) return 1;
  if (typeof value === "string") return parsePositiveInteger(value);
  if (value.length === 0) return 1;
  if (value.length !== 1) return null;

  const [page] = value;
  return page === undefined ? null : parsePositiveInteger(page);
};

export const parsePostId = (value: string) => parsePositiveInteger(value);

export const isValidUserName = (value: string) =>
  value.length > 0 && value.length <= MAX_USER_NAME_LENGTH;
