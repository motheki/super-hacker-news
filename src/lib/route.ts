import { TOPICS, MAX_FEED_PAGE, type TopicName } from "~/lib/topic";

export const MAX_USER_NAME_LENGTH = 15;
export { MAX_FEED_PAGE };

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
  value.length > 0 && value.length <= MAX_USER_NAME_LENGTH && /^[A-Za-z0-9_-]+$/.test(value);
