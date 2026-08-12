import "server-only";
import {
  fetchBestStoryIds,
  fetchItemReference,
  fetchPost,
  fetchTopicItems,
  fetchUser,
} from "~/lib/hacker-news";
import type { Comment, Post } from "~/lib/post";
import { resolveRootItemId } from "~/lib/item";

export const getTopicItems = (topic: string, page: number) =>
  fetchTopicItems(topic, page);

const countComments = (comments: readonly Comment[]) =>
  comments.reduce(
    (total, comment) => total + 1 + (comment.comments_count ?? 0),
    0,
  );

const withCommentCounts = (comment: Readonly<Comment>): Comment => {
  const comments = comment.comments.map(withCommentCounts);
  return { ...comment, comments, comments_count: countComments(comments) };
};

const normalizePost = (post: Readonly<Post>): Post => {
  const comments = post.comments.map(withCommentCounts);
  return { ...post, comments, comments_count: countComments(comments) };
};

export async function getPost(postId: number) {
  const post = await fetchPost(postId);
  return post ? normalizePost(post) : null;
}

export const getRootItemId = (itemId: number) =>
  resolveRootItemId(itemId, fetchItemReference);

export const getUser = (userName: string) => fetchUser(userName);

export const getBestStoryIds = () => fetchBestStoryIds();
