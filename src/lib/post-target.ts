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
  let item: HackerNewsItemReference | null;
  try {
    item = await loadItem(itemId);
  } catch {
    item = null;
  }

  if (item === null || isRootItemType(item.type)) {
    const post = await loadPost(itemId);
    return post === null ? { kind: "missing" } : { kind: "post", post };
  }

  const rootId = await resolveRootItemId(itemId, (currentId) =>
    currentId === itemId ? Promise.resolve(item) : loadItem(currentId),
  );
  return rootId === null ? { kind: "missing" } : { kind: "redirect", rootId };
}
