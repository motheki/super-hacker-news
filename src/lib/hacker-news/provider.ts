import type { Post } from "~/lib/post";
import type { TopicItem } from "~/lib/topic";
import type { User } from "~/lib/user";

export interface ContentProvider {
  readonly getPost: (postId: number) => Promise<Post | null>;
  readonly getTopics: (
    topic: string,
    page: number,
  ) => Promise<TopicItem[] | null>;
  readonly getUser: (userName: string) => Promise<User | null>;
}
