import type { Post } from "~/lib/post";
import type { TopicItem } from "~/lib/topic";
import type { User } from "~/lib/user";
import type { RequestBudget } from "./budget";

export interface ContentProvider {
  readonly getPost: (
    postId: number,
    budget: RequestBudget,
  ) => Promise<Post | null>;
  readonly getTopics: (
    topic: string,
    page: number,
    budget: RequestBudget,
  ) => Promise<TopicItem[] | null>;
  readonly getUser: (
    userName: string,
    budget: RequestBudget,
  ) => Promise<User | null>;
}
