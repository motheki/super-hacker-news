export interface Comment {
  readonly id: number;
  readonly parent?: number | undefined;
  readonly user?: string | undefined;
  readonly time?: number | undefined;
  readonly time_ago?: string | undefined;
  readonly content?: string | undefined;
  readonly deleted?: boolean | undefined;
  readonly dead?: boolean | undefined;
  /** Direct replies, including tombstones; descendants load only on request. */
  readonly replyCount: number;
}

export interface Post {
  readonly id: number;
  readonly title: string;
  readonly points: number;
  readonly user: string;
  readonly time: number;
  readonly time_ago: string;
  readonly content?: string | undefined;
  readonly url?: string | undefined;
  readonly domain?: string | undefined;
  /** The official descendant count, never the number loaded on this page. */
  readonly comments_count: number;
}

export interface CommentPage {
  readonly comments: readonly Comment[];
  readonly nextPage: number | null;
}
