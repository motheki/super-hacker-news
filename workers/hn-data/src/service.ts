import {
  toOfficialTopic,
  toOfficialUser,
  type OfficialItem,
} from "~/lib/hacker-news/codec";
import { isRootItemType } from "~/lib/item";
import type { Post } from "~/lib/post";
import type { TopicItem } from "~/lib/topic";
import { HnApi } from "./api";
import { materialize } from "./materializer";
import { HnRepository } from "./repository";
import type { HnDataEnv, HydrationMessage, ItemHydration } from "./types";

const ITEMS_PER_PAGE = 30;
const HYDRATION_BATCH_SIZE = 25;
const QUEUE_WRITE_BATCH_SIZE = 100;
const FEED_REFRESH_SECONDS = 60;
const POST_REFRESH_SECONDS = 15;
const USER_REFRESH_SECONDS = 3_600;
const POST_RETRY_SECONDS = 10;
const MAX_PARENT_DEPTH = 100;

const FEEDS = {
  ask: "askstories",
  best: "beststories",
  news: "topstories",
  newest: "newstories",
  show: "showstories",
} as const;

type FeedName = keyof typeof FEEDS;

function nowSeconds() {
  return Math.floor(Date.now() / 1_000);
}

function changed(previous: OfficialItem | undefined, next: OfficialItem) {
  return (
    previous === undefined || JSON.stringify(previous) !== JSON.stringify(next)
  );
}

export class HnDataService {
  readonly #api: HnApi;
  readonly #env: HnDataEnv;
  readonly #repo: HnRepository;

  constructor(env: HnDataEnv) {
    this.#api = new HnApi();
    this.#env = env;
    this.#repo = new HnRepository(env.DB);
  }

