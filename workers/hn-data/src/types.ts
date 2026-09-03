import type { OfficialItem } from "~/lib/hacker-news/codec";

export type HydrationMessage =
  | {
      readonly id: number;
      readonly kind: "item";
      readonly materialize?: boolean;
      readonly rootId?: number;
    }
  | { readonly kind: "post"; readonly rootId: number }
  | { readonly kind: "user"; readonly userName: string };

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
