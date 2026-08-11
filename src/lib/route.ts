import { TOPICS, type TopicName } from "~/lib/topic";

export const MAX_USER_NAME_LENGTH = 15;

export const isTopicName = (value: string): value is TopicName =>
	TOPICS.some(topic => topic.name === value);

const parsePositiveInteger = (value: string) => {
	if (!/^[1-9]\d*$/.test(value)) return null;
	const number = Number(value);
	return Number.isSafeInteger(number) ? number : null;
};

export const parsePage = (value: string | string[] | undefined) => {
	if (value === undefined || (Array.isArray(value) && value.length === 0)) return 1;
	if (Array.isArray(value)) return value.length === 1 ? parsePositiveInteger(value[0]) : null;
	return parsePositiveInteger(value);
};

export const parsePostId = (value: string) => parsePositiveInteger(value);

export const isValidUserName = (value: string) =>
	value.length > 0 && value.length <= MAX_USER_NAME_LENGTH;