  async #enqueue(messages: readonly HydrationMessage[], delaySeconds?: number) {
    for (
      let start = 0;
      start < messages.length;
      start += QUEUE_WRITE_BATCH_SIZE
    ) {
      const batch = messages
        .slice(start, start + QUEUE_WRITE_BATCH_SIZE)
        .map((body) => ({
          body,
          ...(delaySeconds === undefined ? {} : { delaySeconds }),
        }));
      await this.#env.HYDRATE_QUEUE.sendBatch(batch);
    }
  }

  async #enqueueItems(items: readonly ItemHydration[], delaySeconds?: number) {
    const messages: HydrationMessage[] = [];
    for (let start = 0; start < items.length; start += HYDRATION_BATCH_SIZE) {
      messages.push({
        items: items.slice(start, start + HYDRATION_BATCH_SIZE),
        kind: "items",
      });
    }

    await this.#enqueue(messages, delaySeconds);
  }

  async #enqueueUsers(userNames: readonly string[]) {
    const messages: HydrationMessage[] = [];
    for (
      let start = 0;
      start < userNames.length;
      start += HYDRATION_BATCH_SIZE
    ) {
      messages.push({
        kind: "users",
        userNames: userNames.slice(start, start + HYDRATION_BATCH_SIZE),
      });
    }

    await this.#enqueue(messages);
  }

  async #enqueuePost(rootId: number, delaySeconds = POST_RETRY_SECONDS) {
    const claimed = await this.#repo.claimPost(rootId, nowSeconds());
    if (!claimed) return;

    await this.#sendPost(rootId, delaySeconds);
  }

  #sendPost(rootId: number, delaySeconds = POST_RETRY_SECONDS) {
    return this.#env.HYDRATE_QUEUE.send(
      { kind: "post", rootId },
      { delaySeconds },
    );
  }

  async #fetchChain(itemId: number) {
    const chain: OfficialItem[] = [];
    let currentId = itemId;

    for (let depth = 0; depth < MAX_PARENT_DEPTH; depth += 1) {
      const stored = await this.#repo.getItem(currentId);
      if (stored !== null) {
        for (const item of chain) {
          await this.#saveItem(item, stored.rootId);
        }

        return { item: chain[0] ?? stored.item, rootId: stored.rootId };
      }

      const item = await this.#api.getItem(currentId);
      if (item === null) return null;

      chain.push(item);
      if (isRootItemType(item.type)) {
        for (const current of chain) {
          await this.#saveItem(current, item.id);
        }

        return { item: chain[0] ?? item, rootId: item.id };
      }

      if (item.parent === undefined) return null;
      currentId = item.parent;
    }

    return null;
  }

  async #refreshFeed(name: FeedName, force = false) {
    const previous = await this.#repo.getFeed(name);
    const isFresh =
      previous !== null &&
      nowSeconds() - previous.observedAt < FEED_REFRESH_SECONDS;
    if (!force && isFresh) return { feed: previous, freshIds: [] };

    // Refresh on demand so feed availability does not depend on Cron delivery.
    const ids = await this.#api.getFeed(FEEDS[name]);
    if (ids === null) return { feed: previous, freshIds: [] };

    const observedAt = nowSeconds();
    await this.#repo.saveFeed(name, ids, observedAt);
    const previousIds = new Set(previous?.ids ?? []);

    return {
      feed: { ids, observedAt },
      freshIds: ids.filter((id) => !previousIds.has(id)),
    };
  }

  async #saveItem(item: OfficialItem, rootId: number) {
    await this.#repo.saveItem({ item, observedAt: nowSeconds(), rootId });
  }

  async getBestIds() {
    return (await this.#refreshFeed("best")).feed?.ids ?? null;
  }

  async getFeed(topic: string, page: number): Promise<TopicItem[] | null> {
    if (!(topic in FEEDS)) return null;

    const feed = (await this.#refreshFeed(topic as FeedName)).feed;
    if (feed === null) return null;

    const start = ITEMS_PER_PAGE * (page - 1);
    const ids = feed.ids.slice(start, start + ITEMS_PER_PAGE);
    const stored = await this.#repo.getItems(ids);
    const missingIds = ids.filter((id) => !stored.has(id));
    if (missingIds.length > 0) {
      await this.#enqueueItems(missingIds.map((id) => ({ id })));
      return null;
    }

    const now = nowSeconds();
    const items: TopicItem[] = [];
    for (const id of ids) {
      const item = stored.get(id)?.item;
      if (item === undefined) continue;

      const topicItem = toOfficialTopic(item, now);
      if (topicItem !== null) items.push(topicItem);
    }

    return items;
  }

  async getPost(postId: number): Promise<Post | null> {
    const stored = await this.#repo.getPost(postId);
    const isStale =
      stored === null ||
      nowSeconds() - stored.observedAt >= POST_REFRESH_SECONDS;
    if (isStale) {
      await this.#enqueueItems([
        { id: postId, materialize: true, rootId: postId },
      ]);
      await this.#enqueuePost(postId);
    }

    return stored?.value ?? null;
  }

  async getResolution(itemId: number) {
    const stored = await this.#repo.getItem(itemId);
    if (stored !== null) {
      return {
        item: {
          id: stored.item.id,
          type: stored.item.type,
          ...(stored.item.parent === undefined
            ? {}
            : { parent: stored.item.parent }),
        },
        rootId: stored.rootId,
      };
    }

    const loaded = await this.#fetchChain(itemId);
    if (loaded === null) return null;

    return {
      item: {
        id: loaded.item.id,
        type: loaded.item.type,
        ...(loaded.item.parent === undefined
          ? {}
          : { parent: loaded.item.parent }),
      },
      rootId: loaded.rootId,
    };
  }

  async getUser(userName: string) {
    const stored = await this.#repo.getUser(userName);
    if (
      stored !== null &&
      nowSeconds() - stored.observedAt < USER_REFRESH_SECONDS
    ) {
      return stored.value;
    }

    const value = await this.#api.getUser(userName);
    if (value === null) return stored?.value ?? null;

    const user = toOfficialUser(value, nowSeconds());
    await this.#repo.saveUser(user, nowSeconds());
    return user;
  }

  async handle(message: HydrationMessage) {
    if (message.kind === "item") {
      await this.hydrateItem(
        message.id,
        message.rootId,
        message.materialize ?? false,
      );
      return;
    }
    if (message.kind === "items") {
      for (const item of message.items) {
        await this.hydrateItem(item.id, item.rootId, item.materialize ?? false);
      }
      return;
    }
    if (message.kind === "post") {
      await this.hydratePost(message.rootId);
      return;
    }
    if (message.kind === "users") {
      for (const userName of message.userNames) {
        await this.getUser(userName);
      }
      return;
    }

    await this.getUser(message.userName);
  }

  async hydrateItem(
    itemId: number,
    knownRootId?: number,
    materializePost = false,
  ) {
    const previous = await this.#repo.getItem(itemId);
    const item = await this.#api.getItem(itemId);
    if (item === null) {
      if (knownRootId === undefined) return;

      await this.#saveItem(
        { deleted: true, id: itemId, type: "comment" },
        knownRootId,
      );
      if (materializePost) {
        await this.#enqueuePost(knownRootId);
      }
      return;
    }

    let rootId = knownRootId ?? previous?.rootId;
    if (rootId === undefined) {
      if (isRootItemType(item.type)) {
        rootId = item.id;
      } else {
        const resolution = await this.#fetchChain(item.id);
        if (resolution === null) return;
        rootId = resolution.rootId;
      }
    }

    const itemChanged = changed(previous?.item, item);
    await this.#saveItem(item, rootId);
    if (!itemChanged) return;

    const storedPost = await this.#repo.getPost(rootId);
    if (!materializePost && storedPost === null) return;

    const previousKids = new Set(previous?.item.kids ?? []);
    const newKids = (item.kids ?? []).filter((id) => !previousKids.has(id));
    await this.#enqueueItems(
      newKids.map((id) => ({
        id,
        materialize: true,
        rootId,
      })),
    );
    await this.#enqueuePost(
      rootId,
      newKids.length === 0 ? 0 : POST_RETRY_SECONDS,
    );
  }

  async hydratePost(rootId: number) {
    const storedRoot = await this.#repo.getItem(rootId);
    if (storedRoot === null) {
      await this.#enqueueItems(
        [{ id: rootId, materialize: true, rootId }],
        POST_RETRY_SECONDS,
      );
      await this.#sendPost(rootId);
      return;
    }

    const storedItems = await this.#repo.getRootItems(rootId);
    const items = new Map(
      [...storedItems].map(([id, stored]) => [id, stored.item] as const),
    );
    const result = materialize(storedRoot.item, items, nowSeconds());
    if (result.missingIds.length > 0) {
      await this.#enqueueItems(
        result.missingIds.map((id) => ({
          id,
          materialize: true,
          rootId,
        })),
      );
      await this.#sendPost(rootId);
      return;
    }
    if (result.post === null) {
      await this.#repo.finishPost(rootId);
      return;
    }

    await this.#repo.savePost(
      result.post,
      storedRoot.item.descendants ?? result.reachableCount,
      result.reachableCount,
      nowSeconds(),
    );
    await this.#repo.finishPost(rootId);
    console.info(
      JSON.stringify({
        event: "hn.post_materialized",
        officialCount: storedRoot.item.descendants ?? null,
        reachableCount: result.reachableCount,
        rootId,
      }),
    );
  }

  async sync() {
    for (const name of Object.keys(FEEDS) as FeedName[]) {
      const { freshIds } = await this.#refreshFeed(name, true);
      await this.#enqueueItems(freshIds.map((id) => ({ id })));
    }

    const updates = await this.#api.getUpdates();
    if (updates === null) return;

    await this.#enqueueItems(updates.items.map((id) => ({ id })));
    await this.#enqueueUsers(updates.profiles);
    console.info(
      JSON.stringify({
        event: "hn.sync",
        itemCount: updates.items.length,
        profileCount: updates.profiles.length,
      }),
    );
  }
}
