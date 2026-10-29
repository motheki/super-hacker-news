export const ITEMS_PER_PAGE = 30;
export const MAX_FEED_PAGE = Math.ceil(500 / ITEMS_PER_PAGE);

export interface AvailableTopic {
  readonly name: string;
  readonly feed: string;
  readonly title: string;
}

export const TOPICS = [
  { name: "top", feed: "topstories", title: "Top" },
  { name: "new", feed: "newstories", title: "New" },
  { name: "ask", feed: "askstories", title: "Ask" },
  { name: "show", feed: "showstories", title: "Show" },
] as const satisfies readonly AvailableTopic[];

export type TopicName = (typeof TOPICS)[number]["name"];

export interface TopicItem {
  readonly id: number;
  readonly title: string;
  readonly points?: number | null;
  readonly user?: string | null;
  readonly time: number;
  readonly time_ago: string;
  readonly comments_count: number;
  readonly type: string;
  readonly url?: string;
  readonly domain?: string;
}
