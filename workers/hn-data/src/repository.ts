import {
  parseAggregatedPost,
  parseAggregatedUser,
  parseNumberArray,
  parseOfficialItem,
} from "~/lib/hacker-news/codec";
import type { Post } from "~/lib/post";
import type { User } from "~/lib/user";
import type { StoredFeed, StoredItem, StoredValue } from "./types";

interface FeedRow {
  readonly ids: string;
  readonly observed_at: number;
}

interface ItemRow {
  readonly payload: string;
  readonly observed_at: number;
  readonly root_id: number;
}

interface ValueRow {
  readonly observed_at: number;
  readonly payload: string;
}

function parseJson<T>(value: string, parse: (value: unknown) => T | null) {
  try {
    return parse(JSON.parse(value));
  } catch {
    return null;
  }
}

export class HnRepository {
  readonly #db: D1Database;

  constructor(db: D1Database) {
    this.#db = db;
  }

  async claimPost(rootId: number, queuedAt: number) {
    const result = await this.#db
      .prepare(
        "INSERT OR IGNORE INTO post_jobs (root_id, queued_at) VALUES (?, ?)",
      )
      .bind(rootId, queuedAt)
      .run();

    return result.meta.changes > 0;
  }

  finishPost(rootId: number) {
    return this.#db
      .prepare("DELETE FROM post_jobs WHERE root_id = ?")
      .bind(rootId)
      .run();
  }

  async getFeed(name: string): Promise<StoredFeed | null> {
    const row = await this.#db
      .prepare("SELECT ids, observed_at FROM feeds WHERE name = ?")
      .bind(name)
      .first<FeedRow>();
    if (row === null) return null;

    const ids = parseJson(row.ids, parseNumberArray);
    return ids === null ? null : { ids, observedAt: row.observed_at };
  }

  async getItem(itemId: number): Promise<StoredItem | null> {
    const row = await this.#db
      .prepare("SELECT payload, observed_at, root_id FROM items WHERE id = ?")
      .bind(itemId)
      .first<ItemRow>();
    if (row === null) return null;

    const item = parseJson(row.payload, parseOfficialItem);
    if (item === null) return null;

    return {
      item,
      observedAt: row.observed_at,
      rootId: row.root_id,
    };
  }

  async getItems(itemIds: readonly number[]) {
    if (itemIds.length === 0) return new Map<number, StoredItem>();

    const placeholders = itemIds.map(() => "?").join(", ");
    const result = await this.#db
      .prepare(
        `SELECT id, payload, observed_at, root_id FROM items WHERE id IN (${placeholders})`,
      )
      .bind(...itemIds)
      .all<ItemRow & { readonly id: number }>();
    const items = new Map<number, StoredItem>();

    for (const row of result.results) {
      const item = parseJson(row.payload, parseOfficialItem);
      if (item === null) continue;

      items.set(row.id, {
        item,
        observedAt: row.observed_at,
        rootId: row.root_id,
      });
    }

    return items;
  }

  async getRootItems(rootId: number) {
    const result = await this.#db
      .prepare(
        "SELECT id, payload, observed_at, root_id FROM items WHERE root_id = ?",
      )
      .bind(rootId)
      .all<ItemRow & { readonly id: number }>();
    const items = new Map<number, StoredItem>();

    for (const row of result.results) {
      const item = parseJson(row.payload, parseOfficialItem);
      if (item === null) continue;

      items.set(row.id, {
        item,
        observedAt: row.observed_at,
        rootId: row.root_id,
      });
    }

    return items;
  }

  getPost(postId: number): Promise<StoredValue<Post> | null> {
    return this.#getValue(
      "SELECT payload, observed_at FROM posts WHERE id = ?",
      postId,
      parseAggregatedPost,
    );
  }

  getUser(userName: string): Promise<StoredValue<User> | null> {
    return this.#getValue(
      "SELECT payload, observed_at FROM users WHERE id = ?",
      userName,
      parseAggregatedUser,
    );
  }

  async #getValue<T>(
    query: string,
    key: number | string,
    parse: (value: unknown) => T | null,
  ): Promise<StoredValue<T> | null> {
    const row = await this.#db.prepare(query).bind(key).first<ValueRow>();
    if (row === null) return null;

    const value = parseJson(row.payload, parse);
    return value === null ? null : { observedAt: row.observed_at, value };
  }

  saveFeed(name: string, ids: readonly number[], observedAt: number) {
    return this.#db
      .prepare(
        "INSERT INTO feeds (name, ids, observed_at) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET ids = excluded.ids, observed_at = excluded.observed_at",
      )
      .bind(name, JSON.stringify(ids), observedAt)
      .run();
  }

  saveItem(item: StoredItem) {
    return this.#db
      .prepare(
        "INSERT INTO items (id, parent_id, root_id, type, payload, observed_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET parent_id = excluded.parent_id, root_id = excluded.root_id, type = excluded.type, payload = excluded.payload, observed_at = excluded.observed_at",
      )
      .bind(
        item.item.id,
        item.item.parent ?? null,
        item.rootId,
        item.item.type,
        JSON.stringify(item.item),
        item.observedAt,
      )
      .run();
  }

  savePost(
    post: Post,
    officialCount: number,
    reachableCount: number,
    observedAt: number,
  ) {
    return this.#db
      .prepare(
        "INSERT INTO posts (id, payload, official_count, reachable_count, observed_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, official_count = excluded.official_count, reachable_count = excluded.reachable_count, observed_at = excluded.observed_at",
      )
      .bind(
        post.id,
        JSON.stringify(post),
        officialCount,
        reachableCount,
        observedAt,
      )
      .run();
  }

  saveUser(user: User, observedAt: number) {
    return this.#db
      .prepare(
        "INSERT INTO users (id, payload, observed_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, observed_at = excluded.observed_at",
      )
      .bind(user.id, JSON.stringify(user), observedAt)
      .run();
  }
}
