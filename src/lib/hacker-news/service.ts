import type { HackerNewsItemReference } from "~/lib/item";
import type { Post } from "~/lib/post";
import type { TopicItem } from "~/lib/topic";
import type { User } from "~/lib/user";
import {
  parseAggregatedPost,
  parseAggregatedTopics,
  parseAggregatedUser,
  parseNumberArray,
} from "./codec";

const SERVICE_ORIGIN = "https://hn-data.internal";

export interface ServiceBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface ServiceResolution {
  readonly item: HackerNewsItemReference;
  readonly rootId: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseResolution(value: unknown): ServiceResolution | null {
  if (!isRecord(value) || !isRecord(value.item)) return null;
  if (typeof value.rootId !== "number") return null;
  if (typeof value.item.id !== "number") return null;
  if (typeof value.item.type !== "string") return null;
  if (
    value.item.parent !== undefined &&
    typeof value.item.parent !== "number"
  ) {
    return null;
  }

  return value as unknown as ServiceResolution;
}

export class HnDataClient {
  readonly #binding: ServiceBinding;

  constructor(binding: ServiceBinding) {
    this.#binding = binding;
  }

  async #get<T>(path: string, parse: (value: unknown) => T | null) {
    try {
      const response = await this.#binding.fetch(`${SERVICE_ORIGIN}${path}`, {
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        console.info(
          JSON.stringify({
            event: "hn.service_miss",
            path,
            status: response.status,
          }),
        );
        return null;
      }

      return parse(await response.json());
    } catch (error) {
      console.warn(
        JSON.stringify({
          event: "hn.service_fallback",
          message: error instanceof Error ? error.message : String(error),
          path,
        }),
      );
      return null;
    }
  }

  getBestStoryIds() {
    return this.#get("/best", parseNumberArray);
  }

  getPost(postId: number): Promise<Post | null> {
    return this.#get(`/post/${postId}`, parseAggregatedPost);
  }

  getResolution(itemId: number) {
    return this.#get(`/resolve/${itemId}`, parseResolution);
  }

  getTopics(topic: string, page: number): Promise<TopicItem[] | null> {
    const query = new URLSearchParams({ page: String(page) });
    return this.#get(
      `/feed/${encodeURIComponent(topic)}?${query.toString()}`,
      parseAggregatedTopics,
    );
  }

  getUser(userName: string): Promise<User | null> {
    return this.#get(
      `/user/${encodeURIComponent(userName)}`,
      parseAggregatedUser,
    );
  }
}
