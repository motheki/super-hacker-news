import type { OfficialItem } from "./codec";

type ItemLoader = (itemId: number) => Promise<OfficialItem | null>;

export async function loadDescendants(
  root: OfficialItem,
  loadItem: ItemLoader,
  batchSize: number,
) {
  const itemsById = new Map<number, OfficialItem>();
  const missingIds: number[] = [];
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

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item === undefined || item === null) {
        const missingId = batch[index];
        if (missingId !== undefined) missingIds.push(missingId);

        continue;
      }

      itemsById.set(item.id, item);
      enqueue(item.kids ?? []);
    }
  }

  return { items: itemsById, missingIds };
}
