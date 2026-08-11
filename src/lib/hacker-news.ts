import type { Post } from "./post";
import type { TopicItem } from "./topic";
import type { User } from "./user";

type Validator<T> = (value: unknown) => value is T;
type CachePolicy = { revalidate: number; tags: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const hasCommentShape = (value: unknown): boolean =>
	isRecord(value) &&
	typeof value.id === "number" &&
	Array.isArray(value.comments) &&
	value.comments.every(hasCommentShape);

const isTopicItems: Validator<TopicItem[]> = (value): value is TopicItem[] =>
	Array.isArray(value) &&
	value.every(
		item => isRecord(item) && typeof item.id === "number" && typeof item.title === "string",
	);

const isPost: Validator<Post> = (value): value is Post =>
	isRecord(value) &&
	typeof value.id === "number" &&
	typeof value.title === "string" &&
	Array.isArray(value.comments) &&
	value.comments.every(hasCommentShape);

const isUser: Validator<User> = (value): value is User =>
	isRecord(value) && typeof value.id === "string" && typeof value.karma === "number";

const isNumberArray: Validator<number[]> = (value): value is number[] =>
	Array.isArray(value) && value.every(item => typeof item === "number");

async function fetchJson<T>(
	url: string,
	isValid: Validator<T>,
	cachePolicy: CachePolicy,
): Promise<T | null> {
	const response = await fetch(url, {
		headers: { accept: "application/json" },
		next: cachePolicy,
	});

	if (response.status === 404) return null;
	if (!response.ok) {
		throw new Error(`Upstream request failed with status ${response.status}`);
	}

	let value: unknown;
	try {
		value = await response.json();
	} catch {
		return null;
	}

	return isValid(value) ? value : null;
}

export const fetchTopicItems = (topic: string, page: number) =>
	fetchJson(`https://api.hackerwebapp.com/${topic}?page=${page}.json`, isTopicItems, {
		revalidate: 60,
		tags: ["topics", `topic:${topic}:${page}`],
	});

export const fetchPost = (postId: number) =>
	fetchJson(`https://api.hackerwebapp.com/item/${postId}`, isPost, {
		revalidate: 60,
		tags: ["posts", `post:${postId}`],
	});

export const fetchUser = (userName: string) =>
	fetchJson(`https://api.hnpwa.com/v0/user/${encodeURIComponent(userName)}.json`, isUser, {
		revalidate: 60,
		tags: ["users", `user:${userName}`],
	});

export const fetchBestStoryIds = () =>
	fetchJson("https://hacker-news.firebaseio.com/v0/beststories.json", isNumberArray, {
		revalidate: 3600,
		tags: ["stories", "stories:best"],
	});
