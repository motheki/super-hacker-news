import { toOfficialPost, type OfficialItem } from "~/lib/hacker-news/codec";

export function materialize(
  root: OfficialItem,
  items: ReadonlyMap<number, OfficialItem>,
  now: number,
) {
  const missingIds: number[] = [];
  const visited = new Set<number>([root.id]);
  const queue = [...(root.kids ?? [])];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const itemId = queue[cursor];
    if (itemId === undefined || visited.has(itemId)) continue;

    visited.add(itemId);
    const item = items.get(itemId);
    if (item === undefined) {
      missingIds.push(itemId);
      continue;
    }

    queue.push(...(item.kids ?? []));
  }

  return {
    missingIds,
    post: missingIds.length === 0 ? toOfficialPost(root, items, now) : null,
    reachableCount: visited.size - missingIds.length - 1,
  } as const;
}
