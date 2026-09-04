import type { HackerNewsItemReference } from "~/lib/item";
import { isRootItemType, resolveRootItemId } from "~/lib/item";
import type { Post } from "~/lib/post";

type ItemLoader = (itemId: number) => Promise<HackerNewsItemReference | null>;
type PostLoader = (postId: number) => Promise<Post | null>;

export type PostTarget =
  | { readonly kind: "missing" }
  | { readonly kind: "post"; readonly post: Post }
  | { readonly kind: "redirect"; readonly rootId: number };

export async function resolvePostTarget(
  itemId: number,
  loadItem: ItemLoader,
  loadPost: PostLoader,
): Promise<PostTarget> {
  let postError: Error | undefined;
  try {
    const post = await loadPost(itemId);
    if (post !== null && post.id !== itemId) {
      return { kind: "redirect", rootId: post.id };
    }
    if (post !== null) return { kind: "post", post };
  } catch (error) {
    postError = error instanceof Error ? error : new Error(String(error));
  }

  let item: HackerNewsItemReference | null;
  let itemError: Error | undefined;
  try {
    item = await loadItem(itemId);
  } catch (error) {
    item = null;
    itemError = error instanceof Error ? error : new Error(String(error));
  }

  if (item === null || isRootItemType(item.type)) {
    if (postError !== undefined) throw postError;
    if (itemError !== undefined) throw itemError;

    return { kind: "missing" };
  }

  const rootId = await resolveRootItemId(itemId, (currentId) =>
    currentId === itemId ? Promise.resolve(item) : loadItem(currentId),
  );
  return rootId === null ? { kind: "missing" } : { kind: "redirect", rootId };
}
