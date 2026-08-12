export interface HackerNewsItemReference {
  readonly id: number;
  readonly parent?: number;
  readonly type: string;
}

type ItemLoader = (itemId: number) => Promise<HackerNewsItemReference | null>;

const ROOT_ITEM_TYPES: ReadonlySet<string> = new Set(["job", "poll", "story"]);
const MAX_PARENT_DEPTH = 64;

export async function resolveRootItemId(
  itemId: number,
  loadItem: ItemLoader,
): Promise<number | null> {
  const visited = new Set<number>();
  let currentId = itemId;

  for (let depth = 0; depth < MAX_PARENT_DEPTH; depth += 1) {
    if (visited.has(currentId)) return null;
    visited.add(currentId);

    const item = await loadItem(currentId);
    if (item === null || item.id !== currentId) return null;
    if (ROOT_ITEM_TYPES.has(item.type)) return item.id;
    if (item.parent === undefined) return null;

    currentId = item.parent;
  }

  return null;
}
