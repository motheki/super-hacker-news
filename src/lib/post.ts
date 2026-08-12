export interface Comment {
  readonly id: number;
  readonly user?: string;
  readonly time?: number;
  readonly time_ago?: string;
  readonly content?: string;
  readonly deleted?: boolean;
  readonly dead?: boolean;
  readonly comments: readonly Comment[];
  readonly comments_count?: number;
  readonly url?: string;
}

export interface Post {
  readonly id: number;
  readonly title: string;
  readonly points: number;
  readonly user: string;
  readonly time: number;
  readonly time_ago: string;
  readonly content?: string;
  readonly url?: string;
  readonly domain?: string;
  readonly comments: readonly Comment[];
  readonly comments_count: number;
}
