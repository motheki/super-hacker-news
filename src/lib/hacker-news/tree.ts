import type { OfficialItem } from "./codec";

type ItemLoader = (itemId: number) => Promise<OfficialItem | null>;

export async function loadDescendants(
  root: OfficialItem,
  loadItem: ItemLoader,
  batchSize: number,
) {
  const descendants = new Map<number, OfficialItem>();
  const queued = new Set<number>([root.id]);
  const queue: number[] = [];

  function enqueue(ids: readonly number[]) {
    for (const id of ids) {
      if (queued.has(id)) continue;

      queued.add(id);
      queue.push(id);
    }
  }

  enqueue(root.kids ?? []);

  let cursor = 0;
  while (cursor < queue.length) {
    const batch = queue.slice(cursor, cursor + batchSize);
    cursor += batch.length;
    const items = await Promise.all(batch.map(loadItem));

    for (const item of items) {
      if (item === null) continue;

      descendants.set(item.id, item);
      enqueue(item.kids ?? []);
    }
  }

  return descendants;
}
