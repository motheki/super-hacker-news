export interface AvailableTopic {
  readonly name: string;
  readonly value: string;
  readonly title: string;
}

export const TOPICS = [
  { name: "top", value: "news", title: "Top" },
  { name: "new", value: "newest", title: "New" },
  { name: "ask", value: "ask", title: "Ask" },
  { name: "show", value: "show", title: "Show" },
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
