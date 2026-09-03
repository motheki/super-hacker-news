import type { OfficialItem } from "~/lib/hacker-news/codec";

export interface ItemHydration {
  readonly id: number;
  readonly materialize?: boolean;
  readonly rootId?: number;
}

export type HydrationMessage =
  | (ItemHydration & { readonly kind: "item" })
  | { readonly items: readonly ItemHydration[]; readonly kind: "items" }
  | { readonly kind: "post"; readonly rootId: number }
  | { readonly kind: "user"; readonly userName: string }
  | { readonly kind: "users"; readonly userNames: readonly string[] };

export interface HnDataEnv {
  readonly DB: D1Database;
  readonly HYDRATE_QUEUE: Queue<HydrationMessage>;
}

export interface StoredItem {
  readonly item: OfficialItem;
  readonly observedAt: number;
  readonly rootId: number;
}

export interface StoredFeed {
  readonly ids: readonly number[];
  readonly observedAt: number;
}

export interface StoredValue<T> {
  readonly observedAt: number;
  readonly value: T;
}
